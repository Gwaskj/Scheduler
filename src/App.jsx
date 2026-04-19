import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./HomePage";
import SchedulerPage from "./SchedulerPage";
import LearnPage from "./LearnPage";


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/app" element={<SchedulerPage />} />
  <Route path="/learn" element={<LearnPage />} />   {/* <-- Add this */}
</Routes>
    </BrowserRouter>
  );
}
