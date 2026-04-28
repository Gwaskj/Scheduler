import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";
import "./SchedulerPage.css";
import Header from "./Header";
import AdBanner from "./AdBanner";
import { supabase } from "./supabaseClient";
import { getRoute } from "./services/routeCache";
import { getMatrix } from "./ors-client";

// ---------- Time helpers ----------

function normaliseTime(input) {
  if (!input) return "";

  let t = input.toString().trim();
  t = t.replace(/[-.]/g, ":");

  if (/^\d{1,2}$/.test(t)) {
    return t.padStart(2, "0") + ":00";
  }

  if (/^\d{3,4}$/.test(t)) {
    const h = t.slice(0, t.length - 2).padStart(2, "0");
    const m = t.slice(-2);
    return `${h}:${m}`;
  }

  if (/^\d{1,2}:\d{1,2}$/.test(t)) {
    const [h, m] = t.split(":");
    return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
  }

  return t;
}

function toMinutes(hhmm) {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function fromMinutes(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  const pad = (n) => (n < 10 ? "0" + n : "" + n);
  return `${pad(h)}:${pad(m)}`;
}

// ---------- Postcode helpers ----------

function normalisePostcode(raw) {
  if (!raw) return null;
  let pc = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (pc.length < 5 || pc.length > 8) return null;
  const prefix = pc.slice(0, -3);
  const suffix = pc.slice(-3);
  return `${prefix} ${suffix}`;
}

async function lookupPostcodeCoords(rawPostcode) {
  const normalised = normalisePostcode(rawPostcode);
  if (!normalised) return { ok: false, error: "Invalid postcode format" };

  const url = `https://api.postcodes.io/postcodes/${encodeURIComponent(
    normalised
  )}`;

  const res = await fetch(url);
  if (!res.ok) return { ok: false, error: "Postcode lookup failed" };

  const data = await res.json();
  if (data.status !== 200 || !data.result)
    return { ok: false, error: "Postcode not found" };

  const { latitude, longitude, postcode } = data.result;
  return { ok: true, lat: latitude, lon: longitude, postcode };
}

// ---------- Route colours & offset ----------

const ROUTE_COLORS = [
  "blue",
  "yellow",
  "red",
  "green",
  "purple",
  "orange",
  "cyan",
  "magenta",
];

function offsetPolyline(latlngs, offsetMeters) {
  if (!offsetMeters) return latlngs;

  const offsetLatLngs = [];

  for (let i = 0; i < latlngs.length; i++) {
    const p = latlngs[i];

    const latOffset = offsetMeters / 111320;
    const lonOffset =
      offsetMeters /
      (40075000 * Math.cos((p.lat * Math.PI) / 180) / 360 || 1);

    const direction = i % 2 === 0 ? 1 : -1;

    offsetLatLngs.push({
      lat: p.lat + direction * latOffset,
      lon: p.lon + direction * lonOffset,
    });
  }

  return offsetLatLngs;
}

// ---------- Gap between windows ----------

const MIN_GAP_BETWEEN_TYPES = 15;

// ---------- Component ----------

function SchedulerPage() {
  const [user, setUser] = useState(null);
  const [userLoaded, setUserLoaded] = useState(false);

  const [staff, setStaff] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(false);

  const [selectedStaff, setSelectedStaff] = useState("ALL");
  const mapRef = useRef(null);

  // Drag state for manual reordering (still used in setup view if needed)
  const [dragState, setDragState] = useState({
    staffName: null,
    fromIndex: null,
  });

  // Window templates (locked) + draft + lock state
  const [windowTemplates, setWindowTemplates] = useState([
    { id: "breakfast", name: "Breakfast", start: "08:00", end: "10:00", duration: 30 },
    { id: "lunch", name: "Lunch", start: "12:00", end: "14:00", duration: 30 },
    { id: "tea", name: "Tea", start: "15:00", end: "17:00", duration: 30 },
    { id: "evening", name: "Evening", start: "17:00", end: "19:00", duration: 30 },
  ]);

  const [windowTemplatesDraft, setWindowTemplatesDraft] = useState([
    { id: "breakfast", name: "Breakfast", start: "08:00", end: "10:00", duration: 30 },
    { id: "lunch", name: "Lunch", start: "12:00", end: "14:00", duration: 30 },
    { id: "tea", name: "Tea", start: "15:00", end: "17:00", duration: 30 },
    { id: "evening", name: "Evening", start: "17:00", end: "19:00", duration: 30 },
  ]);

  const [windowsLocked, setWindowsLocked] = useState(true);

  // Base / office postcode (optional alternative)
  const [basePostcode, setBasePostcode] = useState("");
  const [baseCoords, setBaseCoords] = useState(null);
  const [basePostcodeError, setBasePostcodeError] = useState(false);

  // Start / end of day modes
  // startLocationMode: "HOME" | "BASE" | "ARRIVE_DIRECT"
  const [startLocationMode, setStartLocationMode] = useState("HOME");
  // endLocationMode: "FINISH_AT_LAST" | "RETURN_HOME" | "RETURN_BASE"
  const [endLocationMode, setEndLocationMode] = useState("FINISH_AT_LAST");

  // Staff form
  const [staffName, setStaffName] = useState("");
  const [staffPostcode, setStaffPostcode] = useState("");
  const [staffStart, setStaffStart] = useState("08:00");
  const [staffEnd, setStaffEnd] = useState("17:00");
  const [staffPostcodeError, setStaffPostcodeError] = useState(false);

  // Appointment form
  const [apptName, setApptName] = useState("");
  const [apptPostcode, setApptPostcode] = useState("");
  const [apptHouseNumber, setApptHouseNumber] = useState("");
  const [apptStreetName, setApptStreetName] = useState("");
  const [apptRequiredStaff, setApptRequiredStaff] = useState(1);
  const [apptStrictStart, setApptStrictStart] = useState(false);
  const [apptStrictTime, setApptStrictTime] = useState("");
  const [apptPostcodeError, setApptPostcodeError] = useState(false);

  // Selected windows for appointment
  const [apptSelectedWindows, setApptSelectedWindows] = useState([]);

  // Results view
  const [showResults, setShowResults] = useState(false);
  const [selectedResultsStaff, setSelectedResultsStaff] = useState(null);

  const isPaidUser = !!user;
{/* -----------------------------  
    CUSTOM TIME WINDOWS (SECTION 2)
------------------------------ */}

<section>
  <h2>Custom Time Windows</h2>

  {windowsLocked ? (
    <>
      {/* Locked view (read‑only) */}
      {windowTemplates.map((w) => (
        <div key={w.id} className="flex-row window-row">
          <span className="window-name">{w.name}</span>
          <span className="window-time">
            {w.start}–{w.end} ({w.duration} min)
          </span>
        </div>
      ))}

      <button
        style={{ marginTop: "10px" }}
        onClick={() => {
          // Load locked templates into draft mode
          setWindowTemplatesDraft(windowTemplates);
          setWindowsLocked(false);
        }}
      >
        Edit Windows
      </button>
    </>
  ) : (
    <>
      {/* Editable draft view */}
      {windowTemplatesDraft.map((w) => (
        <div key={w.id} className="flex-row window-edit-row">
          {/* Window name */}
          <input
            type="text"
            value={w.name}
            onChange={(e) => {
              const name = e.target.value;
              setWindowTemplatesDraft((prev) =>
                prev.map((x) => (x.id === w.id ? { ...x, name } : x))
              );
            }}
            placeholder="Window name"
            className="window-input"
          />

          {/* Start time */}
          <input
            type="text"
            value={w.start}
            onChange={(e) => {
              const start = e.target.value;
              setWindowTemplatesDraft((prev) =>
                prev.map((x) => (x.id === w.id ? { ...x, start } : x))
              );
            }}
            onBlur={() => {
              setWindowTemplatesDraft((prev) =>
                prev.map((x) =>
                  x.id === w.id ? { ...x, start: normaliseTime(x.start) } : x
                )
              );
            }}
            placeholder="HH:MM"
            className="window-input"
          />

          {/* End time */}
          <input
            type="text"
            value={w.end}
            onChange={(e) => {
              const end = e.target.value;
              setWindowTemplatesDraft((prev) =>
                prev.map((x) => (x.id === w.id ? { ...x, end } : x))
              );
            }}
            onBlur={() => {
              setWindowTemplatesDraft((prev) =>
                prev.map((x) =>
                  x.id === w.id ? { ...x, end: normaliseTime(x.end) } : x
                )
              );
            }}
            placeholder="HH:MM"
            className="window-input"
          />

          {/* Duration */}
          <select
            value={w.duration}
            onChange={(e) => {
              const duration = Number(e.target.value);
              setWindowTemplatesDraft((prev) =>
                prev.map((x) => (x.id === w.id ? { ...x, duration } : x))
              );
            }}
            className="window-select"
          >
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={45}>45 min</option>
            <option value={60}>60 min</option>
          </select>

          {/* Remove window */}
          <button
            onClick={() =>
              setWindowTemplatesDraft((prev) =>
                prev.filter((x) => x.id !== w.id)
              )
            }
            disabled={windowTemplatesDraft.length === 1}
            className="window-remove-btn"
          >
            Remove
          </button>
        </div>
      ))}

      {/* Add new window */}
      <button
        onClick={() =>
          setWindowTemplatesDraft((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              name: "New Window",
              start: "09:00",
              end: "10:00",
              duration: 30,
            },
          ])
        }
        className="window-add-btn"
      >
        Add Window
      </button>

      {/* Confirm / Cancel */}
      <div style={{ marginTop: "10px" }}>
        <button
          onClick={() => {
            setWindowTemplates(windowTemplatesDraft);
            setWindowsLocked(true);
          }}
          className="window-confirm-btn"
        >
          Confirm Windows
        </button>

        <button
          style={{ marginLeft: "10px" }}
          onClick={() => {
            setWindowTemplatesDraft(windowTemplates);
            setWindowsLocked(true);
          }}
          className="window-cancel-btn"
        >
          Cancel
        </button>
      </div>
    </>
  )}
</section>
{/* -----------------------------  
    STAFF FORM (SECTION 3)
------------------------------ */}

<section>
  <h2>Add Staff</h2>

  <div className="flex-row">
    {/* Staff name */}
    <input
      type="text"
      placeholder="Name"
      value={staffName}
      onChange={(e) => setStaffName(e.target.value)}
      className="staff-input"
    />

    {/* Staff postcode */}
    <input
      type="text"
      placeholder="Postcode"
      value={staffPostcode}
      onChange={(e) => {
        setStaffPostcode(e.target.value);
        setStaffPostcodeError(false);
      }}
      className={staffPostcodeError ? "input-error" : "staff-input"}
    />

    {/* Staff availability start */}
    <input
      type="text"
      value={staffStart}
      onChange={(e) => setStaffStart(e.target.value)}
      onBlur={() => setStaffStart(normaliseTime(staffStart))}
      placeholder="Start HH:MM"
      className="staff-input"
    />

    {/* Staff availability end */}
    <input
      type="text"
      value={staffEnd}
      onChange={(e) => setStaffEnd(e.target.value)}
      onBlur={() => setStaffEnd(normaliseTime(staffEnd))}
      placeholder="End HH:MM"
      className="staff-input"
    />
  </div>

  <button onClick={handleAddStaff} className="staff-add-btn">
    Add Staff
  </button>

  {/* Staff list */}
  <ul className="staff-list">
    {staff.map((s) => (
      <li key={s.id} className="staff-list-item">
        {/* Editable name for paid users */}
        {isPaidUser ? (
          <input
            type="text"
            value={s.name}
            onChange={(e) => handleUpdateStaffName(s.id, e.target.value)}
            className="staff-edit-name"
          />
        ) : (
          <strong>{s.name}</strong>
        )}

        <span className="staff-details">
          {" "}
          — {s.postcode} — {s.availableStart}–{s.availableEnd}
        </span>

        <button
          onClick={() => handleDeleteStaff(s.id)}
          className="staff-remove-btn"
        >
          Remove Staff
        </button>
      </li>
    ))}
  </ul>
</section>
{/* -----------------------------  
    APPOINTMENT FORM (SECTION 4)
------------------------------ */}

<section>
  <h2>Add Appointment</h2>

  <div className="flex-column">

    {/* Client name */}
    <input
      type="text"
      placeholder="Client Name (optional)"
      value={apptName}
      onChange={(e) => setApptName(e.target.value)}
      className="appt-input"
    />

    {/* House number */}
    <input
      type="text"
      placeholder="House number (e.g. 4)"
      value={apptHouseNumber}
      onChange={(e) => setApptHouseNumber(e.target.value)}
      className="appt-input"
      style={{ marginTop: "8px" }}
    />

    {/* Street name */}
    <input
      type="text"
      placeholder="Street name (e.g. Block Road)"
      value={apptStreetName}
      onChange={(e) => setApptStreetName(e.target.value)}
      className="appt-input"
      style={{ marginTop: "8px" }}
    />

    {/* Postcode */}
    <input
      type="text"
      placeholder="Postcode"
      value={apptPostcode}
      onChange={(e) => {
        setApptPostcode(e.target.value);
        setApptPostcodeError(false);
      }}
      className={apptPostcodeError ? "input-error" : "appt-input"}
      style={{ marginTop: "8px" }}
    />
  </div>

  {/* Window selection */}
  <div className="flex-column" style={{ marginTop: "10px" }}>
    <label>
      <strong>Required Windows:</strong>
    </label>

    {windowTemplates.map((w) => (
      <label key={w.id} className="checkbox-row">
        <input
          type="checkbox"
          checked={apptSelectedWindows.includes(w.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setApptSelectedWindows((prev) => [...prev, w.id]);
            } else {
              setApptSelectedWindows((prev) =>
                prev.filter((x) => x !== w.id)
              );
            }
          }}
        />
        {w.name} ({w.start}–{w.end}, {w.duration} min)
      </label>
    ))}
  </div>

  {/* Required staff + strict time */}
  <div className="flex-row" style={{ marginTop: "10px" }}>
    <select
      value={apptRequiredStaff}
      onChange={(e) => setApptRequiredStaff(Number(e.target.value))}
      className="appt-select"
    >
      <option value={1}>1 staff</option>
      <option value={2}>2 staff</option>
      <option value={3}>3 staff</option>
    </select>

    <label style={{ marginLeft: "10px" }}>
      <input
        type="checkbox"
        checked={apptStrictStart}
        onChange={(e) => setApptStrictStart(e.target.checked)}
      />
      Strict must‑start time
    </label>

    {apptStrictStart && (
      <input
        type="text"
        placeholder="Strict time (e.g. 9, 900, 9.00, 9:00)"
        value={apptStrictTime}
        onChange={(e) => setApptStrictTime(e.target.value)}
        onBlur={() =>
          setApptStrictTime(normaliseTime(apptStrictTime || ""))
        }
        className="appt-input"
        style={{ marginLeft: "10px" }}
      />
    )}
  </div>

  {/* Add appointment button */}
  <button
    style={{ marginTop: "10px" }}
    onClick={handleAddAppointment}
    className="appt-add-btn"
  >
    Add Appointment
  </button>

  {/* Appointment list */}
  <ul style={{ marginTop: "10px" }} className="appt-list">
    {appointments.map((a) => (
      <li key={a.id} className="appt-list-item">

        {/* Editable name for paid users */}
        {isPaidUser ? (
          <input
            type="text"
            value={a.name}
            onChange={(e) =>
              handleUpdateAppointmentName(a.id, e.target.value)
            }
            className="appt-edit-name"
          />
        ) : (
          <strong>{a.name}</strong>
        )}

        {/* Address */}
        <span className="appt-details">
          {" "}
          — {a.houseNumber ? `${a.houseNumber} ` : ""}
          {a.streetName ? `${a.streetName}, ` : ""}
          {a.postcode}
        </span>

        {/* Windows */}
        <span className="appt-details">
          {" "}
          — {a.selectedWindows.length} visit
          {a.selectedWindows.length > 1 ? "s" : ""} —{" "}
          {a.selectedWindows
            .map((id) => {
              const w = windowTemplates.find((w) => w.id === id);
              if (!w) return null;
              return `${w.name} (${w.duration} min)`;
            })
            .filter(Boolean)
            .join(", ")}
        </span>

        {/* Required staff */}
        <span className="appt-details">
          {" "}
          — needs {a.requiredStaff} staff
        </span>

        {/* Strict time */}
        <span className="appt-details">
          {" "}
          —{" "}
          {a.strictStart
            ? a.strictTime
              ? `Strict start at ${a.strictTime}`
              : "Strict start"
            : "Flexible"}
        </span>

        {/* Delete */}
        <button
          onClick={() => handleDeleteAppointment(a.id)}
          className="appt-remove-btn"
        >
          Delete
        </button>
      </li>
    ))}
  </ul>
</section>
// -----------------------------
// SECTION 5 — CORE HANDLERS + OPTIMISED SCHEDULER
// -----------------------------

// ---------- STAFF HANDLERS ----------

async function handleAddStaff() {
  const pc = normalisePostcode(staffPostcode);
  if (!pc) {
    setStaffPostcodeError(true);
    return;
  }

  const lookup = await lookupPostcodeCoords(pc);
  if (!lookup.ok) {
    setStaffPostcodeError(true);
    return;
  }

  const { lat, lon, postcode } = lookup;

  const newStaff = {
    id: crypto.randomUUID(),
    name: staffName || "Unnamed",
    postcode,
    lat,
    lon,
    availableStart: normaliseTime(staffStart),
    availableEnd: normaliseTime(staffEnd),
  };

  setStaff((prev) => [...prev, newStaff]);

  // Reset form
  setStaffName("");
  setStaffPostcode("");
  setStaffStart("08:00");
  setStaffEnd("17:00");
}

function handleDeleteStaff(id) {
  setStaff((prev) => prev.filter((s) => s.id !== id));
}

function handleUpdateStaffName(id, newName) {
  setStaff((prev) =>
    prev.map((s) => (s.id === id ? { ...s, name: newName } : s))
  );
}

// ---------- APPOINTMENT HANDLERS ----------

async function handleAddAppointment() {
  const pc = normalisePostcode(apptPostcode);
  if (!pc) {
    setApptPostcodeError(true);
    return;
  }

  const lookup = await lookupPostcodeCoords(pc);
  if (!lookup.ok) {
    setApptPostcodeError(true);
    return;
  }

  const { lat, lon, postcode } = lookup;

  const newAppt = {
    id: crypto.randomUUID(),
    name: apptName || "Appointment",
    houseNumber: apptHouseNumber,
    streetName: apptStreetName,
    postcode,
    lat,
    lon,
    requiredStaff: apptRequiredStaff,
    strictStart: apptStrictStart,
    strictTime: apptStrictStart ? normaliseTime(apptStrictTime) : null,
    selectedWindows: [...apptSelectedWindows],
  };

  setAppointments((prev) => [...prev, newAppt]);

  // Reset form
  setApptName("");
  setApptHouseNumber("");
  setApptStreetName("");
  setApptPostcode("");
  setApptSelectedWindows([]);
  setApptRequiredStaff(1);
  setApptStrictStart(false);
  setApptStrictTime("");
}

function handleDeleteAppointment(id) {
  setAppointments((prev) => prev.filter((a) => a.id !== id));
}

function handleUpdateAppointmentName(id, newName) {
  setAppointments((prev) =>
    prev.map((a) => (a.id === id ? { ...a, name: newName } : a))
  );
}

// ---------- GENERATE SCHEDULE ----------

async function handleGenerateSchedule() {
  if (staff.length === 0 || appointments.length === 0) return;

  setLoading(true);

  try {
    const result = await buildOptimisedSchedule();
    setSchedule(result);
    setShowResults(true);
  } catch (err) {
    console.error("Schedule error:", err);
  }

  setLoading(false);
}

// ---------- CORE OPTIMISED SCHEDULER ----------

async function buildOptimisedSchedule() {
  // 1. Build list of all points (staff + appointments)
  const points = [];

  staff.forEach((s) =>
    points.push({ id: s.id, lat: s.lat, lon: s.lon, type: "staff" })
  );

  appointments.forEach((a) =>
    points.push({ id: a.id, lat: a.lat, lon: a.lon, type: "appt" })
  );

  // 2. Build travel matrix
  const coords = points.map((p) => [p.lon, p.lat]);
  const matrix = await getMatrix(coords);

  // 3. Prepare staff schedules
  const staffSchedules = {};
  staff.forEach((s) => {
    staffSchedules[s.id] = {
      staff: s,
      jobs: [],
      currentTime: toMinutes(s.availableStart),
      currentLocation: { lat: s.lat, lon: s.lon },
    };
  });

  // 4. Sort appointments by earliest window start
  const sortedAppts = [...appointments].sort((a, b) => {
    const aWin = a.selectedWindows
      .map((id) => windowTemplates.find((w) => w.id === id))
      .filter(Boolean)
      .map((w) => toMinutes(w.start));
    const bWin = b.selectedWindows
      .map((id) => windowTemplates.find((w) => w.id === id))
      .filter(Boolean)
      .map((w) => toMinutes(w.start));
    return Math.min(...aWin) - Math.min(...bWin);
  });

  // 5. Assign each appointment
  for (const appt of sortedAppts) {
    const best = findBestStaffSlot(appt, staffSchedules, matrix, points);
    if (!best) continue;

    const { staffId, startTime, travelTime } = best;

    const s = staffSchedules[staffId];

    // Insert job
    s.jobs.push({
      ...appt,
      startTime,
      endTime: startTime + getDurationForAppt(appt),
      travelBefore: travelTime,
    });

    // Update staff state
    s.currentTime = startTime + getDurationForAppt(appt);
    s.currentLocation = { lat: appt.lat, lon: appt.lon };
  }

  // 6. Build final schedule object
  const result = {};
  Object.values(staffSchedules).forEach((s) => {
    result[s.staff.id] = {
      staff: s.staff,
      jobs: s.jobs.sort((a, b) => a.startTime - b.startTime),
    };
  });

  return result;
}

// ---------- HELPER: Find best staff slot ----------

function findBestStaffSlot(appt, staffSchedules, matrix, points) {
  const duration = getDurationForAppt(appt);

  const windows = appt.selectedWindows
    .map((id) => windowTemplates.find((w) => w.id === id))
    .filter(Boolean);

  let best = null;

  for (const s of Object.values(staffSchedules)) {
    const staffPointIndex = points.findIndex((p) => p.id === s.staff.id);
    const apptPointIndex = points.findIndex((p) => p.id === appt.id);

    const travelTime = matrix.durations[staffPointIndex][apptPointIndex];

    const earliestArrival = s.currentTime + travelTime;

    for (const w of windows) {
      const wStart = toMinutes(w.start);
      const wEnd = toMinutes(w.end);

      // Strict time override
      if (appt.strictStart) {
        const strict = toMinutes(appt.strictTime);
        if (earliestArrival <= strict && strict + duration <= wEnd) {
          const score = strict;
          if (!best || score < best.score) {
            best = {
              staffId: s.staff.id,
              startTime: strict,
              travelTime,
              score,
            };
          }
        }
        continue;
      }

      // Flexible window
      const start = Math.max(earliestArrival, wStart);
      if (start + duration <= wEnd) {
        const score = start;
        if (!best || score < best.score) {
          best = {
            staffId: s.staff.id,
            startTime: start,
            travelTime,
            score,
          };
        }
      }
    }
  }

  return best;
}

// ---------- HELPER: Duration ----------

function getDurationForAppt(appt) {
  const windows = appt.selectedWindows
    .map((id) => windowTemplates.find((w) => w.id === id))
    .filter(Boolean);

  if (windows.length === 0) return 30;
  return windows[0].duration;
}
{/* -----------------------------  
    RESULTS PAGE (SECTION 6)
------------------------------ */}

{showResults && (
  <section className="results-section">

    <h2>Schedule Results</h2>

    {/* Staff selector */}
    <div className="results-staff-selector">
      <label><strong>View staff:</strong></label>
      <select
        value={selectedResultsStaff || ""}
        onChange={(e) => setSelectedResultsStaff(e.target.value)}
        className="results-select"
      >
        <option value="">All Staff</option>
        {Object.values(schedule).map((s) => (
          <option key={s.staff.id} value={s.staff.id}>
            {s.staff.name}
          </option>
        ))}
      </select>
    </div>

    {/* Utilisation bars */}
    <div className="utilisation-container">
      {Object.values(schedule).map((s) => {
        if (selectedResultsStaff && selectedResultsStaff !== s.staff.id)
          return null;

        const start = toMinutes(s.staff.availableStart);
        const end = toMinutes(s.staff.availableEnd);
        const total = end - start;

        const used = s.jobs.reduce(
          (acc, j) => acc + (j.endTime - j.startTime),
          0
        );

        const pct = Math.round((used / total) * 100);

        return (
          <div key={s.staff.id} className="utilisation-row">
            <strong>{s.staff.name}</strong>
            <div className="utilisation-bar">
              <div
                className="utilisation-fill"
                style={{ width: `${pct}%` }}
              ></div>
            </div>
            <span className="utilisation-label">{pct}% utilised</span>
          </div>
        );
      })}
    </div>

    {/* Appointment cards */}
    <div className="results-cards">
      {Object.values(schedule).map((s) => {
        if (selectedResultsStaff && selectedResultsStaff !== s.staff.id)
          return null;

        return (
          <div key={s.staff.id} className="results-staff-block">
            <h3>{s.staff.name}</h3>

            {s.jobs.length === 0 && (
              <p>No appointments assigned.</p>
            )}

            {s.jobs.map((j, idx) => (
              <div key={j.id} className="result-card">
                <div className="result-card-header">
                  <strong>{j.name}</strong>
                </div>

                <div className="result-card-body">
                  <div>
                    <strong>Time:</strong>{" "}
                    {fromMinutes(j.startTime)}–{fromMinutes(j.endTime)}
                  </div>

                  <div>
                    <strong>Address:</strong>{" "}
                    {j.houseNumber ? `${j.houseNumber} ` : ""}
                    {j.streetName ? `${j.streetName}, ` : ""}
                    {j.postcode}
                  </div>

                  <div>
                    <strong>Window:</strong>{" "}
                    {j.selectedWindows
                      .map((id) => {
                        const w = windowTemplates.find((w) => w.id === id);
                        return w ? w.name : null;
                      })
                      .filter(Boolean)
                      .join(", ")}
                  </div>

                  <div>
                    <strong>Duration:</strong>{" "}
                    {getDurationForAppt(j)} min
                  </div>

                  <div>
                    <strong>Travel before:</strong>{" "}
                    {Math.round(j.travelBefore)} min
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>

    {/* Map */}
    <div className="results-map-container">
      <MapContainer
        center={[52.9, -2.2]}
        zoom={11}
        scrollWheelZoom={true}
        style={{ height: "500px", width: "100%" }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Staff markers */}
        {Object.values(schedule).map((s) => {
          if (selectedResultsStaff && selectedResultsStaff !== s.staff.id)
            return null;

          return (
            <Marker
              key={s.staff.id}
              position={[s.staff.lat, s.staff.lon]}
            >
              <Popup>
                <strong>{s.staff.name}</strong>
                <br />
                Start: {s.staff.availableStart}
              </Popup>
            </Marker>
          );
        })}

        {/* Appointment markers */}
        {Object.values(schedule).map((s) => {
          if (selectedResultsStaff && selectedResultsStaff !== s.staff.id)
            return null;

          return s.jobs.map((j) => (
            <Marker key={j.id} position={[j.lat, j.lon]}>
              <Popup>
                <strong>{j.name}</strong>
                <br />
                {j.houseNumber ? `${j.houseNumber} ` : ""}
                {j.streetName ? `${j.streetName}, ` : ""}
                {j.postcode}
                <br />
                {fromMinutes(j.startTime)}–{fromMinutes(j.endTime)}
              </Popup>
            </Marker>
          ));
        })}

        {/* Routes */}
        {Object.values(schedule).map((s, idx) => {
          if (selectedResultsStaff && selectedResultsStaff !== s.staff.id)
            return null;

          const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];

          const coords = s.jobs.map((j) => ({
            lat: j.lat,
            lon: j.lon,
          }));

          if (coords.length < 2) return null;

          const offset = offsetPolyline(coords, idx * 8);

          return (
            <Polyline
              key={s.staff.id}
              positions={offset.map((p) => [p.lat, p.lon])}
              color={color}
              weight={4}
            />
          );
        })}
      </MapContainer>
    </div>

    {/* Back button */}
    <button
      style={{ marginTop: "20px" }}
      onClick={() => setShowResults(false)}
    >
      Back to Setup
    </button>
  </section>
)}
}
