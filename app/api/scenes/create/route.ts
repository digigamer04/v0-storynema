import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"
import { getUser } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    console.log("Creando nueva escena...")

    // Verificar autenticación
    const user = await getUser()
    if (!user) {
      console.error("Authentication required")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Obtener datos de la escena
    const sceneData = await request.json()

    // Validar datos
    if (!sceneData.project_id) {
      console.error("Project ID is required")
      return NextResponse.json({ error: "El ID del proyecto es obligatorio" }, { status: 400 })
    }

    if (!sceneData.title) {
      console.error("Scene title is required")
      return NextResponse.json({ error: "El título de la escena es obligatorio" }, { status: 400 })
    }

    // Verificar que el proyecto existe y pertenece al usuario
    const supabase = createServerSupabaseClient()
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", sceneData.project_id)
      .single()

    if (projectError) {
      console.error("Error fetching project:", projectError)
      return NextResponse.json({ error: "Error al verificar el proyecto" }, { status: 500 })
    }

    if (!project) {
      console.error("Project not found")
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 })
    }

    if (project.user_id !== user.id && !project.is_sample) {
      console.error("User does not own this project")
      return NextResponse.json({ error: "No tienes permiso para modificar este proyecto" }, { status: 403 })
    }

    // Establecer valores por defecto
    sceneData.created_at = new Date().toISOString()
    sceneData.updated_at = new Date().toISOString()

    console.log("Creating scene with data:", {
      project_id: sceneData.project_id,
      title: sceneData.title,
      order_index: sceneData.order_index || 0,
    })

    // Crear escena
    const { data, error } = await supabase.from("scenes").insert(sceneData).select().single()

    if (error) {
      console.error("Error creating scene:", error)
      return NextResponse.json({ error: `Error al crear la escena: ${error.message}` }, { status: 500 })
    }

    console.log("Scene created successfully:", data.id)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error in create scene API:", error)
    return NextResponse.json({ error: `Error al crear la escena: ${error.message}` }, { status: 500 })
  }
}
