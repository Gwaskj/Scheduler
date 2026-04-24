import { supabase } from './supabaseClient';

// Load availability windows for a specific staff member
export async function loadAvailability(staffId) {
  const { data, error } = await supabase
    .from('availability_windows')
    .select('*')
    .eq('staff_id', staffId)
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data;
}

// Add a new availability window
export async function addAvailability({ staff_id, start_time, end_time, window_type }) {
  const { data, error } = await supabase
    .from('availability_windows')
    .insert([{ staff_id, start_time, end_time, window_type }])
    .select();

  if (error) throw error;
  return data[0];
}

// Update an existing availability window
export async function updateAvailability(id, updates) {
  const { data, error } = await supabase
    .from('availability_windows')
    .update(updates)
    .eq('id', id)
    .select();

  if (error) throw error;
  return data[0];
}

// Delete an availability window
export async function deleteAvailability(id) {
  const { error } = await supabase
    .from('availability_windows')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
