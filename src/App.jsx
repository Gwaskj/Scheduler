import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomePage from "./HomePage";
import SchedulerPage from "./SchedulerPage";
import LearnPage from "./LearnPage";
import FeedbackPage from "./FeedbackPage";
import AuthPage from "./AuthPage";

import AdminRoute from "./Admin/AdminRoute";
import AdminLayout from "./Admin/AdminLayout";

import AdminDashboard from "./Admin/AdminDashboard";
import AdminHomepageEditor from "./Admin/AdminHomepageEditor";
import LogsPage from "./Admin/LogsPage";
import StaffPage from "./Admin/StaffPage";
import AppointmentsPage from "./Admin/AppointmentsPage";
import SettingsPage from "./Admin/SettingsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/app" element={<SchedulerPage />} />
        <Route path="/learn" element={<LearnPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/auth" element={<AuthPage />} />

        {/* Admin routes (all nested inside AdminLayout) */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          {/* Default admin page */}
          <Route index element={<AdminDashboard />} />

          {/* Individual admin pages */}
          <Route path="homepage" element={<AdminHomepageEditor />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="appointments" element={<AppointmentsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
