import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomePage from "./HomePage";
import SchedulerPage from "./SchedulerPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Homepage */}
        <Route path="/" element={<HomePage />} />

        {/* Your scheduler/map page */}
        <Route path="/app" element={<SchedulerPage />} />
      </Routes>
    </BrowserRouter>
  );
}
