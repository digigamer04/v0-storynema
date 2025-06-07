import {
  createClientComponentClient,
  createRouteHandlerClient,
} from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/supabase"

// Singleton para el cliente del lado del cliente
let clientSupabaseClient: ReturnType<typeof createClientComponentClient<Database>> | null = null

// Cliente para el lado del servidor con cookies
export function createServerSupabaseClientWithCookies(cookieStore?: any) {
  const getCookies = require("next/headers").cookies
  const store = cookieStore || getCookies()
  return createRouteHandlerClient<Database>({ cookies: () => store })
}

// Cliente para el lado del cliente con manejo de cookies
export function createClientSupabaseClientWithCookies() {
  if (clientSupabaseClient) return clientSupabaseClient
  clientSupabaseClient = createClientComponentClient<Database>()
  return clientSupabaseClient
}

// Alias mantenido por compatibilidad
export const createClientSupabaseClient = createClientSupabaseClientWithCookies

// Cliente de servicio con clave de rol
export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Faltan las variables de entorno de Supabase")
  }

  const getCookies = require("next/headers").cookies
  return createRouteHandlerClient<Database>({ cookies: () => getCookies() }, {
    supabaseUrl,
    supabaseKey,
    options: { auth: { persistSession: false } },
  })
}
