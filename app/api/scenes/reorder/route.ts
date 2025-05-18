import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic" // Evitar el cacheo de la ruta

export async function POST(request: Request) {
  try {
    const { projectId, sceneIds, invertOrder = false } = await request.json()

    console.log("Reordenando escenas:", {
      projectId,
      sceneCount: sceneIds?.length,
      invertOrder,
      environment: process.env.NODE_ENV,
    })

    if (!projectId || !sceneIds || !Array.isArray(sceneIds)) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    }

    const supabase = createRouteHandlerClient({ cookies })
    const { data: session } = await supabase.auth.getSession()

    if (!session?.session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const userId = session.session.user.id

    // Verificar que el usuario tenga acceso al proyecto
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", userId) // Asegurar que el proyecto pertenece al usuario
      .single()

    if (projectError || !projectData) {
      console.error("Error al verificar el proyecto:", projectError)
      return NextResponse.json({ error: "No tienes acceso a este proyecto" }, { status: 403 })
    }

    // Obtener todas las escenas actuales para el proyecto
    const { data: currentScenes, error: scenesError } = await supabase
      .from("scenes")
      .select("id, position")
      .eq("project_id", projectId)
      .order("position")

    if (scenesError) {
      console.error("Error al obtener escenas:", scenesError)
      return NextResponse.json({ error: "Error al obtener escenas" }, { status: 500 })
    }

    console.log("Escenas actuales:", currentScenes.length)

    // Crear un mapa de las posiciones actuales
    const currentPositions = new Map()
    currentScenes.forEach((scene) => {
      currentPositions.set(scene.id, scene.position)
    })

    // Determinar el nuevo orden
    let newOrder = [...sceneIds]
    if (invertOrder) {
      console.log("Invirtiendo orden de escenas")
      newOrder = [...newOrder].reverse() // Usar una copia para evitar mutaciones inesperadas
    }

    // Crear posiciones temporales para evitar conflictos de unicidad
    // Primero movemos todas las escenas a posiciones negativas
    const tempUpdates = []
    for (let i = 0; i < currentScenes.length; i++) {
      const scene = currentScenes[i]
      const tempPosition = -1000 - i // Usar posiciones negativas temporales

      const { error } = await supabase
        .from("scenes")
        .update({ position: tempPosition })
        .eq("id", scene.id)
        .eq("project_id", projectId)

      if (error) {
        console.error(`Error al actualizar temporalmente escena ${scene.id}:`, error)
        return NextResponse.json({ error: "Error en actualización temporal" }, { status: 500 })
      }

      tempUpdates.push({ sceneId: scene.id, tempPosition })
    }

    console.log("Actualizaciones temporales completadas:", tempUpdates.length)

    // Ahora actualizamos a las posiciones finales
    const finalUpdates = []
    for (let i = 0; i < newOrder.length; i++) {
      const sceneId = newOrder[i]
      const newPosition = i + 1 // Posiciones basadas en 1

      const { error } = await supabase
        .from("scenes")
        .update({ position: newPosition })
        .eq("id", sceneId)
        .eq("project_id", projectId)

      if (error) {
        console.error(`Error al actualizar escena ${sceneId}:`, error)
        finalUpdates.push({ sceneId, success: false, error: error.message })
      } else {
        finalUpdates.push({ sceneId, success: true, newPosition })
      }
    }

    console.log("Actualizaciones finales completadas:", finalUpdates.length)

    // Verificar que todas las escenas siguen existiendo después de la actualización
    const { data: updatedScenes, error: verifyError } = await supabase
      .from("scenes")
      .select("id, position")
      .eq("project_id", projectId)
      .order("position")

    if (verifyError) {
      console.error("Error al verificar escenas actualizadas:", verifyError)
      return NextResponse.json(
        {
          error: "Error al verificar escenas actualizadas",
          updates: finalUpdates,
        },
        { status: 500 },
      )
    }

    console.log("Verificación final:", {
      before: currentScenes.length,
      after: updatedScenes.length,
      invertido: invertOrder,
    })

    return NextResponse.json({
      success: true,
      message: "Orden de escenas actualizado",
      updates: finalUpdates,
      scenesCount: {
        before: currentScenes.length,
        after: updatedScenes.length,
      },
      invertido: invertOrder,
    })
  } catch (error) {
    console.error("Error en reordenamiento de escenas:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
