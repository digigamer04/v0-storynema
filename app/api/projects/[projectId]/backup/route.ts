import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers" // Importar cookies
import { createServerSupabaseClientWithCookies } from "@/lib/supabase"
import { getUser } from "@/lib/auth"

export async function POST(request: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const projectId = params.projectId
    const cookieStore = cookies()

    // Verificar autenticación y obtener usuario
    const user = await getUser(cookieStore)
    if (!user) {
      console.error("Authentication required for backup")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const supabase = createServerSupabaseClientWithCookies(cookieStore)

    // 1. Obtener el proyecto completo
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*, scenes(*), storyboard_shots(*), camera_settings(*)")
      .eq("id", projectId)
      .eq("user_id", user.id) // Asegurarse de que el usuario sea el propietario
      .single()

    if (projectError) {
      console.error("Error fetching project for backup:", projectError.message)
      return NextResponse.json(
        { error: `Error al obtener proyecto para la copia de seguridad: ${projectError.message}` },
        { status: 500 },
      )
    }
    if (!project) {
      console.error("Project not found or not owned by user for backup")
      return NextResponse.json({ error: "Proyecto no encontrado o no autorizado" }, { status: 404 })
    }

    // 2. Insertar en la tabla project_backups
    const { data: backupRecord, error: backupError } = await supabase
      .from("project_backups")
      .insert({
        project_id: projectId,
        user_id: user.id,
        backup_data: project, // Guardar el proyecto completo como JSON
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (backupError) {
      console.error("Error creating backup record:", backupError.message)
      return NextResponse.json(
        { error: `Error al crear la copia de seguridad: ${backupError.message}` },
        { status: 500 },
      )
    }

    console.log(`Copia de seguridad del proyecto ${projectId} creada correctamente con ID: ${backupRecord.id}`)
    return NextResponse.json({ success: true, backupId: backupRecord.id })
  } catch (error: any) {
    console.error("Error en backup project API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
