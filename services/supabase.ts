
import { createBrowserClient } from '@supabase/ssr';
import { ENV } from '../lib/config';

// LocalStorage fallbacks for preview/offline-first usage
const getSupabaseConfig = () => {
  const localUrl = localStorage.getItem('kindred_supabase_url');
  const localKey = localStorage.getItem('kindred_supabase_key');
  
  const url = localUrl || ENV.SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = localKey || ENV.SUPABASE_ANON_KEY || 'placeholder';
  
  return { url, key };
};

const config = getSupabaseConfig();

export const isSupabaseConfigured = 
  config.url !== 'https://placeholder.supabase.co' && 
  config.key !== 'placeholder' &&
  config.url.startsWith('https://');

/**
 * createClient: Using @supabase/ssr pattern for the browser.
 */
export const supabase = createBrowserClient(config.url, config.key);

export const updateSupabaseConfig = (url: string, key: string) => {
  localStorage.setItem('kindred_supabase_url', url);
  localStorage.setItem('kindred_supabase_key', key);
  window.location.reload();
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem('kindred_supabase_url');
  localStorage.removeItem('kindred_supabase_key');
  window.location.reload();
};
