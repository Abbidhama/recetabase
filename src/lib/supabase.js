import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://subgcucynbjrhnkpsfjh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1YmdjdWN5bmJqcmhua3BzZmpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NTE5MzIsImV4cCI6MjA5NjQyNzkzMn0.nQf2cGp04qbUYGFAQ1WCFKrWCtfPCxa-QzlpuIudidE";

export const supabase = createClient(supabaseUrl, supabaseKey);

// ── RECIPES ──────────────────────────────────────────────
export async function getRecipes() {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addRecipe(recipe) {
  const { data, error } = await supabase
    .from('recipes')
    .insert([recipe])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRecipe(id) {
  const { error } = await supabase.from('recipes').delete().eq('id', id);
  if (error) throw error;
}
