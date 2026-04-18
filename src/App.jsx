import "leaflet/dist/leaflet.css";
import "./App.css";
import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";

const ORS_API_KEY =
  "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImVhOGI4NWVhNmE0NTQ1NjE5ZGE1YTdmYjk1NGExYjA3IiwiaCI6Im11cm11cjY0In0=";

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

// ---------- ORS Directions (for map polylines) ----------

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

  return data.features[0].geometry.coordinates; // [ [lon,lat], ... ]
}

// ---------- Route colours & offset helper ----------

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

// ---------- App ----------

function App() {
  const [staff, setStaff] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState("ALL");
  const mapRef = useRef(null);

  // Staff form
  const [staffName, setStaffName] = useState("");
  const [staffPostcode, setStaffPostcode] = useState("");
  const [staffStart, setStaffStart] = useState("08:00");
  const [staffEnd, setStaffEnd] = useState("17:00");
  const [staffPostcodeError, setStaffPostcodeError] = useState(false);

  // Staff custom windows
  const [staffBreakfastStart, setStaffBreakfastStart] = useState("08:00");
  const [staffBreakfastEnd, setStaffBreakfastEnd] = useState("10:00");
  const [staffLunchStart, setStaffLunchStart] = useState("12:00");
  const [staffLunchEnd, setStaffLunchEnd] = useState("14:00");
  const [staffTeaStart, setStaffTeaStart] = useState("15:00");
  const [staffTeaEnd, setStaffTeaEnd] = useState("17:00");
  const [staffEveningStart, setStaffEveningStart] = useState("17:00");
  const [staffEveningEnd, setStaffEveningEnd] = useState("19:00");

  // Appointment form
  const [apptName, setApptName] = useState("");
  const [apptPostcode, setApptPostcode] = useState("");
  const [apptEarliestStart, setApptEarliestStart] = useState("");
  const [apptLatestEnd, setApptLatestEnd] = useState("");
  const [apptDuration, setApptDuration] = useState(30);
  const [apptRequiredStaff, setApptRequiredStaff] = useState(1);
  const [apptWindowType, setApptWindowType] = useState("default");
  const [apptPostcodeError, setApptPostcodeError] = useState(false);

  // ---------- Local storage ----------

  useEffect(() => {
    try {
      const s = localStorage.getItem("staff");
      const a = localStorage.getItem("appointments");
      if (s) setStaff(JSON.parse(s));
      if (a) setAppointments(JSON.parse(a));
    } catch (e) {
      console.error("LocalStorage load error", e);
    }
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

    const newStaff = {
      id: crypto.randomUUID(),
      name: staffName,
      postcode: lookup.postcode,
      lat: lookup.lat,
      lon: lookup.lon,
      availableStart: staffStart,
      availableEnd: staffEnd,
      customWindows: {
        breakfast: {
          start: staffBreakfastStart,
          end: staffBreakfastEnd,
        },
        lunch: {
          start: staffLunchStart,
          end: staffLunchEnd,
        },
        tea: {
          start: staffTeaStart,
          end: staffTeaEnd,
        },
        evening: {
          start: staffEveningStart,
          end: staffEveningEnd,
        },
      },
    };

    setStaff((prev) => [...prev, newStaff]);
    setStaffName("");
    setStaffPostcode("");
    setStaffStart("08:00");
    setStaffEnd("17:00");
  };

  const handleDeleteStaff = (id) => {
    setStaff((prev) => prev.filter((s) => s.id !== id));
  };

  const handleDeleteAppointment = (id) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  };

  // ---------- Add appointment ----------

  const handleAddAppointment = async () => {
    setApptPostcodeError(false);

    if (!apptPostcode) {
      alert("Please enter a postcode.");
      return;
    }

    if (apptWindowType === "default") {
      if (!apptEarliestStart || !apptLatestEnd) {
        alert("Please enter earliest and latest times for a default window.");
        return;
      }
    }

    const lookup = await lookupPostcodeCoords(apptPostcode);
    if (!lookup.ok) {
      setApptPostcodeError(true);
      alert(`Appointment postcode error: ${lookup.error}`);
      return;
    }

    let earliest = apptEarliestStart;
    let latest = apptLatestEnd;

    if (apptWindowType !== "default") {
      if (apptWindowType === "breakfast") {
        earliest = "08:00";
        latest = "10:00";
      }
      if (apptWindowType === "lunch") {
        earliest = "12:00";
        latest = "14:00";
      }
      if (apptWindowType === "tea") {
        earliest = "15:00";
        latest = "17:00";
      }
      if (apptWindowType === "evening") {
        earliest = "17:00";
        latest = "19:00";
      }
    }

    const newAppt = {
      id: crypto.randomUUID(),
      name: apptName || lookup.postcode,
      postcode: lookup.postcode,
      lat: lookup.lat,
      lon: lookup.lon,
      earliestStart: earliest,
      latestEnd: latest,
      duration: Number(apptDuration),
      requiredStaff: Number(apptRequiredStaff),
      windowType: apptWindowType,
    };

    setAppointments((prev) => [...prev, newAppt]);

    setApptName("");
    setApptPostcode("");
    setApptEarliestStart("");
    setApptLatestEnd("");
    setApptDuration(30);
    setApptRequiredStaff(1);
    setApptWindowType("default");
  };

  // ---------- Scheduler ----------

  const generateSchedule = async () => {
    if (!staff.length || !appointments.length) {
      alert("Add staff and appointments first.");
      return;
    }

    setLoading(true);

    try {
      let remaining = [...appointments];
      const assignedCounts = {};
      const jobStartTimes = {};
      const result = {};

      for (const person of staff) {
        let currentTime = toMinutes(person.availableStart);
        const endOfDay = toMinutes(person.availableEnd);
        let currentCoords = { lat: person.lat, lon: person.lon };
        const scheduleList = [];

        while (true) {
          const candidates = remaining.filter((job) => {
            const override = person.customWindows?.[job.windowType];
            const jobStart = toMinutes(override?.start || job.earliestStart);
            const jobEnd = toMinutes(override?.end || job.latestEnd);

            if (jobEnd <= currentTime) return false;
            if (jobEnd > endOfDay) return false;

            const count = assignedCounts[job.id] || 0;
            if (count >= job.requiredStaff) return false;

            if (scheduleList.some((x) => x.id === job.id)) return false;

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

            let actualStart =
              jobStartTimes[job.id] !== undefined
                ? jobStartTimes[job.id]
                : Math.max(jobStart, earliestArrival);

            const actualEnd = actualStart + job.duration;

            if (actualEnd > jobEnd || actualEnd > endOfDay) return;

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

          if (jobStartTimes[best.job.id] === undefined) {
            jobStartTimes[best.job.id] = best.actualStart;
          }

          currentTime = best.actualEnd;
          currentCoords = best.coords;

          scheduleList.push({
            id: best.job.id,
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
          });

          assignedCounts[best.job.id] =
            (assignedCounts[best.job.id] || 0) + 1;

          if (assignedCounts[best.job.id] >= best.job.requiredStaff) {
            remaining = remaining.filter((j) => j.id !== best.job.id);
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
    <div className="app-container">
      <h1>Staff Scheduler (Custom Windows + Coloured Routes)</h1>

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
            type="time"
            value={staffStart}
            onChange={(e) => setStaffStart(e.target.value)}
          />

          <input
            type="time"
            value={staffEnd}
            onChange={(e) => setStaffEnd(e.target.value)}
          />
        </div>

        <h4>Custom Windows</h4>

        <div className="flex-row">
          <div>
            <strong>Breakfast</strong>
            <br />
            <input
              type="time"
              value={staffBreakfastStart}
              onChange={(e) => setStaffBreakfastStart(e.target.value)}
            />
            <input
              type="time"
              value={staffBreakfastEnd}
              onChange={(e) => setStaffBreakfastEnd(e.target.value)}
            />
          </div>

          <div>
            <strong>Lunch</strong>
            <br />
            <input
              type="time"
              value={staffLunchStart}
              onChange={(e) => setStaffLunchStart(e.target.value)}
            />
            <input
              type="time"
              value={staffLunchEnd}
              onChange={(e) => setStaffLunchEnd(e.target.value)}
            />
          </div>

          <div>
            <strong>Tea</strong>
            <br />
            <input
              type="time"
              value={staffTeaStart}
              onChange={(e) => setStaffTeaStart(e.target.value)}
            />
            <input
              type="time"
              value={staffTeaEnd}
              onChange={(e) => setStaffTeaEnd(e.target.value)}
            />
          </div>

          <div>
            <strong>Evening</strong>
            <br />
            <input
              type="time"
              value={staffEveningStart}
              onChange={(e) => setStaffEveningStart(e.target.value)}
            />
            <input
              type="time"
              value={staffEveningEnd}
              onChange={(e) => setStaffEveningEnd(e.target.value)}
            />
          </div>
        </div>

        <button onClick={handleAddStaff}>Add Staff</button>

        <ul>
          {staff.map((s) => (
            <li key={s.id}>
              {s.name} — {s.postcode} — {s.availableStart}–{s.availableEnd}{" "}
              <button onClick={() => handleDeleteStaff(s.id)}>Delete</button>
            </li>
          ))}
        </ul>
      </section>

      {/* Add Appointment */}
      <section>
        <h2>Add Appointment</h2>

        <div className="flex-row">
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

          <div>
            <label className="label-small">Earliest Start</label>
            <input
              type="time"
              value={apptEarliestStart}
              onChange={(e) => setApptEarliestStart(e.target.value)}
            />
          </div>

          <div>
            <label className="label-small">Latest End</label>
            <input
              type="time"
              value={apptLatestEnd}
              onChange={(e) => setApptLatestEnd(e.target.value)}
            />
          </div>

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

          <select
            value={apptWindowType}
            onChange={(e) => setApptWindowType(e.target.value)}
          >
            <option value="default">Default</option>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="tea">Tea</option>
            <option value="evening">Evening</option>
          </select>

          <button onClick={handleAddAppointment}>Add Appointment</button>
        </div>

        <ul>
          {appointments.map((a) => (
            <li key={a.id}>
              <strong>{a.name}</strong> — {a.postcode} ({a.earliestStart}–
              {a.latestEnd}) {a.duration}min — needs {a.requiredStaff} staff —
              type: {a.windowType}{" "}
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
                <div key={job.id + "-" + job.actualStart}>
                  <strong>
                    #{idx + 1} {job.name}
                  </strong>{" "}
                  — {job.postcode}
                  <br />
                  {fromMinutes(job.actualStart)}–
                  {fromMinutes(job.actualEnd)}
                  <br />
                  (global window {job.earliestStart}–{job.latestEnd}
                  {job.staffWindow
                    ? `, staff window ${job.staffWindow.start}–${job.staffWindow.end}`
                    : ""}
                  , travel {job.travelMinutes} min)
                </div>
              ))}
            </div>
          );
        })}
      </section>

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
    </div>
  );
}

export default App;