/**
 * Utilidades para garantizar el aislamiento de datos entre proyectos
 */

// Función para limpiar datos de localStorage de proyectos anteriores
export function cleanupProjectData(currentProjectId: string) {
  try {
    console.log(`Limpiando datos de localStorage para proyectos que no sean ${currentProjectId}`)

    // Obtener todas las claves de localStorage
    const allKeys = Object.keys(localStorage)

    // Filtrar las claves que pertenecen a Storynema pero no al proyecto actual
    const keysToRemove = allKeys.filter((key) => {
      // Solo procesar claves de Storynema
      if (!key.startsWith("storynema_")) return false

      // Mantener claves globales que no están asociadas a ningún proyecto específico
      if (!key.includes("_project_") && !key.includes("_scenes_")) return false

      // Mantener claves del proyecto actual
      if (key.includes(`_${currentProjectId}`)) return false

      // Eliminar claves de otros proyectos
      return true
    })

    // Eliminar las claves identificadas
    keysToRemove.forEach((key) => {
      localStorage.removeItem(key)
      console.log(`Eliminada clave de localStorage: ${key}`)
    })

    console.log(`Se eliminaron ${keysToRemove.length} claves de localStorage de otros proyectos`)
  } catch (error) {
    console.error("Error al limpiar datos de localStorage:", error)
  }
}

// Función para guardar datos específicos de un proyecto
export function saveProjectData(projectId: string, key: string, data: any) {
  try {
    const projectKey = `storynema_${key}_${projectId}`
    localStorage.setItem(projectKey, JSON.stringify(data))
    return true
  } catch (error) {
    console.error(`Error al guardar datos para el proyecto ${projectId}:`, error)
    return false
  }
}

// Función para cargar datos específicos de un proyecto
export function loadProjectData(projectId: string, key: string) {
  try {
    const projectKey = `storynema_${key}_${projectId}`
    const data = localStorage.getItem(projectKey)
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.error(`Error al cargar datos para el proyecto ${projectId}:`, error)
    return null
  }
}

// Función para eliminar datos específicos de un proyecto
export function removeProjectData(projectId: string, key: string) {
  try {
    const projectKey = `storynema_${key}_${projectId}`
    localStorage.removeItem(projectKey)
    return true
  } catch (error) {
    console.error(`Error al eliminar datos para el proyecto ${projectId}:`, error)
    return false
  }
}
