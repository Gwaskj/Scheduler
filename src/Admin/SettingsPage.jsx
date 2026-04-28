import React from "react";

export default function SettingsPage() {
  return (
    <div className="p-4">
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>

      <section className="rounded border bg-white p-4 shadow-sm max-w-2xl space-y-6">
        {/* GENERAL SETTINGS */}
        <div>
          <h2 className="text-lg font-semibold mb-2">General</h2>
          <p className="text-sm text-gray-600">
            Configure global admin settings. This section is ready for future
            options such as feature toggles, system flags, or environment
            controls.
          </p>
        </div>

        <hr />

        {/* SYSTEM INFO */}
        <div>
          <h2 className="text-lg font-semibold mb-2">System Information</h2>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>
              <strong>Environment:</strong> Production
            </li>
            <li>
              <strong>Version:</strong> 1.0.0
            </li>
            <li>
              <strong>Database:</strong> Supabase
            </li>
          </ul>
        </div>

        <hr />

        {/* PLACEHOLDER FOR FUTURE SETTINGS */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Advanced</h2>
          <p className="text-sm text-gray-600">
            Add advanced configuration options here as your platform grows.
          </p>
        </div>
      </section>
    </div>
  );
}
