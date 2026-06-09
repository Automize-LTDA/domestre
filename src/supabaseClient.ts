import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rhebahrxckvrygdcbulc.supabase.co'
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZWJhaHJ4Y2t2cnlnZGNidWxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NjM4ODUsImV4cCI6MjA5NjUzOTg4NX0.DXMLG5phfT7CCQ_HFAl4NXbWx3pqn6dc1OI99-dVQSY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true
  }
})
