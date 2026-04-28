import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import StaffModal from "./StaffModal";

const PAGE_SIZE = 20;

export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [staffPage, setStaffPage] = useState(1);
  const [staffTotal, setStaffTotal] = useState(0);
  const [staffSearch, setStaffSearch] = useState("");
  const [editingStaff, setEditingStaff] = useState(null);

  // -----------------------------
  // LOAD STAFF
  // -----------------------------
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

  // -----------------------------
  // EFFECTS
  // -----------------------------
  useEffect(() => {
    loadStaff();
  }, []);

  useEffect(() => {
    loadStaff();
  }, [staffPage, staffSearch]);

  // -----------------------------
  // PAGINATION
  // -----------------------------
  function renderPagination() {
    const totalPages = Math.max(1, Math.ceil(staffTotal / PAGE_SIZE));

    return (
      <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
        <span>
          Page {staffPage} of {totalPages} • {staffTotal} total
        </span>

        <div className="space-x-2">
          <button
            onClick={() => setStaffPage(Math.max(1, staffPage - 1))}
            disabled={staffPage === 1}
            className="rounded border px-2 py-1 disabled:opacity-50"
          >
            Prev
          </button>

          <button
            onClick={() =>
              setStaffPage(Math.min(totalPages, staffPage + 1))
            }
            disabled={staffPage === totalPages}
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
      <h1 className="mb-6 text-2xl font-bold">Staff</h1>

      <div className="mb-4 flex items-center justify-between">
        <input
          value={staffSearch}
          onChange={(e) => {
            setStaffPage(1);
            setStaffSearch(e.target.value);
          }}
          placeholder="Search name…"
          className="w-48 rounded border px-2 py-1 text-xs"
        />

        <button
          onClick={loadStaff}
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

        {renderPagination()}
      </section>

      {/* MODAL */}
      {editingStaff && (
        <StaffModal
          staff={editingStaff}
          onClose={() => setEditingStaff(null)}
          onSaved={() => loadStaff()}
        />
      )}
    </div>
  );
}
