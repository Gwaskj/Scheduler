import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import StaffModal from "./StaffModal";
import AppointmentModal from "./AppointmentModal";
import AdminRoute from "./AdminRoute";

const PAGE_SIZE = 20;

export default function AdminDashboard() {
  const [profiles, setProfiles] = useState([]);
  const [profilesPage, setProfilesPage] = useState(1);
  const [profilesTotal, setProfilesTotal] = useState(0);
  const [profilesSearch, setProfilesSearch] = useState("");

  const [staff, setStaff] = useState([]);
  const [staffPage, setStaffPage] = useState(1);
  const [staffTotal, setStaffTotal] = useState(0);
  const [staffSearch, setStaffSearch] = useState("");

  const [appointments, setAppointments] = useState([]);
  const [appointmentsPage, setAppointmentsPage] = useState(1);
  const [appointmentsTotal, setAppointmentsTotal] = useState(0);
  const [appointmentsSearch, setAppointmentsSearch] = useState("");

  const [logs, setLogs] = useState([]);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);

  const [editingStaff, setEditingStaff] = useState(null);
  const [editingAppointment, setEditingAppointment] = useState(null);

  const [resetEmail, setResetEmail] = useState("");
  const [resetStatus, setResetStatus] = useState("");
  const [loading, setLoading] = useState(false);

  // -----------------------------
  // LOADERS
  // -----------------------------
  async function loadProfiles() {
    const from = (profilesPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("profiles")
      .select("*", { count: "exact" })
      .order("email", { ascending: true })
      .range(from, to);

    if (profilesSearch.trim()) {
      query = query.ilike("email", `%${profilesSearch.trim()}%`);
    }

    const { data, count } = await query;
    setProfiles(data || []);
    setProfilesTotal(count || 0);
  }

  async function loadStaff() {
    const from = (staffPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("staff")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: true })
      .range(from, to);

    if (staffSearch.trim()) {
      query = query.ilike("name", `%${staffSearch.trim()}%`);
    }

    const { data, count } = await query;
    setStaff(data || []);
    setStaffTotal(count || 0);
  }

  async function loadAppointments() {
    const from = (appointmentsPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("appointments")
      .select("*", { count: "exact" })
      .order("earliest_start", { ascending: true })
      .range(from, to);

    if (appointmentsSearch.trim()) {
      query = query.ilike("name", `%${appointmentsSearch.trim()}%`);
    }

    const { data, count } = await query;
    setAppointments(data || []);
    setAppointmentsTotal(count || 0);
  }

  async function loadLogs() {
    const from = (logsPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, count } = await supabase
      .from("activity_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    setLogs(data || []);
    setLogsTotal(count || 0);
  }

  async function loadAll() {
    setLoading(true);
    await Promise.all([
      loadProfiles(),
      loadStaff(),
      loadAppointments(),
      loadLogs(),
    ]);
    setLoading(false);
  }

  // -----------------------------
  // EFFECTS
  // -----------------------------
  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [profilesPage, profilesSearch]);

  useEffect(() => {
    loadStaff();
  }, [staffPage, staffSearch]);

  useEffect(() => {
    loadAppointments();
  }, [appointmentsPage, appointmentsSearch]);

  useEffect(() => {
    loadLogs();
  }, [logsPage]);

  // -----------------------------
  // ACTIONS
  // -----------------------------
  async function togglePro(user) {
    await supabase
      .from("profiles")
      .update({ is_pro: !user.is_pro })
      .eq("id", user.id);

    await fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        action: "toggle_pro",
        details: `Set is_pro to ${!user.is_pro} for ${user.email}`,
      }),
    });

    loadProfiles();
  }

  async function deleteAppointment(id) {
    await supabase.from("appointments").delete().eq("id", id);

    await fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete_appointment",
        details: `Deleted appointment ${id}`,
      }),
    });

    loadAppointments();
  }

  async function handlePasswordReset(e) {
    e.preventDefault();
    if (!resetEmail.trim()) return;

    setResetStatus("Working...");

    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });

      if (!res.ok) {
        const text = await res.text();
        setResetStatus(`Error: ${text || res.status}`);
      } else {
        const json = await res.json();
        setResetStatus(`New password: ${json.newPassword}`);
      }
    } catch (err) {
      setResetStatus("Error calling reset endpoint.");
    }
  }

  // -----------------------------
  // PAGINATION RENDERER
  // -----------------------------
  function renderPagination(page, total, setPage) {
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    return (
      <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
        <span>
          Page {page} of {totalPages} • {total} total
        </span>
        <div className="space-x-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="rounded border px-2 py-1 disabled:opacity-50"
          >
            Prev
          </button>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="rounded border px-2 py-1 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  // -----------------------------
  // RENDER
  // -----------------------------
  return (
    <div className="mx-auto max-w-6xl p-8">
      <h1 className="mb-6 text-3xl font-bold">Admin Dashboard</h1>

      <div className="mb-6 flex items-center justify-between gap-4">
        <button
          onClick={loadAll}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          Refresh All
        </button>
        {loading && <span className="text-sm text-gray-500">Loading…</span>}
      </div>

      {/* GRID LAYOUT */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* USERS PANEL */}
        <section className="rounded border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Users</h2>
            <input
              value={profilesSearch}
              onChange={(e) => {
                setProfilesPage(1);
                setProfilesSearch(e.target.value);
              }}
              placeholder="Search email…"
              className="w-40 rounded border px-2 py-1 text-xs"
            />
          </div>

          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1 text-left">Email</th>
                <th className="border px-2 py-1 text-left">Pro</th>
                <th className="border px-2 py-1 text-left">Toggle Pro</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((u) => (
                <tr key={u.id}>
                  <td className="border px-2 py-1">{u.email}</td>
                  <td className="border px-2 py-1">
                    {u.is_pro ? "Yes" : "No"}
                  </td>
                  <td className="border px-2 py-1">
                    <button
                      onClick={() => togglePro(u)}
                      className="rounded bg-indigo-600 px-3 py-1 text-white"
                    >
                      {u.is_pro ? "Remove Pro" : "Make Pro"}
                    </button>
                  </td>
                </tr>
              ))}
              {profiles.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="border px-2 py-3 text-center text-gray-500"
                  >
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {renderPagination(profilesPage, profilesTotal, setProfilesPage)}
        </section>

        {/* PASSWORD RESET + LOGS PANEL */}
        <section className="space-y-6">
          {/* RESET PASSWORD */}
          <div className="rounded border bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">Reset Password</h2>
            <form onSubmit={handlePasswordReset} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium">
                  User Email
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full rounded border px-2 py-1 text-sm"
                  placeholder="user@example.com"
                />
              </div>

              <button
                type="submit"
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white"
              >
                Trigger Reset
              </button>

              {resetStatus && (
                <p className="text-xs text-gray-600">{resetStatus}</p>
              )}
            </form>
          </div>

          {/* ACTIVITY LOGS */}
          <div className="rounded border bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Activity Logs</h2>
            </div>

            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-2 py-1 text-left">Time</th>
                  <th className="border px-2 py-1 text-left">User</th>
                  <th className="border px-2 py-1 text-left">Action</th>
                  <th className="border px-2 py-1 text-left">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="border px-2 py-1">{log.created_at}</td>
                    <td className="border px-2 py-1">
                      {log.user_id || "system"}
                    </td>
                    <td className="border px-2 py-1">{log.action}</td>
                    <td className="border px-2 py-1">{log.details || ""}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="border px-2 py-3 text-center text-gray-500"
                    >
                      No logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {renderPagination(logsPage, logsTotal, setLogsPage)}
          </div>
        </section>
      </div>

      {/* SECOND ROW: STAFF + APPOINTMENTS */}
      <div className="mt-8 grid gap-8 md:grid-cols-2">
        {/* STAFF */}
        <section className="rounded border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Staff</h2>
            <input
              value={staffSearch}
              onChange={(e) => {
                setStaffPage(1);
                setStaffSearch(e.target.value);
              }}
              placeholder="Search name…"
              className="w-40 rounded border px-2 py-1 text-xs"
            />
          </div>

          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1 text-left">Name</th>
                <th className="border px-2 py-1 text-left">Postcode</th>
                <th className="border px-2 py-1 text-left">User</th>
                <th className="border px-2 py-1 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id}>
                  <td className="border px-2 py-1">{s.name}</td>
                  <td className="border px-2 py-1">{s.postcode}</td>
                  <td className="border px-2 py-1 text-[10px]">{s.user_id}</td>
                  <td className="border px-2 py-1">
                    <button
                      onClick={() => setEditingStaff(s)}
                      className="rounded bg-gray-700 px-3 py-1 text-white"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="border px-2 py-3 text-center text-gray-500"
                  >
                    No staff found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {renderPagination(staffPage, staffTotal, setStaffPage)}
        </section>

        {/* APPOINTMENTS */}
        <section className="rounded border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Appointments</h2>
            <input
              value={appointmentsSearch}
              onChange={(e) => {
                setAppointmentsPage(1);
                setAppointmentsSearch(e.target.value);
              }}
              placeholder="Search name…"
              className="w-40 rounded border px-2 py-1 text-xs"
            />
          </div>

          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1 text-left">Name</th>
                <th className="border px-2 py-1 text-left">Postcode</th>
                <th className="border px-2 py-1 text-left">Earliest</th>
                <th className="border px-2 py-1 text-left">Latest</th>
                <th className="border px-2 py-1 text-left">User</th>
                <th className="border px-2 py-1 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id}>
                  <td className="border px-2 py-1">{a.name}</td>
                  <td className="border px-2 py-1">{a.postcode}</td>
                  <td className="border px-2 py-1">{a.earliest_start}</td>
                  <td className="border px-2 py-1">{a.latest_end}</td>
                  <td className="border px-2 py-1 text-[10px]">{a.user_id}</td>
                  <td className="border px-2 py-1 space-x-2">
                    <button
                      onClick={() => setEditingAppointment(a)}
                      className="rounded bg-gray-700 px-3 py-1 text-white"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteAppointment(a.id)}
                      className="rounded bg-red-600 px-3 py-1 text-white"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {appointments.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="border px-2 py-3 text-center text-gray-500"
                  >
                    No appointments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {renderPagination(
            appointmentsPage,
            appointmentsTotal,
            setAppointmentsPage
          )}
        </section>
      </div>

         {/* MODALS */}
      {editingStaff && (
        <StaffModal
          staff={editingStaff}
          onClose={() => setEditingStaff(null)}
          onSaved={() => loadStaff()}
        />
      )}

      {editingAppointment && (
        <AppointmentModal
          appt={editingAppointment}
          onClose={() => setEditingAppointment(null)}
          onSaved={() => loadAppointments()}
        />
      )}
    </div>
  );
}
