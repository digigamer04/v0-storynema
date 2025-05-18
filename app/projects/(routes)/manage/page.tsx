"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import ProjectManagement from "@/components/project-management"
import { getUserClient } from "@/lib/auth"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function ManageProjectsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Usar useCallback para evitar recreaciones innecesarias de la función
  const loadUser = useCallback(async () => {
    try {
      if (userId) return // Evitar cargar si ya tenemos un userId

      setIsLoading(true)
      const user = await getUserClient()
      if (user) {
        setUserId(user.id)
      } else {
        setError("You must be logged in to manage projects")
      }
    } catch (err) {
      console.error("Error loading user:", err)
      setError("Error loading user information")
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadUser()

    // Limpiar estado al desmontar para evitar memory leaks
    return () => {
      setIsLoading(false)
    }
  }, [loadUser])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Manage Projects</h1>
        </div>

        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>

        <div className="flex justify-center mt-8">
          <Link href="/auth">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Manage Projects</h1>
      </div>

      {userId && <ProjectManagement userId={userId} />}
    </div>
  )
}
