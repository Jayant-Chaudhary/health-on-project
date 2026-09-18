import { createClient } from '@supabase/supabase-js';
import { config } from './env.js';

// Standard Supabase client initialized with public anon key
export const supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey);
