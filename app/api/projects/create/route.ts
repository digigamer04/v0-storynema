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
    const projectData = await request.json()

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
    projectData.status = projectData.status || "active"

    console.log("Creating project with data:", projectData)

    // Crear proyecto
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase.from("projects").insert(projectData).select().single()

    if (error) {
      console.error("Error creating project:", error)
      return NextResponse.json({ error: `Error al crear el proyecto: ${error.message}` }, { status: 500 })
    }

    console.log("Project created successfully:", data.id)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error in create project API:", error)
    return NextResponse.json({ error: `Error al crear el proyecto: ${error.message}` }, { status: 500 })
  }
}
