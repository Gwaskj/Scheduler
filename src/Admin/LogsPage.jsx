import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const PAGE_SIZE = 20;

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);

  // -----------------------------
  // LOAD LOGS
  // -----------------------------
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

  // -----------------------------
  // EFFECTS
  // -----------------------------
  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [logsPage]);

  // -----------------------------
  // PAGINATION
  // -----------------------------
  function renderPagination() {
    const totalPages = Math.max(1, Math.ceil(logsTotal / PAGE_SIZE));

    return (
      <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
        <span>
          Page {logsPage} of {totalPages} • {logsTotal} total
        </span>

        <div className="space-x-2">
          <button
            onClick={() => setLogsPage(Math.max(1, logsPage - 1))}
            disabled={logsPage === 1}
            className="rounded border px-2 py-1 disabled:opacity-50"
          >
            Prev
          </button>

          <button
            onClick={() => setLogsPage(Math.min(totalPages, logsPage + 1))}
            disabled={logsPage === totalPages}
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
      <h1 className="mb-6 text-2xl font-bold">Activity Logs</h1>

      <section className="rounded border bg-white p-4 shadow-sm">
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

        {renderPagination()}
      </section>
    </div>
  );
}
