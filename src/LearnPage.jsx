import React from "react";
import Header from "./Header";
import "./LearnPage.css";
import AdBanner from "./AdBanner";
import { useUser } from "./context/UserContext"; // <-- added

export default function LearnPage() {
  const { user } = useUser();          // <-- get user
  const isPaidUser = !!user;           // <-- define isPaidUser

  return (
    <>
      <Header />

      <div className="learn-container">
        <h1 className="learn-title">What is Route Scheduler?</h1>

        <p className="learn-text">
          Route Scheduler is a smart planning tool designed to help teams organise
          daily routes with speed, clarity, and accuracy. It was originally built
          with a community care focus after seeing firsthand how much time is lost
          each day due to inefficient scheduling tools — or no tools at all.
        </p>

        <p className="learn-text">
          Although it began with community care in mind, Route Scheduler is
          flexible enough to support a wide range of scheduling needs. Whether
          you're managing care‑at‑home visits, therapy appointments, support
          worker rounds, or delivery routes, the system removes the guesswork and
          gives you a clear, optimised plan for your day.
        </p>

        <p className="learn-text">
          This project is a work in progress with new features being added
          regularly. Feedback is hugely appreciated — if you have ideas,
          suggestions, or specific features you’d like to see, please feel free to
          reach out.
        </p>

        <h2 className="learn-subtitle">Key Features</h2>

        <ul className="learn-list">
          <li>✔ Automatically optimises routes for time and distance</li>
          <li>✔ Drag‑and‑drop route adjustments</li>
          <li>✔ Real‑time travel estimates</li>
          <li>✔ Easy export for staff or drivers</li>
          <li>✔ Clean, modern interface built for speed</li>
        </ul>

        <h2 className="learn-subtitle">Who is it for?</h2>

        <p className="learn-text">
          Route Scheduler is ideal for small teams, community care providers,
          delivery drivers, therapists, and managers who need a fast, reliable way
          to plan daily journeys without complicated software or manual
          spreadsheets.
        </p>

        {!isPaidUser && <AdBanner />}
      </div>
    </>
  );
}
