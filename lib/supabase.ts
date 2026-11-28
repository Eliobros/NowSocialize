import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let cached: SupabaseClient | null = null

// Lazy init: o cliente só é criado dentro da execução da rota (nunca no topo
// do módulo), para não quebrar o `next build` quando as envs não existem.
export function getSupabase(): SupabaseClient {
  if (cached) return cached

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Faltando variáveis de ambiente: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas."
    )
  }

  // Usamos a Service Role Key no backend para ignorar políticas de RLS e garantir o upload seguro
  cached = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false, // Desabilitado já que o backend lida com JWT próprio
    },
  })

  return cached
}
