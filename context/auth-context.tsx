"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import {
  createClientSupabaseClient,
  createClientSupabaseClientWithCookies,
} from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

type AuthContextType = {
  user: User | null
  loading: boolean
  error: Error | null
  signIn: (email: string, password: string, rememberMe: boolean) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Inicializar cliente de Supabase una vez
  const supabase = createClientSupabaseClientWithCookies()

  useEffect(() => {
    // Verificar si hay una sesión activa
    const checkSession = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          throw sessionError
        }

        setUser(session?.user || null)
      } catch (err) {
        console.error("Error checking session:", err)
        setError(err instanceof Error ? err : new Error("Error en la autenticación"))
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // Suscribirse a cambios en la autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    // Limpiar suscripción
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Modificar la función signIn en el contexto para aceptar el parámetro rememberMe
  const signIn = async (email: string, password: string, rememberMe = false) => {
    try {
      setLoading(true)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          persistSession: rememberMe,
        },
      })

      if (signInError) {
        throw signInError
      }
    } catch (err) {
      console.error("Error signing in:", err)
      setError(err instanceof Error ? err : new Error("Error al iniciar sesión"))
      throw err
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signUpError) {
        throw signUpError
      }
    } catch (err) {
      console.error("Error signing up:", err)
      setError(err instanceof Error ? err : new Error("Error al registrarse"))
      throw err
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      const { error: signOutError } = await supabase.auth.signOut()

      if (signOutError) {
        throw signOutError
      }
    } catch (err) {
      console.error("Error signing out:", err)
      setError(err instanceof Error ? err : new Error("Error al cerrar sesión"))
      throw err
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, signIn, signUp, signOut }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider")
  }
  return context
}
