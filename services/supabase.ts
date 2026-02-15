
import { createClient } from '@supabase/supabase-js';

// Prioritize localStorage for user-provided keys, fallback to environment variables
const getSupabaseConfig = () => {
  const localUrl = localStorage.getItem('kindred_supabase_url');
  const localKey = localStorage.getItem('kindred_supabase_key');
  
  const url = localUrl || process.env.SUPABASE_URL || 'https://placeholder-project.supabase.co';
  const key = localKey || process.env.SUPABASE_ANON_KEY || 'placeholder-key';
  
  return { url, key };
};

const config = getSupabaseConfig();

export const isSupabaseConfigured = 
  config.url !== 'https://placeholder-project.supabase.co' && 
  config.key !== 'placeholder-key' &&
  config.url.startsWith('https://');

export const supabase = createClient(config.url, config.key);

// Helper to update config and reload
export const updateSupabaseConfig = (url: string, key: string) => {
  localStorage.setItem('kindred_supabase_url', url);
  localStorage.setItem('kindred_supabase_key', key);
  window.location.reload(); // Reload to re-initialize the client and channels
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem('kindred_supabase_url');
  localStorage.removeItem('kindred_supabase_key');
  window.location.reload();
};
