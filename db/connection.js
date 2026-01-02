import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.warn('[db/connection] Missing SUPABASE_URL or key env. Supabase client may fail.')
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
})

export default supabase;