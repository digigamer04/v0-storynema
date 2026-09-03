"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { getDevDemoUser } from "@/lib/auth"

export type User = { id: string; email?: string; user_metadata?: Record<string, unknown> }

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
  const [user, setUser] = useState<User | null>(getDevDemoUser())
  const [error, setError] = useState<Error | null>(null)

  const signIn = async () => setUser(getDevDemoUser())
  const signUp = async () => setUser(getDevDemoUser())
  const signOut = async () => setUser(null)

  return (
    <AuthContext.Provider value={{ user, loading: false, error, signIn, signUp, signOut }}>
      <div className="fixed bottom-3 right-3 z-50 rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground shadow-sm">
        Modo local activo · IndexedDB
      </div>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth debe usarse dentro de un AuthProvider")
  return context
}
