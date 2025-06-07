import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/supabase"

// Function to create a new scene
export async function createScene(sceneData: {
  project_id: string
  title: string
  content?: string
  order_index?: number
}) {
  try {
    const supabase = createClientComponentClient<Database>()

    // Obtener el orden máximo actual para el project_id dado
    const { data: maxOrderScene, error: maxOrderError } = await supabase
      .from("scenes")
      .select("order_index")
      .eq("project_id", sceneData.project_id)
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (maxOrderError) {
      console.error("Error fetching max order_index:", maxOrderError.message)
      throw new Error(`Error al obtener el índice de orden máximo: ${maxOrderError.message}`)
    }

    // Calcular el nuevo orden
    const newOrder = maxOrderScene ? maxOrderScene.order_index + 1 : 0

    const { data: newScene, error } = await supabase
      .from("scenes")
      .insert({
        project_id: sceneData.project_id,
        title: sceneData.title,
        content: sceneData.content || "",
        order_index: newOrder,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating scene:", error)
      throw new Error(`Error al crear la escena: ${error.message}`)
    }

    return newScene
  } catch (error: any) {
    console.error("Error in createScene:", error)
    throw new Error(`Error al crear la escena: ${error.message}`)
  }
}

// Function to update a scene
export async function updateScene(sceneId: string, updates: any) {
  try {
    const supabase = createClientComponentClient<Database>()

    const { error } = await supabase.from("scenes").update(updates).eq("id", sceneId)

    if (error) {
      console.error("Error updating scene:", error)
      throw new Error(`Error al actualizar la escena: ${error.message}`)
    }

    return true
  } catch (error: any) {
    console.error("Error in updateScene:", error)
    throw new Error(`Error al actualizar la escena: ${error.message}`)
  }
}

// Function to delete a scene
export async function deleteScene(sceneId: string) {
  try {
    const supabase = createClientComponentClient<Database>()

    const { error } = await supabase.from("scenes").delete().eq("id", sceneId)

    if (error) {
      console.error("Error deleting scene:", error)
      throw new Error(`Error al eliminar la escena: ${error.message}`)
    }

    return true
  } catch (error: any) {
    console.error("Error in deleteScene:", error)
    throw new Error(`Error al eliminar la escena: ${error.message}`)
  }
}

// Modificar la función reorderScenes para asegurar que los cambios se apliquen profundamente

export async function reorderScenes(projectId: string, sceneIds: string[]) {
  try {
    const supabase = createClientComponentClient<Database>()

    console.log("Reordenando escenas en la base de datos:", {
      projectId,
      sceneCount: sceneIds.length,
      sceneIds: sceneIds.slice(0, 3).join(", ") + (sceneIds.length > 3 ? "..." : ""),
    })

    // Primero, obtener todas las escenas actuales para verificar
    const { data: currentScenes, error: fetchError } = await supabase
      .from("scenes")
      .select("id, order_index")
      .eq("project_id", projectId)
      .order("order_index")

    if (fetchError) {
      console.error("Error al obtener escenas actuales:", fetchError)
      throw new Error(`Error al obtener escenas: ${fetchError.message}`)
    }

    // Verificar que tenemos todas las escenas necesarias
    if (currentScenes.length !== sceneIds.length) {
      console.warn(
        `Advertencia: El número de escenas actuales (${currentScenes.length}) no coincide con el número de escenas a reordenar (${sceneIds.length})`,
      )
    }

    // Actualizar cada escena individualmente con su nuevo order_index
    const updatePromises = sceneIds.map(async (id, index) => {
      console.log(`Actualizando escena ${id} a posición ${index}`)

      const { error } = await supabase
        .from("scenes")
        .update({ order_index: index })
        .eq("id", id)
        .eq("project_id", projectId)

      if (error) {
        console.error(`Error updating scene ${id}:`, error)
        throw new Error(`Error al actualizar la escena ${id}: ${error.message}`)
      }
    })

    // Esperar a que todas las actualizaciones se completen
    await Promise.all(updatePromises)

    // Verificar que las actualizaciones se aplicaron correctamente
    const { data: updatedScenes, error: verifyError } = await supabase
      .from("scenes")
      .select("id, order_index")
      .eq("project_id", projectId)
      .order("order_index")

    if (verifyError) {
      console.error("Error al verificar escenas actualizadas:", verifyError)
      throw new Error(`Error al verificar escenas actualizadas: ${verifyError.message}`)
    }

    // Verificar que el orden se aplicó correctamente
    const orderedCorrectly = updatedScenes.every((scene, index) => {
      return scene.id === sceneIds[index] && scene.order_index === index
    })

    if (!orderedCorrectly) {
      console.warn("Advertencia: El orden de las escenas no se aplicó correctamente. Intentando corregir...")

      // Intentar corregir el orden una vez más
      const finalUpdatePromises = updatedScenes.map(async (scene, index) => {
        if (scene.id !== sceneIds[index] || scene.order_index !== index) {
          const { error } = await supabase
            .from("scenes")
            .update({ order_index: index })
            .eq("id", sceneIds[index])
            .eq("project_id", projectId)

          if (error) {
            console.error(`Error en la corrección final para la escena ${sceneIds[index]}:`, error)
          }
        }
      })

      await Promise.all(finalUpdatePromises)
    }

    console.log("Reordenamiento de escenas completado con éxito")
    return true
  } catch (error: any) {
    console.error("Error en reorderScenes:", error)
    throw new Error(`Error al reordenar las escenas: ${error.message}`)
  }
}

// Función para invertir el orden de las escenas
export async function flipScenesOrder(projectId: string, sceneIds: string[]) {
  try {
    const supabase = createClientComponentClient<Database>()

    // Obtener todas las escenas del proyecto
    const { data: scenes, error: fetchError } = await supabase
      .from("scenes")
      .select("id, order_index")
      .eq("project_id", projectId)
      .order("order_index", { ascending: true })

    if (fetchError) {
      console.error("Error al obtener escenas:", fetchError.message)
      throw new Error(`Error al obtener escenas: ${fetchError.message}`)
    }

    if (!scenes || scenes.length === 0) {
      return { success: false, message: "No hay escenas para invertir" }
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
      return {
        success: false,
        error: `Error al invertir escenas: ${errors[0].error?.message}`,
      }
    }

    return { success: true, message: "Orden de escenas invertido correctamente" }
  } catch (error: any) {
    console.error("Error en flipScenesOrder:", error)
    return { success: false, error: `Error al invertir escenas: ${error.message}` }
  }
}
