// Modificar para no depender de la función RPC que no está disponible
import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClientWithCookies } from "@/lib/supabase"
import { getProject } from "@/lib/projects"
import { cookies } from "next/headers"

export async function POST(request: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const projectId = params.projectId

    if (!projectId) {
      return NextResponse.json({ error: "ID de proyecto es requerido" }, { status: 400 })
    }

    // Obtener las cookies para la autenticación
    const cookieStore = cookies()

    // Verificar que el proyecto existe y el usuario tiene acceso
    await getProject(projectId, cookieStore)

    // Crear cliente de Supabase con cookies para mantener la autenticación
    const supabase = createServerSupabaseClientWithCookies(cookieStore)

    // Obtener todas las escenas del proyecto
    const { data: scenes, error: fetchError } = await supabase
      .from("scenes")
      .select("id, order_index")
      .eq("project_id", projectId)
      .order("order_index", { ascending: true })

    if (fetchError) {
      console.error("Error al obtener escenas:", fetchError.message)
      return NextResponse.json({ error: `Error al obtener escenas: ${fetchError.message}` }, { status: 500 })
    }

    if (!scenes || scenes.length === 0) {
      return NextResponse.json({ message: "No hay escenas para invertir" }, { status: 200 })
    }

    // Invertir el orden de las escenas
    const reversedScenes = [...scenes].reverse()

    // Actualizar cada escena con su nuevo order_index
    const updates = reversedScenes.map((scene, index) => {
      return supabase.from("scenes").update({ order_index: index }).eq("id", scene.id).eq("project_id", projectId)
    })

    // Ejecutar actualizaciones en paralelo
    const results = await Promise.all(updates)
    const errors = results.filter((result) => result.error)

    if (errors.length > 0) {
      console.error("Errores al actualizar escenas:", errors.map((e) => e.error?.message).join(", "))
      return NextResponse.json(
        {
          error: `Error al invertir escenas: ${errors[0].error?.message}`,
        },
        { status: 500 },
      )
    }

    // También actualizar la fecha del proyecto
    await supabase.from("projects").update({ updated_at: new Date().toISOString() }).eq("id", projectId)

    // Si llegamos aquí, todo fue exitoso
    console.log(`Orden de escenas invertido para el proyecto: ${projectId}`)

    // Obtener las escenas actualizadas para confirmar el cambio
    const { data: updatedScenes } = await supabase
      .from("scenes")
      .select("id, order_index, title")
      .eq("project_id", projectId)
      .order("order_index", { ascending: true })

    return NextResponse.json(
      {
        success: true,
        message: "Orden de escenas invertido correctamente",
        scenes: updatedScenes,
      },
      { status: 200 },
    )
  } catch (error: any) {
    console.error("Error en reverse-scenes:", error)
    return NextResponse.json({ error: `Error al invertir escenas: ${error.message}` }, { status: 500 })
  }
}
