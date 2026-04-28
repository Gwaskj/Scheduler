import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import "./AdminLayout.css";

export default function AdminLayout() {
  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <h2 className="admin-logo">Admin</h2>

        <nav className="admin-nav">
          <NavLink to="/admin" end className="admin-link">
            Dashboard
          </NavLink>

          <NavLink to="/admin/homepage" className="admin-link">
            Homepage Editor
          </NavLink>

          <NavLink to="/admin/logs" className="admin-link">
            Activity Logs
          </NavLink>

          <NavLink to="/admin/staff" className="admin-link">
            Staff
          </NavLink>

          <NavLink to="/admin/appointments" className="admin-link">
            Appointments
          </NavLink>

          <NavLink to="/admin/settings" className="admin-link">
            Settings
          </NavLink>
        </nav>
      </aside>

      {/* Main content */}
      <main className="admin-main">
        <header className="admin-header">
          <h1 className="admin-header-title">Admin Panel</h1>
        </header>

        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
