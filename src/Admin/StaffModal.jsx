// StaffModal.jsx
import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function StaffModal({ staff, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: staff.name || "",
    postcode: staff.postcode || "",
    lat: staff.lat ?? "",
    lon: staff.lon ?? "",
    user_id: staff.user_id || "",
  });
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSave() {
    setSaving(true);
    await supabase
      .from("staff")
      .update({
        name: form.name,
        postcode: form.postcode,
        lat: form.lat === "" ? null : Number(form.lat),
        lon: form.lon === "" ? null : Number(form.lon),
        user_id: form.user_id,
      })
      .eq("id", staff.id);

    setSaving(false);
    onSaved?.();
    onClose();
  }

  async function handleDelete() {
    if (!window.confirm("Delete this staff member?")) return;
    setSaving(true);
    await supabase.from("staff").delete().eq("id", staff.id);
    setSaving(false);
    onSaved?.();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-semibold">Edit Staff</h2>

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
            <label className="mb-1 block text-sm font-medium">Lat</label>
            <input
              name="lat"
              value={form.lat}
              onChange={handleChange}
              className="w-full rounded border px-2 py-1"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Lon</label>
            <input
              name="lon"
              value={form.lon}
              onChange={handleChange}
              className="w-full rounded border px-2 py-1"
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
