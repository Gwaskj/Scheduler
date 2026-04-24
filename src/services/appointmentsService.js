import { supabase } from './supabaseClient';

// Load all appointments (later we will filter by user_id)
export async function loadAppointments() {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .order('earliest_start', { ascending: true });

  if (error) throw error;
  return data;
}

// Add a new appointment
export async function addAppointment({
  name,
  postcode,
  latitude,
  longitude,
  earliest_start,
  latest_end,
  duration,
  required_staff,
  window_type,
  strict_start,
}) {
  const { data, error } = await supabase
    .from('appointments')
    .insert([
      {
        name,
        postcode,
        latitude,
        longitude,
        earliest_start,
        latest_end,
        duration,
        required_staff,
        window_type,
        strict_start,
      },
    ])
    .select();

  if (error) throw error;
  return data[0];
}

// Update an appointment
export async function updateAppointment(id, updates) {
  const { data, error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id)
    .select();

  if (error) throw error;
  return data[0];
}

// Delete an appointment
export async function deleteAppointment(id) {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
