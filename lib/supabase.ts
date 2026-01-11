import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION ---
// In production (Vercel), we use Environment Variables.
// The hardcoded values serve as a fallback or for local development if .env is not set up.

const DEFAULT_URL = 'https://hjtueytzrlvywultrrvp.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqdHVleXR6cmx2eXd1bHRycnZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMTMyOTUsImV4cCI6MjA4MzY4OTI5NX0.1ffGyqUvpmJ1kqGHhn8GGrz2FS3bUIBD8bZmBQs3iLE';

// Vite exposes env variables on import.meta.env
// We use a fallback empty object to prevent runtime crashes if env is undefined
const env = (import.meta as any).env || {};
const SUPABASE_URL: string = env.VITE_SUPABASE_URL || DEFAULT_URL;
const SUPABASE_ANON_KEY: string = env.VITE_SUPABASE_ANON_KEY || DEFAULT_KEY;

// We export a helper to check if the user has configured the keys
export const isSupabaseConfigured = () => {
  return (
    SUPABASE_URL && SUPABASE_URL !== 'INSERT_SUPABASE_URL' && 
    SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'INSERT_SUPABASE_KEY'
  );
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);