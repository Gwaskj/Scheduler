import { supabase } from './supabaseClient';

// Load all staff
export async function loadStaff() {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

// Add staff
export async function addStaff(name) {
  const { data, error } = await supabase
    .from('staff')
    .insert([{ name }])
    .select();

  if (error) throw error;
  return data[0];
}

// Delete staff
export async function deleteStaff(id) {
  const { error } = await supabase
    .from('staff')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
