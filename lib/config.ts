
export const ENV = {
  API_KEY: typeof process !== 'undefined' ? process.env.API_KEY : '',
  SUPABASE_URL: typeof process !== 'undefined' ? process.env.SUPABASE_URL : '',
  SUPABASE_ANON_KEY: typeof process !== 'undefined' ? process.env.SUPABASE_ANON_KEY : '',
};

export const validateConfig = () => {
  const missing = [];
  if (!ENV.API_KEY) missing.push('API_KEY');
  if (!ENV.SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!ENV.SUPABASE_ANON_KEY) missing.push('SUPABASE_ANON_KEY');
  
  if (missing.length > 0) {
    console.warn(`[Config] Missing environment variables: ${missing.join(', ')}`);
  }
  
  return missing.length === 0;
};
