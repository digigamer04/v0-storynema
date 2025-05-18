/**
 * Sistema de gestión de descripciones separado de la estructura principal
 * para mejorar el rendimiento y evitar problemas de renderizado
 */

// Tipos de descripciones que manejamos
export enum DescriptionType {
  SCENE = "scene",
  IMAGE = "image",
}

// Caché en memoria para descripciones
// Esta caché evita lecturas repetidas a localStorage
const descriptionsCache: Record<string, Record<string, string>> = {}

// Guardar una descripción en localStorage y en caché
export function saveDescription(
  projectId: string,
  type: DescriptionType,
  itemId: string,
  description: string,
): boolean {
  try {
    // Cargar el mapa actual de descripciones
    const storageKey = `storynema_descriptions_${type}_${projectId}`
    const currentDescriptions = loadAllDescriptions(projectId, type)

    // Actualizar la descripción específica
    const updatedDescriptions = {
      ...currentDescriptions,
      [itemId]: description,
    }

    // Guardar el mapa actualizado en localStorage
    localStorage.setItem(storageKey, JSON.stringify(updatedDescriptions))

    // Actualizar la caché en memoria
    const cacheKey = `${type}_${projectId}`
    descriptionsCache[cacheKey] = updatedDescriptions

    // Log para depuración
    console.log(`Descripción guardada (${type}) para ${itemId}: ${description.substring(0, 30)}...`)

    return true
  } catch (error) {
    console.error(`Error al guardar descripción (${type}) para ${itemId}:`, error)
    return false
  }
}

// Cargar una descripción específica (primero de caché, luego de localStorage)
export function loadDescription(projectId: string, type: DescriptionType, itemId: string): string | null {
  try {
    // Intentar obtener de la caché primero
    const cacheKey = `${type}_${projectId}`
    if (descriptionsCache[cacheKey] && descriptionsCache[cacheKey][itemId]) {
      const cachedDescription = descriptionsCache[cacheKey][itemId]
      console.log(`Descripción cargada desde caché (${type}) para ${itemId}: ${cachedDescription.substring(0, 30)}...`)
      return cachedDescription
    }

    // Si no está en caché, cargar de localStorage
    const descriptions = loadAllDescriptions(projectId, type)
    const description = descriptions[itemId] || null

    // Log para depuración
    if (description) {
      console.log(`Descripción cargada (${type}) para ${itemId}: ${description.substring(0, 30)}...`)
    } else {
      console.log(`No se encontró descripción (${type}) para ${itemId}`)
    }

    return description
  } catch (error) {
    console.error(`Error al cargar descripción (${type}) para ${itemId}:`, error)
    return null
  }
}

// Cargar todas las descripciones de un tipo (primero de caché, luego de localStorage)
export function loadAllDescriptions(projectId: string, type: DescriptionType): Record<string, string> {
  try {
    const cacheKey = `${type}_${projectId}`

    // Verificar si ya está en caché
    if (descriptionsCache[cacheKey]) {
      console.log(
        `Cargadas ${Object.keys(descriptionsCache[cacheKey]).length} descripciones desde caché (${type}) para proyecto ${projectId}`,
      )
      return descriptionsCache[cacheKey]
    }

    // Si no está en caché, cargar de localStorage
    const storageKey = `storynema_descriptions_${type}_${projectId}`
    const storedData = localStorage.getItem(storageKey)
    const descriptions = storedData ? JSON.parse(storedData) : {}

    // Guardar en caché para futuras consultas
    descriptionsCache[cacheKey] = descriptions

    // Log para depuración
    console.log(`Cargadas ${Object.keys(descriptions).length} descripciones (${type}) para proyecto ${projectId}`)

    return descriptions
  } catch (error) {
    console.error(`Error al cargar descripciones (${type}):`, error)
    return {}
  }
}

// Eliminar una descripción específica
export function removeDescription(projectId: string, type: DescriptionType, itemId: string): boolean {
  try {
    const descriptions = loadAllDescriptions(projectId, type)
    if (descriptions[itemId]) {
      delete descriptions[itemId]

      // Actualizar localStorage
      const storageKey = `storynema_descriptions_${type}_${projectId}`
      localStorage.setItem(storageKey, JSON.stringify(descriptions))

      // Actualizar caché
      const cacheKey = `${type}_${projectId}`
      descriptionsCache[cacheKey] = descriptions

      console.log(`Descripción eliminada (${type}) para ${itemId}`)
    }
    return true
  } catch (error) {
    console.error(`Error al eliminar descripción (${type}) para ${itemId}:`, error)
    return false
  }
}

// Migrar descripciones desde la estructura antigua a la nueva
export function migrateDescriptions(
  projectId: string,
  scenes: any[],
  existingDescriptions: Record<string, string> = {},
): void {
  try {
    // Migrar descripciones de escenas
    const sceneDescriptions: Record<string, string> = {}

    // Migrar descripciones de imágenes
    const imageDescriptions: Record<string, string> = {
      ...existingDescriptions, // Mantener las descripciones existentes
    }

    // Recorrer todas las escenas y sus imágenes
    scenes.forEach((scene) => {
      // Migrar descripción de escena si existe
      if (scene.description) {
        sceneDescriptions[scene.id] = scene.description
      }

      // Migrar descripciones de imágenes
      if (scene.images && Array.isArray(scene.images)) {
        scene.images.forEach((image) => {
          if (image.id && image.description && !imageDescriptions[image.id]) {
            imageDescriptions[image.id] = image.description
          }
        })
      }
    })

    // Guardar las descripciones migradas en localStorage
    localStorage.setItem(
      `storynema_descriptions_${DescriptionType.SCENE}_${projectId}`,
      JSON.stringify(sceneDescriptions),
    )

    localStorage.setItem(
      `storynema_descriptions_${DescriptionType.IMAGE}_${projectId}`,
      JSON.stringify(imageDescriptions),
    )

    // Actualizar la caché en memoria
    descriptionsCache[`${DescriptionType.SCENE}_${projectId}`] = sceneDescriptions
    descriptionsCache[`${DescriptionType.IMAGE}_${projectId}`] = imageDescriptions

    console.log(
      `Migración completada: ${Object.keys(sceneDescriptions).length} descripciones de escenas y ${Object.keys(imageDescriptions).length} descripciones de imágenes`,
    )
  } catch (error) {
    console.error("Error durante la migración de descripciones:", error)
  }
}

// Función para obtener la descripción con fallback a la estructura principal
export function getDescriptionWithFallback(
  projectId: string,
  type: DescriptionType,
  itemId: string,
  fallbackDescription: string | undefined | null,
): string {
  if (!itemId) {
    console.warn("Se intentó obtener descripción con ID vacío")
    return fallbackDescription || ""
  }

  try {
    // Primero intentar cargar del sistema de gestión de descripciones
    const storedDescription = loadDescription(projectId, type, itemId)

    // Si existe una descripción almacenada, usarla
    if (storedDescription) {
      return storedDescription
    }

    // Si no hay descripción almacenada pero hay un fallback, usarlo y guardarlo
    if (fallbackDescription) {
      // Guardar el fallback en el sistema para futuras consultas
      console.log(`Guardando fallback para ${itemId}: ${fallbackDescription.substring(0, 30)}...`)
      saveDescription(projectId, type, itemId, fallbackDescription)
      return fallbackDescription
    }

    // Si no hay nada, devolver cadena vacía
    return ""
  } catch (error) {
    console.error(`Error en getDescriptionWithFallback para ${itemId}:`, error)
    return fallbackDescription || ""
  }
}

// Función para exportar todas las descripciones a un archivo JSON
export function exportDescriptions(projectId: string): string {
  try {
    const sceneDescriptions = loadAllDescriptions(projectId, DescriptionType.SCENE)
    const imageDescriptions = loadAllDescriptions(projectId, DescriptionType.IMAGE)

    const exportData = {
      projectId,
      timestamp: new Date().toISOString(),
      scenes: sceneDescriptions,
      images: imageDescriptions,
    }

    return JSON.stringify(exportData, null, 2)
  } catch (error) {
    console.error("Error al exportar descripciones:", error)
    return JSON.stringify({ error: "Error al exportar descripciones" })
  }
}

// Función para importar descripciones desde un archivo JSON
export function importDescriptions(jsonData: string): boolean {
  try {
    const data = JSON.parse(jsonData)

    if (!data.projectId || (!data.scenes && !data.images)) {
      console.error("Formato de datos inválido para importación")
      return false
    }

    // Importar descripciones de escenas
    if (data.scenes) {
      const cacheKey = `${DescriptionType.SCENE}_${data.projectId}`
      descriptionsCache[cacheKey] = data.scenes
      localStorage.setItem(
        `storynema_descriptions_${DescriptionType.SCENE}_${data.projectId}`,
        JSON.stringify(data.scenes),
      )
    }

    // Importar descripciones de imágenes
    if (data.images) {
      const cacheKey = `${DescriptionType.IMAGE}_${data.projectId}`
      descriptionsCache[cacheKey] = data.images
      localStorage.setItem(
        `storynema_descriptions_${DescriptionType.IMAGE}_${data.projectId}`,
        JSON.stringify(data.images),
      )
    }

    console.log(`Importación completada para proyecto ${data.projectId}`)
    return true
  } catch (error) {
    console.error("Error al importar descripciones:", error)
    return false
  }
}

// Función para limpiar la caché de un proyecto específico
export function clearProjectCache(projectId: string): void {
  const sceneKey = `${DescriptionType.SCENE}_${projectId}`
  const imageKey = `${DescriptionType.IMAGE}_${projectId}`

  delete descriptionsCache[sceneKey]
  delete descriptionsCache[imageKey]

  console.log(`Caché limpiada para proyecto ${projectId}`)
}

// Función para precargar todas las descripciones de un proyecto
export function preloadProjectDescriptions(projectId: string, scenes: any[]): void {
  console.log(`Precargando descripciones para proyecto ${projectId}...`)

  // Cargar descripciones existentes
  loadAllDescriptions(projectId, DescriptionType.SCENE)
  loadAllDescriptions(projectId, DescriptionType.IMAGE)

  // Extraer descripciones de la estructura principal si es necesario
  const sceneDescriptions: Record<string, string> = {}
  const imageDescriptions: Record<string, string> = {}

  scenes.forEach((scene) => {
    if (scene.id && scene.description) {
      sceneDescriptions[scene.id] = scene.description
    }

    if (scene.images && Array.isArray(scene.images)) {
      scene.images.forEach((image) => {
        if (image.id && image.description) {
          imageDescriptions[image.id] = image.description
        }
      })
    }
  })

  // Actualizar caché y localStorage si hay nuevas descripciones
  if (Object.keys(sceneDescriptions).length > 0) {
    const sceneKey = `${DescriptionType.SCENE}_${projectId}`
    const existingSceneDescriptions = descriptionsCache[sceneKey] || {}

    const mergedSceneDescriptions = {
      ...existingSceneDescriptions,
      ...sceneDescriptions,
    }

    descriptionsCache[sceneKey] = mergedSceneDescriptions
    localStorage.setItem(
      `storynema_descriptions_${DescriptionType.SCENE}_${projectId}`,
      JSON.stringify(mergedSceneDescriptions),
    )
  }

  if (Object.keys(imageDescriptions).length > 0) {
    const imageKey = `${DescriptionType.IMAGE}_${projectId}`
    const existingImageDescriptions = descriptionsCache[imageKey] || {}

    const mergedImageDescriptions = {
      ...existingImageDescriptions,
      ...imageDescriptions,
    }

    descriptionsCache[imageKey] = mergedImageDescriptions
    localStorage.setItem(
      `storynema_descriptions_${DescriptionType.IMAGE}_${projectId}`,
      JSON.stringify(mergedImageDescriptions),
    )
  }

  console.log(
    `Precarga completada: ${Object.keys(sceneDescriptions).length} descripciones de escenas y ${Object.keys(imageDescriptions).length} descripciones de imágenes`,
  )
}
