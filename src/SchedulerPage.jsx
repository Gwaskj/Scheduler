import AdBanner from "./AdBanner";
import "leaflet/dist/leaflet.css";
import "./App.css";
import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "./SchedulerPage.css";
import Header from "./Header";

const ORS_API_KEY = import.meta.env.VITE_ORS_API_KEY;

// ---------- Time helpers ----------

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

// ---------- ORS Matrix ----------

async function getMatrix(from, tos) {
  const url = "https://api.openrouteservice.org/v2/matrix/driving-car";

  const locations = [
    [from.lon, from.lat],
    ...tos.map((t) => [t.lon, t.lat]),
  ];

  const body = {
    locations,
    metrics: ["duration", "distance"],
    units: "m",
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: ORS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error("Matrix API error");

  const data = await res.json();
  if (!data.durations || !data.distances)
    throw new Error("Matrix returned incomplete data");

  return data;
}

// ---------- ORS Directions ----------

async function getRouteGeometry(from, to) {
  const url =
    "https://api.openrouteservice.org/v2/directions/driving-car/geojson";

  const body = {
    coordinates: [
      [from.lon, from.lat],
      [to.lon, to.lat],
    ],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: ORS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error("Directions API error");

  const data = await res.json();
  if (!data.features || !data.features[0]) {
    throw new Error("Directions returned no features");
  }

  return data.features[0].geometry.coordinates;
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
  const [staff, setStaff] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState("ALL");
  const mapRef = useRef(null);

  // Drag state
  const [dragState, setDragState] = useState({
    staffName: null,
    fromIndex: null,
  });

  // Global window templates
  const [windowTemplates, setWindowTemplates] = useState([
    { id: "breakfast", name: "Breakfast", start: "08:00", end: "10:00" },
    { id: "lunch", name: "Lunch", start: "12:00", end: "14:00" },
    { id: "tea", name: "Tea", start: "15:00", end: "17:00" },
    { id: "evening", name: "Evening", start: "17:00", end: "19:00" },
  ]);

  // Staff form
  const [staffName, setStaffName] = useState("");
  const [staffPostcode, setStaffPostcode] = useState("");
  const [staffStart, setStaffStart] = useState("08:00");
  const [staffEnd, setStaffEnd] = useState("17:00");
  const [staffPostcodeError, setStaffPostcodeError] = useState(false);

  // Appointment form
  const [apptName, setApptName] = useState("");
  const [apptPostcode, setApptPostcode] = useState("");
  const [apptDuration, setApptDuration] = useState(30);
  const [apptRequiredStaff, setApptRequiredStaff] = useState(1);
  const [apptStrictStart, setApptStrictStart] = useState(false);
  const [apptPostcodeError, setApptPostcodeError] = useState(false);

  // Selected windows for appointment
  const [apptSelectedWindows, setApptSelectedWindows] = useState([]);

  // ---------- Local storage ----------

  useEffect(() => {
    try {
      const s = localStorage.getItem("staff");
      const a = localStorage.getItem("appointments");
      if (s) setStaff(JSON.parse(s));
      if (a) setAppointments(JSON.parse(a));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("staff", JSON.stringify(staff));
    } catch {}
  }, [staff]);

  useEffect(() => {
    try {
      localStorage.setItem("appointments", JSON.stringify(appointments));
    } catch {}
  }, [appointments]);

  // ---------- Map fit ----------

  const fitMapToStaff = (jobs) => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const coords = jobs.map((j) => j.coords).filter(Boolean);
    if (!coords.length) return;

    const bounds = coords.map((c) => [c.lat, c.lon]);
    map.fitBounds(bounds, { padding: [50, 50] });
  };

  // ---------- Reorder jobs ----------

  const reorderJobs = (staffName, fromIndex, toIndex) => {
    if (
      fromIndex === toIndex ||
      fromIndex == null ||
      toIndex == null ||
      toIndex < 0
    )
      return;

    setSchedule((prev) => {
      const staffJobs = prev[staffName] || [];
      if (fromIndex >= staffJobs.length || toIndex >= staffJobs.length) {
        return prev;
      }
      const newJobs = [...staffJobs];
      const [moved] = newJobs.splice(fromIndex, 1);
      newJobs.splice(toIndex, 0, moved);

      return {
        ...prev,
        [staffName]: newJobs,
      };
    });
  };

  // ---------- Add staff ----------

  const handleAddStaff = async () => {
    setStaffPostcodeError(false);

    if (!staffName || !staffPostcode) {
      alert("Please enter name and postcode.");
      return;
    }

    const lookup = await lookupPostcodeCoords(staffPostcode);
    if (!lookup.ok) {
      setStaffPostcodeError(true);
      alert(`Staff postcode error: ${lookup.error}`);
      return;
    }

    const customWindows = {};
    windowTemplates.forEach((w) => {
      customWindows[w.id] = {
        name: w.name,
        start: w.start,
        end: w.end,
      };
    });

    const newStaff = {
      id: crypto.randomUUID(),
      name: staffName,
      postcode: lookup.postcode,
      lat: lookup.lat,
      lon: lookup.lon,
      availableStart: staffStart,
      availableEnd: staffEnd,
      customWindows,
    };

    setStaff((prev) => [...prev, newStaff]);
    setStaffName("");
    setStaffPostcode("");
    setStaffStart("08:00");
    setStaffEnd("17:00");
  };

  const handleDeleteStaff = (id) => {
    setStaff((prev) => prev.filter((s) => s.id !== id));
    setSchedule((prev) => {
      const copy = { ...prev };
      const removed = staff.find((s) => s.id === id);
      if (removed) delete copy[removed.name];
      return copy;
    });
  };

  // ---------- Add appointment ----------

  const handleAddAppointment = async () => {
    setApptPostcodeError(false);

    if (!apptPostcode) {
      alert("Please enter a postcode.");
      return;
    }

    if (apptSelectedWindows.length === 0) {
      alert("Select at least one window.");
      return;
    }

    const lookup = await lookupPostcodeCoords(apptPostcode);
    if (!lookup.ok) {
      setApptPostcodeError(true);
      alert(`Appointment postcode error: ${lookup.error}`);
      return;
    }

    const newAppt = {
      id: crypto.randomUUID(),
      name: apptName || lookup.postcode,
      postcode: lookup.postcode,
      lat: lookup.lat,
      lon: lookup.lon,
      duration: Number(apptDuration),
      requiredStaff: Number(apptRequiredStaff),
      strictStart: apptStrictStart,
      selectedWindows: [...apptSelectedWindows],
    };

    setAppointments((prev) => [...prev, newAppt]);

    setApptName("");
    setApptPostcode("");
    setApptDuration(30);
    setApptRequiredStaff(1);
    setApptStrictStart(false);
    setApptSelectedWindows([]);
  };

  // ---------- Scheduler ----------

  const generateSchedule = async () => {
    if (!staff.length || !appointments.length) {
      alert("Add staff and appointments first.");
      return;
    }

    setLoading(true);

    try {
      // Expand each appointment into multiple window-specific jobs
      let expanded = [];
      for (const appt of appointments) {
        for (const winId of appt.selectedWindows) {
          const template = windowTemplates.find((w) => w.id === winId);
          if (!template) continue;

          expanded.push({
            ...appt,
            jobId: crypto.randomUUID(), // unique per window visit
            windowType: winId,
            earliestStart: template.start,
            latestEnd: template.end,
          });
        }
      }

      let remaining = [...expanded];
      const assignedCounts = {};
      const jobStartTimes = {};
      const result = {};

      // Priority = order in windowTemplates
      const priorityMap = {};
      windowTemplates.forEach((w, idx) => {
        priorityMap[w.id] = idx + 1;
      });

      for (const person of staff) {
        let currentTime = toMinutes(person.availableStart);
        const endOfDay = toMinutes(person.availableEnd);
        let currentCoords = { lat: person.lat, lon: person.lon };
        const scheduleList = [];

        while (true) {
          if (!remaining.length) break;

          const remainingPriorities = remaining.map(
            (j) => priorityMap[j.windowType] ?? 99
          );
          const minPriority = Math.min(...remainingPriorities);

          const lastJob = scheduleList[scheduleList.length - 1] || null;

          const candidates = remaining.filter((job) => {
            const jobPriority = priorityMap[job.windowType] ?? 99;
            if (jobPriority !== minPriority) return false;

            const override = person.customWindows?.[job.windowType];
            const jobStart = toMinutes(override?.start || job.earliestStart);
            const jobEnd = toMinutes(override?.end || job.latestEnd);

            if (jobEnd <= currentTime) return false;
            if (jobEnd > endOfDay) return false;

            const count = assignedCounts[job.jobId] || 0;
            if (count >= job.requiredStaff) return false;

            return true;
          });

          if (!candidates.length) break;

          const matrix = await getMatrix(
            currentCoords,
            candidates.map((j) => ({ lat: j.lat, lon: j.lon }))
          );

          const durationsRow = matrix.durations[0];
          const distancesRow = matrix.distances[0];

          let best = null;
          let bestScore = Infinity;

          candidates.forEach((job, idx) => {
            const travelSeconds = durationsRow[idx + 1];
            const distanceMeters = distancesRow[idx + 1];

            if (travelSeconds == null) return;

            const travel = Math.max(1, Math.ceil(travelSeconds / 60));
            const distanceKm = distanceMeters / 1000;

            const override = person.customWindows?.[job.windowType];
            const jobStart = toMinutes(override?.start || job.earliestStart);
            const jobEnd = toMinutes(override?.end || job.latestEnd);

            const earliestArrival = currentTime + travel;

            let actualStart;

            if (job.strictStart) {
              if (earliestArrival > jobStart) return;
              actualStart =
                jobStartTimes[job.jobId] !== undefined
                  ? jobStartTimes[job.jobId]
                  : jobStart;
            } else {
              actualStart =
                jobStartTimes[job.jobId] !== undefined
                  ? jobStartTimes[job.jobId]
                  : Math.max(jobStart, earliestArrival);
            }

            const actualEnd = actualStart + job.duration;

            if (actualEnd > jobEnd || actualEnd > endOfDay) return;

            if (
              lastJob &&
              lastJob.windowType !== job.windowType &&
              actualStart < lastJob.actualEnd + MIN_GAP_BETWEEN_TYPES
            ) {
              return;
            }

            const windowTightness = jobEnd - jobStart;
            const score = travel * 0.7 + windowTightness * 0.3;

            if (score < bestScore) {
              bestScore = score;
              best = {
                job,
                travel,
                distanceKm,
                actualStart,
                actualEnd,
                coords: { lat: job.lat, lon: job.lon },
              };
            }
          });

          if (!best) break;

          const routeGeometry = await getRouteGeometry(currentCoords, {
            lat: best.job.lat,
            lon: best.job.lon,
          });

          if (jobStartTimes[best.job.jobId] === undefined) {
            jobStartTimes[best.job.jobId] = best.actualStart;
          }

          currentTime = best.actualEnd;
          currentCoords = best.coords;

          scheduleList.push({
            id: best.job.jobId,
            name: best.job.name,
            postcode: best.job.postcode,
            earliestStart: best.job.earliestStart,
            latestEnd: best.job.latestEnd,
            actualStart: best.actualStart,
            actualEnd: best.actualEnd,
            travelMinutes: best.travel,
            distanceKm: best.distanceKm,
            coords: best.coords,
            routeGeometry,
            windowType: best.job.windowType,
            staffWindow: person.customWindows?.[best.job.windowType] || null,
            strictStart: best.job.strictStart,
          });

          assignedCounts[best.job.jobId] =
            (assignedCounts[best.job.jobId] || 0) + 1;

          if (assignedCounts[best.job.jobId] >= best.job.requiredStaff) {
            remaining = remaining.filter((j) => j.jobId !== best.job.jobId);
          }
        }

        scheduleList.sort((a, b) => a.actualStart - b.actualStart);
        result[person.name] = scheduleList;
      }

      setSchedule(result);
      setSelectedStaff("ALL");
    } catch (err) {
      console.error("Schedule generation error:", err);
      alert("Error generating schedule. Check console.");
    } finally {
      setLoading(false);
    }
  };

  // ---------- Render ----------

  return (
    <>
      <Header />
      <div className="app-container">

        {/* Custom Windows */}
        <section>
          <h2>Custom Time Windows</h2>

          {windowTemplates.map((w) => (
            <div key={w.id} className="flex-row">
              <input
                type="text"
                value={w.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setWindowTemplates((prev) =>
                    prev.map((x) => (x.id === w.id ? { ...x, name } : x))
                  );
                }}
                placeholder="Window name"
              />

              <input
                type="text"
                value={w.start}
                onChange={(e) => {
                  const start = e.target.value;
                  setWindowTemplates((prev) =>
                    prev.map((x) => (x.id === w.id ? { ...x, start } : x))
                  );
                }}
                placeholder="HH:MM"
              />

              <input
                type="text"
                value={w.end}
                onChange={(e) => {
                  const end = e.target.value;
                  setWindowTemplates((prev) =>
                    prev.map((x) => (x.id === w.id ? { ...x, end } : x))
                  );
                }}
                placeholder="HH:MM"
              />

              <button
                onClick={() =>
                  setWindowTemplates((prev) =>
                    prev.filter((x) => x.id !== w.id)
                  )
                }
                disabled={windowTemplates.length === 1}
              >
                Remove
              </button>
            </div>
          ))}

          <button
            onClick={() =>
              setWindowTemplates((prev) => [
                ...prev,
                {
                  id: crypto.randomUUID(),
                  name: "New Window",
                  start: "09:00",
                  end: "10:00",
                },
              ])
            }
          >
            Add Window
          </button>
        </section>

        {/* Add Staff */}
        <section>
          <h2>Add Staff</h2>

          <div className="flex-row">
            <input
              type="text"
              placeholder="Name"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
            />

            <input
              type="text"
              placeholder="Postcode"
              value={staffPostcode}
              onChange={(e) => {
                setStaffPostcode(e.target.value);
                setStaffPostcodeError(false);
              }}
              className={staffPostcodeError ? "input-error" : ""}
            />

            <input
              type="text"
              value={staffStart}
              onChange={(e) => setStaffStart(e.target.value)}
              placeholder="Start HH:MM"
            />

            <input
              type="text"
              value={staffEnd}
              onChange={(e) => setStaffEnd(e.target.value)}
              placeholder="End HH:MM"
            />
          </div>

          <button onClick={handleAddStaff}>Add Staff</button>

          <ul>
            {staff.map((s) => (
              <li key={s.id}>
                {s.name} — {s.postcode} — {s.availableStart}–{s.availableEnd}{" "}
                <button onClick={() => handleDeleteStaff(s.id)}>
                  Remove Staff
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Add Appointment */}
        <section>
  <h2>Add Appointment</h2>

  {/* Group 1 — Client + Postcode */}
  <div className="flex-column">
    <input
      type="text"
      placeholder="Client Name (optional)"
      value={apptName}
      onChange={(e) => setApptName(e.target.value)}
    />

    <input
      type="text"
      placeholder="Postcode"
      value={apptPostcode}
      onChange={(e) => {
        setApptPostcode(e.target.value);
        setApptPostcodeError(false);
      }}
      className={apptPostcodeError ? "input-error" : ""}
    />
  </div>

  {/* Group 2 — Required Windows */}
  <div className="flex-column" style={{ marginTop: "10px" }}>
    <label><strong>Required Windows:</strong></label>

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
        {w.name} ({w.start}–{w.end})
      </label>
    ))}
  </div>

  {/* Group 3 — Duration + Staff + Strict Start */}
  <div className="flex-row" style={{ marginTop: "10px" }}>
    <select
      value={apptDuration}
      onChange={(e) => setApptDuration(Number(e.target.value))}
    >
      <option value={15}>15 min</option>
      <option value={30}>30 min</option>
      <option value={45}>45 min</option>
      <option value={60}>60 min</option>
    </select>

    <select
      value={apptRequiredStaff}
      onChange={(e) => setApptRequiredStaff(Number(e.target.value))}
    >
      <option value={1}>1 staff</option>
      <option value={2}>2 staff</option>
      <option value={3}>3 staff</option>
    </select>

    <label>
      <input
        type="checkbox"
        checked={apptStrictStart}
        onChange={(e) => setApptStrictStart(e.target.checked)}
      />
      Strict must-start time
    </label>
  </div>

  <button style={{ marginTop: "10px" }} onClick={handleAddAppointment}>
    Add Appointment
  </button>

  {/* Appointment List */}
  <ul style={{ marginTop: "10px" }}>
    {appointments.map((a) => (
      <li key={a.id}>
        <strong>{a.name}</strong> — {a.postcode} —{" "}
        {a.selectedWindows.length} visit
        {a.selectedWindows.length > 1 ? "s" : ""} —{" "}
        {a.selectedWindows
          .map((id) => windowTemplates.find((w) => w.id === id)?.name)
          .join(", ")}{" "}
        — {a.duration}min — needs {a.requiredStaff} staff —{" "}
        {a.strictStart ? "Strict start" : "Flexible"}{" "}
        <button onClick={() => handleDeleteAppointment(a.id)}>
          Delete
        </button>
      </li>
    ))}
  </ul>
</section>

        {/* Generate Schedule */}
        <section>
          <h2>Generate Schedule</h2>
          <button onClick={generateSchedule} disabled={loading}>
            {loading ? "Generating..." : "Generate Schedule"}
          </button>
        </section>

        {/* Schedule Output */}
        <section>
          <h2>Schedule</h2>
          {Object.keys(schedule).length === 0 && <p>No schedule yet.</p>}

          {Object.entries(schedule).map(([name, jobs]) => {
            const totalTravel = jobs.reduce(
              (sum, j) => sum + (j.travelMinutes || 0),
              0
            );
            const totalDistanceMiles = jobs.reduce(
              (sum, j) => sum + (j.distanceKm || 0) * 0.621371,
              0
            );

            return (
              <div key={name}>
                <h3
                  className="clickable"
                  onClick={() => {
                    setSelectedStaff(name);
                    fitMapToStaff(jobs);
                  }}
                >
                  {name}
                </h3>

                <p>
                  <strong>Total travel:</strong> {totalTravel} min
                  <br />
                  <strong>Total distance:</strong>{" "}
                  {totalDistanceMiles.toFixed(1)} miles
                </p>

                {jobs.length === 0 && <p>No jobs assigned.</p>}

                {jobs.map((job, idx) => (
                  <div
                    key={job.id + "-" + idx}
                    draggable
                    onDragStart={() =>
                      setDragState({ staffName: name, fromIndex: idx })
                    }
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragState.staffName === name) {
                        reorderJobs(name, dragState.fromIndex, idx);
                      }
                      setDragState({ staffName: null, fromIndex: null });
                    }}
                    className="job-draggable"
                  >
                    <strong>
                      #{idx + 1} {job.name}
                    </strong>{" "}
                    — {job.postcode}
                    <br />
                    {fromMinutes(job.actualStart)}–
                    {fromMinutes(job.actualEnd)}
                    <br />
                    ({job.staffWindow?.name} window {job.staffWindow?.start}–
                    {job.staffWindow?.end}, travel {job.travelMinutes} min
                    {job.strictStart ? ", strict start" : ""})
                  </div>
                ))}
              </div>
            );
          })}
        </section>
<AdBanner />
        {/* Map Controls */}
        <section>
          <h2>Map</h2>
          <div>
            <label>
              <strong>Show route for:</strong>
            </label>{" "}
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
            >
              <option value="ALL">All Staff</option>
              {Object.keys(schedule).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Full-width Map */}
        <MapContainer
          center={[53.05, -2.2]}
          zoom={11}
          className="map-full"
          whenCreated={(map) => (mapRef.current = map)}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {Object.entries(schedule).map(([name, jobs]) => {
            if (selectedStaff !== "ALL" && selectedStaff !== name) return null;

            return jobs.map((job, idx) => {
              const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];

              const baseCoords = (job.routeGeometry || []).map(
                ([lon, lat]) => ({ lat, lon })
              );

              const offsetMeters = idx * 2;
              const shifted = offsetPolyline(baseCoords, offsetMeters);

              return (
                <React.Fragment key={name + "-" + idx}>
                  {job.coords && (
                    <Marker position={[job.coords.lat, job.coords.lon]}>
                      <Popup>
                        <strong>
                          #{idx + 1} {job.name}
                        </strong>
                        <br />
                        {job.postcode}
                        <br />
                        {fromMinutes(job.actualStart)}–
                        {fromMinutes(job.actualEnd)}
                      </Popup>
                    </Marker>
                  )}

                  {shifted.length > 1 && (
                    <Polyline
                      positions={shifted.map((p) => [p.lat, p.lon])}
                      pathOptions={{
                        color,
                        weight: 5,
                        opacity: 0.9,
                      }}
                    />
                  )}
                </React.Fragment>
              );
            });
          })}
        </MapContainer>
        <AdBanner />
      </div>
    </>
  );
}

export default SchedulerPage;
