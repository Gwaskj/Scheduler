import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import AppointmentModal from "./AppointmentModal";

const PAGE_SIZE = 20;

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [appointmentsPage, setAppointmentsPage] = useState(1);
  const [appointmentsTotal, setAppointmentsTotal] = useState(0);
  const [appointmentsSearch, setAppointmentsSearch] = useState("");
  const [editingAppointment, setEditingAppointment] = useState(null);

  // -----------------------------
  // LOAD APPOINTMENTS
  // -----------------------------
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

  // -----------------------------
  // EFFECTS
  // -----------------------------
  useEffect(() => {
    loadAppointments();
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [appointmentsPage, appointmentsSearch]);

  // -----------------------------
  // ACTIONS
  // -----------------------------
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

  // -----------------------------
  // PAGINATION
  // -----------------------------
  function renderPagination() {
    const totalPages = Math.max(1, Math.ceil(appointmentsTotal / PAGE_SIZE));

    return (
      <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
        <span>
          Page {appointmentsPage} of {totalPages} • {appointmentsTotal} total
        </span>

        <div className="space-x-2">
          <button
            onClick={() =>
              setAppointmentsPage(Math.max(1, appointmentsPage - 1))
            }
            disabled={appointmentsPage === 1}
            className="rounded border px-2 py-1 disabled:opacity-50"
          >
            Prev
          </button>

          <button
            onClick={() =>
              setAppointmentsPage(
                Math.min(totalPages, appointmentsPage + 1)
              )
            }
            disabled={appointmentsPage === totalPages}
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
    <div className="p-4">
      <h1 className="mb-6 text-2xl font-bold">Appointments</h1>

      <div className="mb-4 flex items-center justify-between">
        <input
          value={appointmentsSearch}
          onChange={(e) => {
            setAppointmentsPage(1);
            setAppointmentsSearch(e.target.value);
          }}
          placeholder="Search name…"
          className="w-48 rounded border px-2 py-1 text-xs"
        />

        <button
          onClick={loadAppointments}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          Refresh
        </button>
      </div>

      <section className="rounded border bg-white p-4 shadow-sm">
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

        {renderPagination()}
      </section>

      {/* MODAL */}
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
