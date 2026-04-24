import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./HomePage";
import SchedulerPage from "./SchedulerPage";
import LearnPage from "./LearnPage";
import FeedbackPage from "./FeedbackPage";
import { supabase } from './supabaseClient';
import AuthPage from "./AuthPage";

async function testRead() {
  const { data, error } = await supabase
    .from('staff')
    .select('*');

  console.log('READ TEST — DATA:', data);
  console.log('READ TEST — ERROR:', error);
}

testRead();
async function testInsert() {
  const { data, error } = await supabase
    .from("staff")
    .insert([{ name: "Test Staff" }])
    .select();

  console.log("INSERT TEST — DATA:", data);
  console.log("INSERT TEST — ERROR:", error);
}

testInsert();
async function testAppointment() {
  const { data, error } = await supabase
    .from("appointments")
    .insert([{
      staff_id: "REPLACE_WITH_STAFF_ID",
      client_name: "Test Client",
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 3600000).toISOString() // +1 hour
    }])
    .select();

  console.log("APPOINTMENT TEST — DATA:", data);
  console.log("APPOINTMENT TEST — ERROR:", error);
}

testAppointment();




export default function App() {
  return (
    <BrowserRouter>
      <Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/app" element={<SchedulerPage />} />
  <Route path="/learn" element={<LearnPage />} />   {/* <-- Add this */}
  <Route path="/feedback" element={<FeedbackPage />} /> 
  <Route path="/auth" element={<AuthPage />} />
</Routes>
    </BrowserRouter>
  );
}