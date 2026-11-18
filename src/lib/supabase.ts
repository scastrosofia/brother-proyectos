import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://uxgchofbileqoqfumydf.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_qkQjSNJ9BWv6qa6AcwyJHw_qOneUBKF';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Faltan configurar las variables de entorno de Supabase en .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
