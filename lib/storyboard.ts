import { createServerSupabaseClient } from "./supabase"
import type { Database } from "@/types/supabase"

export type StoryboardShot = Database["public"]["Tables"]["storyboard_shots"]["Row"]
export type CameraSettings = Database["public"]["Tables"]["camera_settings"]["Row"]

// Modificar la función getStoryboardShots para garantizar que solo se obtengan las tomas de la escena actual

export async function getStoryboardShots(sceneId: string) {
  const supabase = createServerSupabaseClient()

  // Primero verificar que la escena pertenece a un proyecto del usuario
  const { data: sceneData, error: sceneError } = await supabase
    .from("scenes")
    .select("project_id")
    .eq("id", sceneId)
    .single()

  if (sceneError) {
    console.error("Error verificando la escena:", sceneError)
    throw new Error("Error al verificar la escena")
  }

  // Verificar que el proyecto pertenece al usuario
  const { data: projectData, error: projectError } = await supabase
    .from("projects")
    .select("user_id")
    .eq("id", sceneData.project_id)
    .single()

  if (projectError) {
    console.error("Error verificando el proyecto:", projectError)
    throw new Error("Error al verificar el proyecto")
  }

  // Obtener las tomas del storyboard
  const { data, error } = await supabase
    .from("storyboard_shots")
    .select(`
      *,
      camera_settings(*)
    `)
    .eq("scene_id", sceneId)
    .order("order_index", { ascending: true })

  if (error) {
    console.error("Error fetching storyboard shots:", error)
    throw new Error("Error al obtener las tomas del storyboard")
  }

  return data
}

export async function createStoryboardShot(
  shot: Database["public"]["Tables"]["storyboard_shots"]["Insert"],
  cameraSettings?: Database["public"]["Tables"]["camera_settings"]["Insert"],
) {
  const supabase = createServerSupabaseClient()

  // Iniciar una transacción
  const { data: shotData, error: shotError } = await supabase.from("storyboard_shots").insert(shot).select().single()

  if (shotError) {
    console.error("Error creating storyboard shot:", shotError)
    throw new Error("Error al crear la toma del storyboard")
  }

  // Si hay configuraciones de cámara, guardarlas
  if (cameraSettings && shotData) {
    const { error: cameraError } = await supabase.from("camera_settings").insert({
      ...cameraSettings,
      shot_id: shotData.id,
    })

    if (cameraError) {
      console.error("Error creating camera settings:", cameraError)
      throw new Error("Error al crear la configuración de cámara")
    }
  }

  return shotData
}

export async function updateStoryboardShot(
  shotId: string,
  updates: Database["public"]["Tables"]["storyboard_shots"]["Update"],
  cameraSettings?: Database["public"]["Tables"]["camera_settings"]["Update"],
) {
  const supabase = createServerSupabaseClient()

  const { data: shotData, error: shotError } = await supabase
    .from("storyboard_shots")
    .update(updates)
    .eq("id", shotId)
    .select()
    .single()

  if (shotError) {
    console.error("Error updating storyboard shot:", shotError)
    throw new Error("Error al actualizar la toma del storyboard")
  }

  // Si hay configuraciones de cámara, actualizarlas
  if (cameraSettings) {
    const { error: cameraError } = await supabase.from("camera_settings").update(cameraSettings).eq("shot_id", shotId)

    if (cameraError) {
      console.error("Error updating camera settings:", cameraError)
      throw new Error("Error al actualizar la configuración de cámara")
    }
  }

  return shotData
}

export async function deleteStoryboardShot(shotId: string) {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase.from("storyboard_shots").delete().eq("id", shotId)

  if (error) {
    console.error("Error deleting storyboard shot:", error)
    throw new Error("Error al eliminar la toma del storyboard")
  }

  return true
}

export async function reorderStoryboardShots(sceneId: string, shotIds: string[]) {
  const supabase = createServerSupabaseClient()

  // Actualizar el orden de cada toma
  const updates = shotIds.map((id, index) => ({
    id,
    order_index: index,
  }))

  const { error } = await supabase.from("storyboard_shots").upsert(updates)

  if (error) {
    console.error("Error reordering storyboard shots:", error)
    throw new Error("Error al reordenar las tomas del storyboard")
  }

  return true
}
