"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ProjectCard } from "@/components/project-card"
import { ChevronDown, Plus, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { createClientSupabaseClient } from "@/lib/supabase"

interface HomeClientProps {
  userProjects?: any[]
  sampleProjects: any[]
  error?: string | null
}

export default function HomeClient({
  userProjects: initialProjects,
  sampleProjects,
  error: initialError,
}: HomeClientProps) {
  const [isExampleSectionOpen, setIsExampleSectionOpen] = useState(true)
  const [projects, setProjects] = useState(initialProjects || [])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(initialError || null)
  const { user, loading: authLoading, signOut } = useAuth()

  // Cargar proyectos del usuario cuando se autentique
  useEffect(() => {
    const loadUserProjects = async () => {
      if (!user) return

      try {
        setIsLoading(true)
        const supabase = createClientSupabaseClient()

        const { data, error: supabaseError } = await supabase
          .from("projects")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })

        if (supabaseError) {
          throw supabaseError
        }

        setProjects(data || [])
      } catch (err) {
        console.error("Error loading user projects:", err)
        setError("Error al cargar tus proyectos")
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      loadUserProjects()
      setIsExampleSectionOpen(!user)
    }
  }, [user])

  if (authLoading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <span className="ml-2">Cargando...</span>
        </div>
      </main>
    )
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <section className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">Storynema</h1>
        <p className="text-xl mb-6">
          Una herramienta para crear guiones y storyboards de manera interactiva asistido por IA
        </p>
        {user ? (
          <div className="flex flex-col items-center gap-4">
            <div className="flex justify-center gap-4">
              <Button asChild size="lg">
                <Link href="/projects-new">
                  <Plus className="mr-2 h-4 w-4" /> Nuevo Proyecto
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/projects-manage">Gestionar Proyectos</Link>
              </Button>
            </div>
            <Button
              variant="ghost"
              onClick={async () => {
                try {
                  await signOut()
                  window.location.href = "/"
                } catch (error) {
                  console.error("Error al cerrar sesión:", error)
                }
              }}
              className="text-red-500 hover:text-red-700 hover:bg-red-100"
            >
              Cerrar Sesión
            </Button>
          </div>
        ) : (
          <Button asChild size="lg">
            <Link href="/auth">Iniciar Sesión para Comenzar</Link>
          </Button>
        )}
      </section>

      {error && (
        <Card className="mb-8 border-red-300 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {user && (
        <section className="mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Tus Proyectos Recientes</CardTitle>
              <CardDescription>Continúa trabajando en tus proyectos recientes o crea uno nuevo</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                </div>
              ) : projects && projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.slice(0, 6).map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="mb-4">Aún no tienes proyectos</p>
                  <Button asChild>
                    <Link href="/projects-new">
                      <Plus className="mr-2 h-4 w-4" /> Crear tu primer proyecto
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
            {projects && projects.length > 0 && (
              <CardFooter className="flex justify-center">
                <Button asChild variant="outline">
                  <Link href="/projects-manage">Ver todos tus proyectos</Link>
                </Button>
              </CardFooter>
            )}
          </Card>
        </section>
      )}

      <section className="mt-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Proyectos de Ejemplo</CardTitle>
              <CardDescription>Explora estos proyectos de ejemplo para inspirarte</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-9 p-0"
              onClick={() => setIsExampleSectionOpen(!isExampleSectionOpen)}
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${isExampleSectionOpen ? "rotate-180" : ""}`}
              />
              <span className="sr-only">Mostrar/Ocultar proyectos de ejemplo</span>
            </Button>
          </CardHeader>
          {isExampleSectionOpen && (
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sampleProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      </section>
    </main>
  )
}
