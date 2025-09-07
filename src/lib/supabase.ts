import { createClient } from '@supabase/supabase-js'

const fallbackUrl = 'https://qetmbprouonlipxwvigt.supabase.co'
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFldG1icHJvdW9ubGlweHd2aWd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0OTI4NzAsImV4cCI6MjA3MjA2ODg3MH0.mf2ZhMvYRkjpAD_DrC-BifvjJ9xCg_8sXrDOLkIGPl8'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? fallbackUrl
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? fallbackKey

export const supabase = createClient(supabaseUrl, supabaseKey)