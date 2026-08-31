import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"
import { getUser } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    console.log("Creating new project...")

    // Verificar autenticación
    const user = await getUser()
    if (!user) {
      console.error("Authentication required")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Obtener datos del proyecto
    const { scenes: requestedScenes, ...projectData } = await request.json()

    // Validar datos
    if (!projectData.title) {
      console.error("Project title is required")
      return NextResponse.json({ error: "El título del proyecto es obligatorio" }, { status: 400 })
    }

    // Asegurarse de que el usuario solo puede crear proyectos para sí mismo
    if (projectData.user_id && projectData.user_id !== user.id) {
      console.error("Cannot create project for another user")
      return NextResponse.json({ error: "No puedes crear un proyecto para otro usuario" }, { status: 403 })
    }

    // Establecer el ID de usuario
    projectData.user_id = user.id

    // Establecer valores por defecto
    projectData.created_at = new Date().toISOString()
    projectData.updated_at = new Date().toISOString()
    // `status` no existe en el esquema actual de projects; no lo enviamos.
    delete projectData.status

    console.log("Creating project with data:", projectData)

    // Crear proyecto
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase.from("projects").insert(projectData).select().single()

    if (error) {
      console.error("Error creating project:", error)
      return NextResponse.json({ error: `Error al crear el proyecto: ${error.message}` }, { status: 500 })
    }

    console.log("Project created successfully:", data.id)

    // Crear todas las escenas en el servidor, usando el cliente privilegiado.
    // Esto también permite que el modo demo funcione sin depender de RLS del navegador.
    const scenes = Array.isArray(requestedScenes) ? requestedScenes : []
    if (scenes.length > 0) {
      const sceneRows = scenes.map((scene: { title?: string; content?: string }, index: number) => ({
        project_id: data.id,
        title: scene.title || `ESCENA ${index + 1}`,
        content: scene.content || "",
        order_index: index,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))

      const { error: scenesError } = await supabase.from("scenes").insert(sceneRows)
      if (scenesError) {
        await supabase.from("projects").delete().eq("id", data.id)
        return NextResponse.json({ error: `Error al crear las escenas: ${scenesError.message}` }, { status: 500 })
      }
    }

    return NextResponse.json({ ...data, scenes_created: scenes.length })
  } catch (error: any) {
    console.error("Error in create project API:", error)
    const message = error?.message === "fetch failed"
      ? "No se pudo conectar con Supabase. La base de datos puede estar temporalmente inaccesible."
      : `Error al crear el proyecto: ${error?.message || "Error desconocido"}`
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
