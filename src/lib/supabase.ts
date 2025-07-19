import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://enejgdsgqahbktocmvev.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuZWpnZHNncWFoYmt0b2NtdmV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4ODE5NDEsImV4cCI6MjA2NTQ1Nzk0MX0.wgC4YCVjGORnqOa1FjlwF9HvoI_22d_Me-CxQxUwRwU'

export const supabase = createClient(supabaseUrl, supabaseKey)