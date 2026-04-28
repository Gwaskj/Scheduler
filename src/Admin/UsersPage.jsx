import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const PAGE_SIZE = 20;

export default function UsersPage() {
  const [profiles, setProfiles] = useState([]);
  const [profilesPage, setProfilesPage] = useState(1);
  const [profilesTotal, setProfilesTotal] = useState(0);
  const [profilesSearch, setProfilesSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // -----------------------------
  // LOAD USERS
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

  // -----------------------------
  // EFFECTS
  // -----------------------------
  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [profilesPage, profilesSearch]);

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

  // -----------------------------
  // PAGINATION
  // -----------------------------
  function renderPagination() {
    const totalPages = Math.max(1, Math.ceil(profilesTotal / PAGE_SIZE));

    return (
      <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
        <span>
          Page {profilesPage} of {totalPages} • {profilesTotal} total
        </span>

        <div className="space-x-2">
          <button
            onClick={() => setProfilesPage(Math.max(1, profilesPage - 1))}
            disabled={profilesPage === 1}
            className="rounded border px-2 py-1 disabled:opacity-50"
          >
            Prev
          </button>

          <button
            onClick={() =>
              setProfilesPage(Math.min(totalPages, profilesPage + 1))
            }
            disabled={profilesPage === totalPages}
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
      <h1 className="mb-6 text-2xl font-bold">Users</h1>

      <div className="mb-4 flex items-center justify-between">
        <input
          value={profilesSearch}
          onChange={(e) => {
            setProfilesPage(1);
            setProfilesSearch(e.target.value);
          }}
          placeholder="Search email…"
          className="w-48 rounded border px-2 py-1 text-xs"
        />

        <button
          onClick={loadProfiles}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          Refresh
        </button>
      </div>

      <section className="rounded border bg-white p-4 shadow-sm">
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
                <td className="border px-2 py-1">{u.is_pro ? "Yes" : "No"}</td>
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

        {renderPagination()}
      </section>
    </div>
  );
}
