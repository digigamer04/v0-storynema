import { redirect } from "next/navigation"
import { createServerSupabaseClientWithCookies, createClientSupabaseClient } from "./supabase"

// Funciones del lado del servidor
// Obtener el usuario actual desde la sesión (solo para componentes del servidor)
// Actualizar getUser para aceptar cookieStore
export async function getUser(cookieStore?: any) {
  try {
    const supabase = createServerSupabaseClientWithCookies(cookieStore)

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) {
      console.error("Error al obtener la sesión:", error.message)
      return null
    }

    if (!session) {
      return null
    }

    return session.user
  } catch (error) {
    console.error("Error en getUser:", error)
    return null
  }
}

// Verificar si el usuario está autenticado (solo para componentes del servidor)
export async function requireAuth() {
  const user = await getUser()

  if (!user) {
    redirect("/auth")
  }

  return user
}

// Verificar si el usuario es propietario del recurso
export async function isResourceOwner(userId: string, resourceUserId: string) {
  // Si el usuario es administrador, permitir acceso
  if (process.env.NEXT_PUBLIC_USE_DEV_ADMIN === "true") {
    return true
  }

  return userId === resourceUserId
}

// Funciones del lado del cliente
// Obtener el usuario actual desde la sesión (para componentes cliente)
export async function getUserClient() {
  try {
    const supabase = createClientSupabaseClient()
    const { data, error } = await supabase.auth.getUser()

    if (error) {
      console.error("Error getting user:", error.message)
      return null
    }

    return data.user
  } catch (error) {
    console.error("Error in getUserClient:", error)
    return null
  }
}

// Función para iniciar sesión
// Modificar la función signIn para aceptar el parámetro rememberMe
export async function signIn(email: string, password: string, rememberMe = false) {
  try {
    const supabase = createClientSupabaseClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        // Configurar la persistencia de la sesión según la opción rememberMe
        // Si rememberMe es true, la sesión persistirá incluso después de cerrar el navegador
        // Si es false, la sesión se eliminará al cerrar el navegador
        persistSession: rememberMe,
      },
    })

    if (error) {
      console.error("Error al iniciar sesión:", error.message)
      throw error
    }

    return data
  } catch (error) {
    console.error("Error en signIn:", error)
    throw error
  }
}

// Función para registrarse
export async function signUp(email: string, password: string) {
  try {
    const supabase = createClientSupabaseClient()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      console.error("Error al registrarse:", error.message)
      throw error
    }

    return data
  } catch (error) {
    console.error("Error en signUp:", error)
    throw error
  }
}

// Función para cerrar sesión
export async function signOut() {
  try {
    const supabase = createClientSupabaseClient()

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error("Error al cerrar sesión:", error.message)
      throw error
    }

    return true
  } catch (error) {
    console.error("Error en signOut:", error)
    throw error
  }
}
