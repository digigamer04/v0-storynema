import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClientWithCookies } from "@/lib/supabase"
import { getUser } from "@/lib/auth"
import { cookies } from "next/headers" // Importar cookies

export async function POST(request: NextRequest) {
  try {
    console.log("Creando nueva escena...")

    // Verificar autenticación
    const cookieStore = cookies()
    const user = await getUser(cookieStore) // Pasar cookieStore a getUser
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
    // Usar createServerSupabaseClientWithCookies para respetar RLS
    const supabase = createServerSupabaseClientWithCookies(cookieStore)
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", sceneData.project_id)
      .eq("user_id", user.id) // Asegurar que el proyecto pertenezca al usuario
      .single()

    if (projectError) {
      console.error("Error fetching project:", projectError)
      return NextResponse.json({ error: "Error al verificar el proyecto" }, { status: 500 })
    }

    if (!project) {
      console.error("Project not found or not owned by user")
      return NextResponse.json({ error: "Proyecto no encontrado o no tienes permiso" }, { status: 404 })
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
