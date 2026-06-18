import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://quejmdetmxexqzjsrsbl.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1ZWptZGV0bXhleHF6anNyc2JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MzMzMzEsImV4cCI6MjA5NzMwOTMzMX0.YfOC4ePS1XKySdgyvZAwy514tyP6UDYT4dhYom8-vmM'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
