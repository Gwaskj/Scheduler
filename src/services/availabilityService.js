import { supabase } from "./supabaseClient";

// ⭐ Load availability windows for a specific staff member (scoped by user)
export async function loadAvailability(staffId, userId) {
  const { data, error } = await supabase
    .from("availability_windows")
    .select("*")
    .eq("staff_id", staffId)
    .eq("user_id", userId)
    .order("start_time", { ascending: true });

  if (error) throw error;
  return data;
}

// ⭐ Add a new availability window
export async function addAvailability(window) {
  const { data, error } = await supabase
    .from("availability_windows")
    .insert([window])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ⭐ Update an existing availability window (RLS‑safe)
export async function updateAvailability(id, userId, updates) {
  const { data, error } = await supabase
    .from("availability_windows")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ⭐ Delete an availability window (RLS‑safe)
export async function deleteAvailability(id, userId) {
  const { error } = await supabase
    .from("availability_windows")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
}
