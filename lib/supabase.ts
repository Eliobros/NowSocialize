import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Faltando variáveis de ambiente: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas."
  )
}

// Usamos a Service Role Key no backend para ignorar políticas de RLS e garantir o upload seguro
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false, // Desabilitado já que o backend lida com JWT próprio
  },
})
