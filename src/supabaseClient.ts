import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dokxfgexpxmxcxiffejf.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRva3hmZ2V4cHhteGN4aWZmZWpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NDk4MjYsImV4cCI6MjA5MzIyNTgyNn0.4lqYmfLrhyMO876J3wjpAQoiDIA-CrMu7g_8ZsPBnUc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true
  }
})
