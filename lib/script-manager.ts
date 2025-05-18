/**
 * Sistema de gestión de guiones independiente del storyboard
 * Mantiene los textos de los guiones aislados y persistentes
 */

import type { Scene, ScriptScene } from "@/types"

// Tipos de operaciones para el registro de cambios
enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
}

// Interfaz para el registro de cambios
interface ChangeLog {
  timestamp: number
  operation: OperationType
  sceneId: string
  data?: any
}

// Caché en memoria para los guiones
const scriptsCache: Record<string, Record<string, ScriptScene>> = {}

// Registro de cambios para seguimiento
const changeLog: Record<string, ChangeLog[]> = {}

// Límite de entradas en el registro de cambios
const CHANGE_LOG_LIMIT = 100

/**
 * Guarda un guion en la caché y localStorage
 */
export function saveScript(projectId: string, sceneId: string, scriptData: Partial<ScriptScene>): boolean {
  try {
    // Inicializar la caché del proyecto si no existe
    if (!scriptsCache[projectId]) {
      scriptsCache[projectId] = {}
    }

    // Obtener el guion existente o crear uno nuevo
    const existingScript = scriptsCache[projectId][sceneId] || {
      id: sceneId,
      title: "",
      content: "",
    }

    // Crear el guion actualizado
    const updatedScript: ScriptScene = {
      ...existingScript,
      ...scriptData,
      // Asegurar que estos campos siempre estén presentes
      id: sceneId,
      title: scriptData.title || existingScript.title || "Sin título",
    }

    // Guardar en caché
    scriptsCache[projectId][sceneId] = updatedScript

    // Guardar en localStorage
    const storageKey = `storynema_script_${projectId}_${sceneId}`
    localStorage.setItem(storageKey, JSON.stringify(updatedScript))

    // Registrar el cambio
    logChange(projectId, OperationType.UPDATE, sceneId, updatedScript)

    // Actualizar el timestamp de la última modificación
    localStorage.setItem(`storynema_scripts_last_modified_${projectId}`, Date.now().toString())

    return true
  } catch (error) {
    console.error(`Error al guardar guion (${sceneId}):`, error)
    return false
  }
}

/**
 * Carga un guion específico desde caché o localStorage
 * Siempre devuelve un objeto, incluso si no existe
 */
export function loadScript(projectId: string, sceneId: string): ScriptScene {
  try {
    // Verificar si está en caché
    if (scriptsCache[projectId] && scriptsCache[projectId][sceneId]) {
      return scriptsCache[projectId][sceneId]
    }

    // Si no está en caché, intentar cargar de localStorage
    const storageKey = `storynema_script_${projectId}_${sceneId}`
    const storedData = localStorage.getItem(storageKey)

    if (storedData) {
      const scriptData = JSON.parse(storedData) as ScriptScene

      // Guardar en caché para futuras consultas
      if (!scriptsCache[projectId]) {
        scriptsCache[projectId] = {}
      }
      scriptsCache[projectId][sceneId] = scriptData

      return scriptData
    }

    // Si no existe, crear un objeto vacío
    const emptyScript: ScriptScene = {
      id: sceneId,
      title: "Sin título",
      content: "",
    }

    // Guardar en caché para futuras consultas
    if (!scriptsCache[projectId]) {
      scriptsCache[projectId] = {}
    }
    scriptsCache[projectId][sceneId] = emptyScript

    return emptyScript
  } catch (error) {
    console.error(`Error al cargar guion (${sceneId}):`, error)

    // En caso de error, devolver un objeto vacío
    return {
      id: sceneId,
      title: "Error al cargar",
      content: "",
    }
  }
}

/**
 * Carga todos los guiones de un proyecto
 */
export function loadAllScripts(projectId: string): Record<string, ScriptScene> {
  try {
    // Verificar si ya están todos en caché
    if (scriptsCache[projectId]) {
      return { ...scriptsCache[projectId] }
    }

    // Inicializar la caché del proyecto
    scriptsCache[projectId] = {}

    // Buscar todos los guiones en localStorage
    const scripts: Record<string, ScriptScene> = {}
    const prefix = `storynema_script_${projectId}_`

    // Recorrer localStorage buscando guiones de este proyecto
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(prefix)) {
        try {
          const sceneId = key.substring(prefix.length)
          const scriptData = JSON.parse(localStorage.getItem(key) || "null") as ScriptScene

          if (scriptData && scriptData.id) {
            scripts[sceneId] = scriptData
            scriptsCache[projectId][sceneId] = scriptData
          }
        } catch (e) {
          console.warn(`Error al procesar guion en localStorage: ${key}`, e)
        }
      }
    }

    return scripts
  } catch (error) {
    console.error(`Error al cargar todos los guiones:`, error)
    return {}
  }
}

/**
 * Elimina un guion específico
 */
export function deleteScript(projectId: string, sceneId: string): boolean {
  try {
    // Eliminar de la caché
    if (scriptsCache[projectId] && scriptsCache[projectId][sceneId]) {
      delete scriptsCache[projectId][sceneId]
    }

    // Eliminar de localStorage
    const storageKey = `storynema_script_${projectId}_${sceneId}`
    localStorage.removeItem(storageKey)

    // Registrar el cambio
    logChange(projectId, OperationType.DELETE, sceneId)

    // Actualizar el timestamp de la última modificación
    localStorage.setItem(`storynema_scripts_last_modified_${projectId}`, Date.now().toString())

    return true
  } catch (error) {
    console.error(`Error al eliminar guion (${sceneId}):`, error)
    return false
  }
}

/**
 * Sincroniza los guiones desde las escenas del servidor
 * pero mantiene las modificaciones locales más recientes
 */
export function syncScriptsFromScenes(projectId: string, scenes: Scene[]): void {
  try {
    // Cargar todos los guiones existentes
    const existingScripts = loadAllScripts(projectId)

    // Obtener el timestamp de la última modificación local
    const lastModifiedStr = localStorage.getItem(`storynema_scripts_last_modified_${projectId}`)
    const lastModified = lastModifiedStr ? Number.parseInt(lastModifiedStr) : 0

    // Obtener el timestamp de la última sincronización
    const lastSyncStr = localStorage.getItem(`storynema_scripts_last_sync_${projectId}`)
    const lastSync = lastSyncStr ? Number.parseInt(lastSyncStr) : 0

    // Si no hay modificaciones locales después de la última sincronización,
    // o si es la primera sincronización, actualizar todo
    const forceUpdate = lastSync === 0 || lastModified <= lastSync

    // Procesar cada escena
    scenes.forEach((scene) => {
      const sceneId = scene.id
      const existingScript = existingScripts[sceneId]

      // Si no existe localmente o si debemos forzar la actualización
      if (!existingScript || forceUpdate) {
        // Crear un nuevo guion basado en la escena
        const newScript: ScriptScene = {
          id: sceneId,
          title: scene.title || "Sin título",
          content: scene.content || "",
          order_index: scene.order_index,
          // Otros campos que puedan ser relevantes
        }

        // Guardar el nuevo guion
        saveScript(projectId, sceneId, newScript)
      }
    })

    // Actualizar el timestamp de la última sincronización
    localStorage.setItem(`storynema_scripts_last_sync_${projectId}`, Date.now().toString())

    console.log(`Sincronización de guiones completada para proyecto ${projectId}`)
  } catch (error) {
    console.error(`Error al sincronizar guiones desde escenas:`, error)
  }
}

/**
 * Convierte los guiones a escenas para enviar al servidor
 */
export function convertScriptsToScenes(projectId: string): Scene[] {
  try {
    const scripts = loadAllScripts(projectId)

    return Object.values(scripts).map((script) => ({
      id: script.id,
      project_id: projectId,
      title: script.title || "Sin título",
      content: script.content || "",
      order_index: script.order_index || 0,
      // Otros campos necesarios para la API
    }))
  } catch (error) {
    console.error(`Error al convertir guiones a escenas:`, error)
    return []
  }
}

/**
 * Registra un cambio en el log
 */
function logChange(projectId: string, operation: OperationType, sceneId: string, data?: any): void {
  if (!changeLog[projectId]) {
    changeLog[projectId] = []
  }

  // Añadir el nuevo cambio al principio
  changeLog[projectId].unshift({
    timestamp: Date.now(),
    operation,
    sceneId,
    data,
  })

  // Limitar el tamaño del log
  if (changeLog[projectId].length > CHANGE_LOG_LIMIT) {
    changeLog[projectId] = changeLog[projectId].slice(0, CHANGE_LOG_LIMIT)
  }
}

/**
 * Obtiene el registro de cambios
 */
export function getChangeLog(projectId: string): ChangeLog[] {
  return changeLog[projectId] || []
}

/**
 * Limpia la caché de un proyecto específico
 */
export function clearProjectCache(projectId: string): void {
  delete scriptsCache[projectId]
  delete changeLog[projectId]
  console.log(`Caché de guiones limpiada para proyecto ${projectId}`)
}

/**
 * Verifica si hay cambios locales pendientes
 */
export function hasPendingChanges(projectId: string): boolean {
  // Obtener el timestamp de la última modificación local
  const lastModifiedStr = localStorage.getItem(`storynema_scripts_last_modified_${projectId}`)
  const lastModified = lastModifiedStr ? Number.parseInt(lastModifiedStr) : 0

  // Obtener el timestamp de la última sincronización
  const lastSyncStr = localStorage.getItem(`storynema_scripts_last_sync_${projectId}`)
  const lastSync = lastSyncStr ? Number.parseInt(lastSyncStr) : 0

  // Hay cambios pendientes si la última modificación es posterior a la última sincronización
  return lastModified > lastSync
}

/**
 * Exporta todos los guiones a un archivo JSON
 */
export function exportScripts(projectId: string): string {
  try {
    const scripts = loadAllScripts(projectId)

    const exportData = {
      projectId,
      timestamp: new Date().toISOString(),
      scripts: Object.values(scripts),
    }

    return JSON.stringify(exportData, null, 2)
  } catch (error) {
    console.error(`Error al exportar guiones:`, error)
    return JSON.stringify({ error: "Error al exportar guiones" })
  }
}

/**
 * Importa guiones desde un archivo JSON
 */
export function importScripts(jsonData: string): boolean {
  try {
    const data = JSON.parse(jsonData)

    if (!data.projectId || !data.scripts || !Array.isArray(data.scripts)) {
      console.error("Formato de datos inválido para importación de guiones")
      return false
    }

    const projectId = data.projectId

    // Importar cada guion
    data.scripts.forEach((script: ScriptScene) => {
      if (script.id) {
        saveScript(projectId, script.id, script)
      }
    })

    // Actualizar timestamps
    const now = Date.now()
    localStorage.setItem(`storynema_scripts_last_modified_${projectId}`, now.toString())
    localStorage.setItem(`storynema_scripts_last_sync_${projectId}`, now.toString())

    console.log(`Importación de guiones completada para proyecto ${projectId}`)
    return true
  } catch (error) {
    console.error(`Error al importar guiones:`, error)
    return false
  }
}

/**
 * Obtiene un guion por índice
 */
export function getScriptByIndex(projectId: string, index: number): ScriptScene | null {
  try {
    const scripts = loadAllScripts(projectId)
    const scriptIds = Object.keys(scripts)

    if (index >= 0 && index < scriptIds.length) {
      const sceneId = scriptIds[index]
      return scripts[sceneId]
    }

    return null
  } catch (error) {
    console.error(`Error al obtener guion por índice (${index}):`, error)
    return null
  }
}

/**
 * Obtiene el índice de un guion por ID
 */
export function getScriptIndexById(projectId: string, sceneId: string): number {
  try {
    const scripts = loadAllScripts(projectId)
    const scriptIds = Object.keys(scripts)

    return scriptIds.indexOf(sceneId)
  } catch (error) {
    console.error(`Error al obtener índice de guion (${sceneId}):`, error)
    return -1
  }
}

/**
 * Fuerza la sincronización de un guion específico desde una escena
 */
export function forceScriptSync(projectId: string, scene: Scene): boolean {
  try {
    const newScript: ScriptScene = {
      id: scene.id,
      title: scene.title || "Sin título",
      content: scene.content || "",
      order_index: scene.order_index,
    }

    return saveScript(projectId, scene.id, newScript)
  } catch (error) {
    console.error(`Error al forzar sincronización de guion (${scene.id}):`, error)
    return false
  }
}
