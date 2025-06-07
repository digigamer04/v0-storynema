/**
 * Utilidades de sincronización para mantener consistencia entre el editor de guiones y el storyboard
 */

// Función para sincronizar cambios del guion al storyboard
export function syncScriptToStoryboard(scriptScene: any, projectId: string) {
  try {
    // Guardar la escena individual
    localStorage.setItem(`storynema_script_scene_${scriptScene.id}`, JSON.stringify(scriptScene))

    // Marcar que los cambios vienen del editor de guiones
    localStorage.setItem(`storynema_last_update_source_${projectId}`, "script_editor")
    localStorage.setItem(`storynema_last_update_time_${projectId}`, Date.now().toString())

    // Actualizar el mapeo de escenas
    updateSceneMapping(scriptScene, projectId, "script")

    return true
  } catch (error) {
    console.error("Error syncing script to storyboard:", error)
    return false
  }
}

// Función para sincronizar cambios del storyboard al guion
export function syncStoryboardToScript(storyboardScene: any, projectId: string) {
  try {
    // Guardar la escena individual
    localStorage.setItem(`storynema_storyboard_scene_${storyboardScene.id}`, JSON.stringify(storyboardScene))

    // Marcar que los cambios vienen del storyboard
    localStorage.setItem(`storynema_last_update_source_${projectId}`, "storyboard")
    localStorage.setItem(`storynema_last_update_time_${projectId}`, Date.now().toString())

    // Actualizar el mapeo de escenas
    updateSceneMapping(storyboardScene, projectId, "storyboard")

    return true
  } catch (error) {
    console.error("Error syncing storyboard to script:", error)
    return false
  }
}

// Función para actualizar el mapeo de escenas
function updateSceneMapping(scene: any, projectId: string, source: "script" | "storyboard") {
  try {
    const mappingKey = `storynema_scene_mapping_${projectId}`
    let mapping = {}

    // Cargar mapeo existente
    try {
      const savedMapping = localStorage.getItem(mappingKey)
      if (savedMapping) {
        mapping = JSON.parse(savedMapping)
      }
    } catch (error) {
      console.error("Error loading scene mapping:", error)
    }

    // Actualizar el mapeo
    mapping[scene.id] = {
      lastUpdated: new Date().toISOString(),
      source,
      title: scene.title,
      content: source === "script" ? scene.content : scene.description,
    }

    localStorage.setItem(mappingKey, JSON.stringify(mapping))
  } catch (error) {
    console.error("Error updating scene mapping:", error)
  }
}

// Función para verificar si hay cambios pendientes
export function checkForPendingChanges(projectId: string, lastCheckTime: number) {
  try {
    const lastUpdateTime = localStorage.getItem(`storynema_last_update_time_${projectId}`)

    if (!lastUpdateTime) {
      return {
        hasChanges: false,
        source: null,
        timestamp: null,
      }
    }

    const updateTimestamp = Number.parseInt(lastUpdateTime)

    // Si la última actualización es más reciente que la última verificación
    if (updateTimestamp > lastCheckTime) {
      const source = localStorage.getItem(`storynema_last_update_source_${projectId}`)

      return {
        hasChanges: true,
        source,
        timestamp: updateTimestamp,
      }
    }

    return {
      hasChanges: false,
      source: null,
      timestamp: null,
    }
  } catch (error) {
    console.error("Error checking for pending changes:", error)
    return {
      hasChanges: false,
      source: null,
      timestamp: null,
      error,
    }
  }
}

// Función para convertir una escena del guion al formato del storyboard
export function convertScriptSceneToStoryboard(scriptScene: any, existingStoryboardScene?: any) {
  if (!scriptScene) return null

  // Si ya existe una escena de storyboard, actualizar solo los campos necesarios
  if (existingStoryboardScene) {
    return {
      ...existingStoryboardScene,
      title: scriptScene.title,
      description: scriptScene.content ? scriptScene.content.split("\n")[0] || "Sin descripción" : "Sin descripción",
    }
  }

  // Si no existe, crear una nueva escena de storyboard
  return {
    id: scriptScene.id,
    title: scriptScene.title,
    description: scriptScene.content ? scriptScene.content.split("\n")[0] || "Sin descripción" : "Sin descripción",
    images: [
      {
        id: `${scriptScene.id}-1`,
        url: "/placeholder.svg?height=300&width=500",
        description: "Nueva imagen - añade una descripción",
        duration: 3,
        cameraSettings: {
          model: "Sony FX6",
          lens: "24-70mm f/2.8",
          aperture: "f/4.0",
          shutterSpeed: "1/50",
          iso: "800",
          whiteBalance: "5600K",
          resolution: "4K",
          frameRate: "24 fps",
          format: "ProRes 422 HQ",
        },
      },
    ],
    metadata: {
      camera: "Sin información",
      lighting: "Sin información",
      audio: "Sin información",
      duration: "0 segundos",
    },
  }
}

// Función para convertir una escena del storyboard al formato del guion
export function convertStoryboardSceneToScript(storyboardScene: any, existingScriptScene?: any) {
  if (!storyboardScene) return null

  // Si ya existe una escena de guion, actualizar solo los campos necesarios
  if (existingScriptScene) {
    // Mantener el contenido original pero actualizar la primera línea con la descripción
    const contentLines = existingScriptScene.content.split("\n")
    const newContent =
      storyboardScene.description + (contentLines.length > 1 ? "\n" + contentLines.slice(1).join("\n") : "")

    return {
      ...existingScriptScene,
      title: storyboardScene.title,
      content: newContent,
    }
  }

  // Si no existe, crear una nueva escena de guion
  return {
    id: storyboardScene.id,
    title: storyboardScene.title,
    content: storyboardScene.description || "",
    is_temporary: true,
  }
}
