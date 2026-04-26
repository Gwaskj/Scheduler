// AppointmentModal.jsx
import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function AppointmentModal({ appt, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: appt.name || "",
    postcode: appt.postcode || "",
    earliest_start: appt.earliest_start || "",
    latest_end: appt.latest_end || "",
    user_id: appt.user_id || "",
  });

  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSave() {
    setSaving(true);

    await supabase
      .from("appointments")
      .update({
        name: form.name,
        postcode: form.postcode,
        earliest_start: form.earliest_start,
        latest_end: form.latest_end,
        user_id: form.user_id,
      })
      .eq("id", appt.id);

    setSaving(false);
    onSaved?.();
    onClose();
  }

  async function handleDelete() {
    if (!window.confirm("Delete this appointment?")) return;

    setSaving(true);
    await supabase.from("appointments").delete().eq("id", appt.id);
    setSaving(false);

    onSaved?.();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-semibold">Edit Appointment</h2>

        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium">Name</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            className="w-full rounded border px-2 py-1"
          />
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium">Postcode</label>
          <input
            name="postcode"
            value={form.postcode}
            onChange={handleChange}
            className="w-full rounded border px-2 py-1"
          />
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Earliest Start</label>
            <input
              name="earliest_start"
              value={form.earliest_start}
              onChange={handleChange}
              className="w-full rounded border px-2 py-1"
              placeholder="2024-01-01T09:00"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Latest End</label>
            <input
              name="latest_end"
              value={form.latest_end}
              onChange={handleChange}
              className="w-full rounded border px-2 py-1"
              placeholder="2024-01-01T17:00"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">User ID</label>
          <input
            name="user_id"
            value={form.user_id}
            onChange={handleChange}
            className="w-full rounded border px-2 py-1 text-xs"
          />
        </div>

        <div className="flex justify-between">
          <button
            onClick={handleDelete}
            className="rounded bg-red-600 px-4 py-2 text-white"
            disabled={saving}
          >
            Delete
          </button>

          <div className="space-x-2">
            <button
              onClick={onClose}
              className="rounded border px-4 py-2"
              disabled={saving}
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              className="rounded bg-blue-600 px-4 py-2 text-white"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
