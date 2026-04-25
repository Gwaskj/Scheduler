import { supabase } from "./supabaseClient";

// ⭐ Load all appointments for the current user
export async function loadAppointments(userId) {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("user_id", userId)
    .order("earliest_start", { ascending: true });

  if (error) throw error;
  return data;
}

// ⭐ Add a new appointment (full object)
export async function addAppointment(appt) {
  const { data, error } = await supabase
    .from("appointments")
    .insert([appt])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ⭐ Update an appointment (scoped by user_id for RLS safety)
export async function updateAppointment(id, userId, updates) {
  const { data, error } = await supabase
    .from("appointments")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ⭐ Delete an appointment (also scoped by user_id)
export async function deleteAppointment(id, userId) {
  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
}
