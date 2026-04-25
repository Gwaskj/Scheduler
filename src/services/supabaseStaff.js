import { supabase } from "./supabaseClient";

// ⭐ Load all staff for the current user
export async function loadStaff(userId) {
  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

// ⭐ Add staff (full object)
export async function addStaff(staff) {
  const { data, error } = await supabase
    .from("staff")
    .insert([staff])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ⭐ Delete staff (scoped by user_id for RLS safety)
export async function deleteStaff(id, userId) {
  const { error } = await supabase
    .from("staff")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
}
