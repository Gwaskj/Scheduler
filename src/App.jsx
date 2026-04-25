import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./HomePage";
import SchedulerPage from "./SchedulerPage";
import LearnPage from "./LearnPage";
import FeedbackPage from "./FeedbackPage";
import AuthPage from "./AuthPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/app" element={<SchedulerPage />} />
        <Route path="/learn" element={<LearnPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/auth" element={<AuthPage />} />
      </Routes>
    </BrowserRouter>
  );
}
