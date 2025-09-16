import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qetmbprouonlipxwvigt.supabase.co'
const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFldG1icHJvdW9ubGlweHd2aWd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0OTI4NzAsImV4cCI6MjA3MjA2ODg3MH0.mf2ZhMvYRkjpAD_DrC-BifvjJ9xCg_8sXrDOLkIGPl8'

export const supabase: SupabaseClient = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
)

export async function getTableRows(table: string) {
    // Let supabase-js infer types (untyped client). Consumers can cast to T if needed.
    return supabase.from(table).select()
}
