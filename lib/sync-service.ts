/**
 * Servicio de sincronización entre el editor de guiones y el storyboard
 * Este servicio proporciona funciones para mantener sincronizados los datos
 * entre los diferentes componentes de la aplicación.
 */

// Modificar la función syncSceneToStoryboard para mejorar la persistencia
export function syncSceneToStoryboard(scene: any, projectId: string) {
  try {
    // Guardar la escena individual con una clave más específica
    localStorage.setItem(`storynema_scene_${scene.id}_${projectId}`, JSON.stringify(scene))

    // Actualizar el mapeo de escenas
    const mappingKey = `storynema_scene_mapping_${projectId}`
    let mapping = {}

    try {
      const savedMapping = localStorage.getItem(mappingKey)
      if (savedMapping) {
        mapping = JSON.parse(savedMapping)
      }
    } catch (error) {
      console.error("Error loading scene mapping:", error)
    }

    // Actualizar o añadir esta escena al mapeo
    mapping[scene.id] = {
      lastUpdated: new Date().toISOString(),
      title: scene.title,
      content: scene.content,
      firstLine: scene.content ? scene.content.split("\n")[0] : "",
    }

    localStorage.setItem(mappingKey, JSON.stringify(mapping))

    // Marcar que los cambios vienen del editor de guiones
    localStorage.setItem(`storynema_last_update_source_${projectId}`, "script_editor")
    localStorage.setItem(`storynema_last_update_time_${projectId}`, Date.now().toString())

    // También actualizar el array completo de escenas para mantener consistencia
    try {
      const savedScenes = localStorage.getItem(`storynema_scenes_${projectId}`)
      if (savedScenes) {
        const scenes = JSON.parse(savedScenes)
        const sceneIndex = scenes.findIndex((s: any) => s.id === scene.id)
        if (sceneIndex !== -1) {
          scenes[sceneIndex] = scene
        } else {
          scenes.push(scene)
        }
        localStorage.setItem(`storynema_scenes_${projectId}`, JSON.stringify(scenes))
      }
    } catch (error) {
      console.error("Error updating scenes array:", error)
    }

    return true
  } catch (error) {
    console.error("Error syncing scene to storyboard:", error)
    return false
  }
}

// Mejorar la función getSyncedScenes para garantizar que devuelva datos completos
export function getSyncedScenes(projectId: string) {
  try {
    // Primero intentar cargar desde el array completo de escenas
    const savedScenes = localStorage.getItem(`storynema_scenes_${projectId}`)
    if (savedScenes) {
      const parsedScenes = JSON.parse(savedScenes)
      if (Array.isArray(parsedScenes) && parsedScenes.length > 0) {
        console.log(`Loaded ${parsedScenes.length} scenes from complete array for project ${projectId}`)
        return parsedScenes
      }
    }

    // Si no hay array completo, intentar reconstruir desde el mapeo
    const mappingKey = `storynema_scene_mapping_${projectId}`
    const savedMapping = localStorage.getItem(mappingKey)

    if (!savedMapping) {
      return []
    }

    const mapping = JSON.parse(savedMapping)
    const sceneIds = Object.keys(mapping)

    // Cargar cada escena individual
    const scenes = sceneIds
      .map((id) => {
        try {
          const sceneData = localStorage.getItem(`storynema_scene_${id}_${projectId}`)
          if (sceneData) {
            return JSON.parse(sceneData)
          }
          return null
        } catch (error) {
          console.error(`Error loading scene ${id}:`, error)
          return null
        }
      })
      .filter((scene) => scene !== null)

    // Si se reconstruyeron escenas, guardarlas como array completo para futuras cargas
    if (scenes.length > 0) {
      localStorage.setItem(`storynema_scenes_${projectId}`, JSON.stringify(scenes))
    }

    return scenes
  } catch (error) {
    console.error("Error getting synced scenes:", error)
    return []
  }
}

// Función para sincronizar el storyboard con las escenas del guion
export function syncStoryboardToScenes(storyboardScenes: any[], projectId: string) {
  try {
    // Guardar las escenas del storyboard
    localStorage.setItem(`storynema_storyboard_scenes_${projectId}`, JSON.stringify(storyboardScenes))

    // Crear un mapeo inverso (del storyboard a las escenas)
    const inverseMappingKey = `storynema_storyboard_to_scenes_${projectId}`
    const inverseMapping = storyboardScenes.reduce((map, scene) => {
      map[scene.id] = {
        title: scene.title,
        description: scene.description,
        lastUpdated: new Date().toISOString(),
      }
      return map
    }, {})

    localStorage.setItem(inverseMappingKey, JSON.stringify(inverseMapping))

    return true
  } catch (error) {
    console.error("Error syncing storyboard to scenes:", error)
    return false
  }
}

// Función para limpiar la sincronización cuando se cambia de proyecto
export function clearSyncData(projectId: string) {
  try {
    // Obtener todas las claves de localStorage que empiezan con storynema_
    const keys = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(`storynema_`) && key.includes(projectId)) {
        keys.push(key)
      }
    }

    // Eliminar todas las claves encontradas
    keys.forEach((key) => {
      localStorage.removeItem(key)
    })

    return true
  } catch (error) {
    console.error("Error clearing sync data:", error)
    return false
  }
}
