import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

// Singleton para el cliente del lado del cliente
let clientSupabaseClient: ReturnType<typeof createClient<Database>> | null = null

// Cliente para el lado del servidor
export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Faltan las variables de entorno de Supabase")
  }

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
    },
  })
}

// Modificar la función createServerSupabaseClientWithCookies para que acepte cookies como parámetro
export function createServerSupabaseClientWithCookies(cookieStore?: any) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  // Use the same anon key as the client to avoid missing env vars in production
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Faltan las variables de entorno de Supabase")
  }

  if (!cookieStore) {
    // Si no hay cookie store, crear un cliente sin funcionalidad de cookies
    return createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
    })
  }

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      cookieOptions: {
        name: "sb-auth-token",
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    },
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value
      },
      set(name, value, options) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch (error) {
          console.error("Error al establecer cookie:", error)
        }
      },
      remove(name, options) {
        try {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 })
        } catch (error) {
          console.error("Error al eliminar cookie:", error)
        }
      },
    },
  })
}

// Cliente para el lado del cliente
export function createClientSupabaseClient() {
  if (clientSupabaseClient) return clientSupabaseClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Faltan las variables de entorno de Supabase")
  }

  clientSupabaseClient = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
    },
  })

  return clientSupabaseClient
}

// Función que faltaba y causaba el error
export function createClientSupabaseClientWithCookies() {
  if (clientSupabaseClient) return clientSupabaseClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Faltan las variables de entorno de Supabase")
  }

  clientSupabaseClient = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      cookieOptions: {
        name: "sb-auth-token",
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    },
  })

  return clientSupabaseClient
}
