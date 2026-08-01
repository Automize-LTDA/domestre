import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wtqvmkivwiswxinkaldn.supabase.co'
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0cXZta2l2d2lzd3hpbmthbGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1OTMwNDQsImV4cCI6MjEwMTE2OTA0NH0.l1T1XhE-_W6HYycniCe59Xu13x0gOHKMR0sfh-YDx28'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true
  }
})
