"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"
import { createClientSupabaseClient } from "@/lib/supabase"
import ScriptGenerator from "@/components/script-generator"

export default function NewProjectPage() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("blank")
  const [userId, setUserId] = useState<string | null>(null)

  // Verificar autenticación
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClientSupabaseClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          console.error("No active session found")
          router.push("/auth")
          return
        }

        setUserId(session.user.id)
      } catch (error) {
        console.error("Error checking authentication:", error)
        router.push("/auth")
      }
    }

    checkAuth()
  }, [router])

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userId) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para crear un proyecto",
        variant: "destructive",
      })
      router.push("/auth")
      return
    }

    if (!title.trim()) {
      toast({
        title: "Error",
        description: "El título del proyecto es obligatorio",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)

      console.log("Creating new project:", title)

      // Crear proyecto directamente con Supabase
      // Eliminamos el campo 'status' ya que no existe en la tabla
      const supabase = createClientSupabaseClient()
      const { data: newProject, error } = await supabase
        .from("projects")
        .insert([
          {
            title,
            description,
            user_id: userId,
            // Eliminamos el campo status que causa el error
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single()

      if (error) {
        throw error
      }

      console.log("Project created successfully:", newProject.id)
      toast({
        title: "Proyecto creado",
        description: "El proyecto se ha creado correctamente",
      })

      // Redirigir al nuevo proyecto
      router.push(`/projects/${newProject.id}`)
    } catch (error: any) {
      console.error("Error creating project:", error)
      toast({
        title: "Error",
        description: `Error al crear el proyecto: ${error.message}`,
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  // Actualizar la función handleAIGeneration para que coincida con la interfaz del componente ScriptGenerator
  const handleScriptCreated = async (scenes: { title: string; content: string }[]) => {
    // Esta función se llamará cuando el script sea creado
    // No necesitamos hacer nada aquí porque el ScriptGenerator ya se encarga de crear el proyecto y redirigir
    console.log("Script created with scenes:", scenes.length)
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Nuevo Proyecto</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="blank">Proyecto en Blanco</TabsTrigger>
            <TabsTrigger value="ai">Generar con IA</TabsTrigger>
          </TabsList>
          <TabsContent value="blank">
            <Card>
              <form onSubmit={handleCreateProject}>
                <CardHeader>
                  <CardTitle>Crear Proyecto en Blanco</CardTitle>
                  <CardDescription>
                    Crea un nuevo proyecto desde cero. Podrás añadir escenas y contenido después.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título del Proyecto</Label>
                    <Input
                      id="title"
                      placeholder="Ingresa el título de tu proyecto"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción (opcional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe brevemente tu proyecto"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" type="button" onClick={() => router.push("/")}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      "Crear Proyecto"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          <TabsContent value="ai">
            <Card>
              <CardHeader>
                <CardTitle>Generar Proyecto con IA</CardTitle>
                <CardDescription>Utiliza nuestra IA para generar un proyecto basado en tus ideas.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScriptGenerator onScriptCreated={handleScriptCreated} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
