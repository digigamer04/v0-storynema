"use client"

import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export default function AuthDebug() {
  const { user, loading, error, signOut } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 bg-gray-800 text-white"
        onClick={() => setIsOpen(true)}
      >
        Debug Auth
      </Button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-gray-800 text-white rounded-lg shadow-lg z-50 max-w-md">
      <div className="flex justify-between mb-2">
        <h3 className="font-bold">Auth Debug</h3>
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
          X
        </Button>
      </div>
      <div className="space-y-2 text-sm">
        <p>
          <strong>Estado:</strong> {loading ? "Cargando..." : user ? "Autenticado" : "No autenticado"}
        </p>
        {user && (
          <>
            <p>
              <strong>Usuario ID:</strong> {user.id}
            </p>
            <p>
              <strong>Email:</strong> {user.email}
            </p>
            <p>
              <strong>Último inicio:</strong> {new Date(user.last_sign_in_at || "").toLocaleString()}
            </p>
          </>
        )}
        {error && (
          <p className="text-red-400">
            <strong>Error:</strong> {error instanceof Error ? error.message : String(error)}
          </p>
        )}
        <div className="pt-2">
          {user ? (
            <Button variant="destructive" size="sm" onClick={signOut}>
              Cerrar sesión
            </Button>
          ) : (
            <Button variant="default" size="sm" onClick={() => (window.location.href = "/auth")}>
              Iniciar sesión
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
