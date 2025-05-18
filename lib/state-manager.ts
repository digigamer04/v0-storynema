/**
 * Administrador de estado centralizado para Storynema
 * Este servicio garantiza la sincronización entre el editor de guiones y el storyboard
 */

// Tipo para los eventos de cambio de estado
type StateChangeListener = (newState: any) => void

// Clase para gestionar el estado global de la aplicación
class StateManager {
  private static instance: StateManager
  private state: Record<string, any> = {}
  private listeners: Record<string, StateChangeListener[]> = {}
  private persistenceEnabled = true

  private constructor() {
    // Constructor privado para singleton
    this.loadStateFromStorage()

    // Escuchar eventos de almacenamiento para sincronización entre pestañas
    if (typeof window !== "undefined") {
      window.addEventListener("storage", this.handleStorageChange)
    }
  }

  // Obtener la instancia única
  public static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager()
    }
    return StateManager.instance
  }

  // Cargar el estado desde localStorage
  private loadStateFromStorage(): void {
    if (typeof window === "undefined") return

    try {
      const savedState = localStorage.getItem("storynema_global_state")
      if (savedState) {
        this.state = JSON.parse(savedState)
        console.log("Estado global cargado desde localStorage:", Object.keys(this.state))
      }
    } catch (error) {
      console.error("Error al cargar el estado desde localStorage:", error)
    }
  }

  // Guardar el estado en localStorage
  private saveStateToStorage(): void {
    if (typeof window === "undefined" || !this.persistenceEnabled) return

    try {
      // Usar un enfoque más robusto para guardar el estado
      const stateToSave = JSON.stringify(this.state)
      const currentState = localStorage.getItem("storynema_global_state")

      // Solo guardar si hay cambios reales para evitar loops
      if (stateToSave !== currentState) {
        localStorage.setItem("storynema_global_state", stateToSave)
      }
    } catch (error) {
      console.error("Error al guardar el estado en localStorage:", error)
      // Intentar limpiar el almacenamiento si está lleno
      try {
        localStorage.removeItem("storynema_global_state")
        localStorage.setItem("storynema_global_state", JSON.stringify({}))
      } catch (e) {
        console.error("No se pudo recuperar del error de almacenamiento:", e)
      }
    }
  }

  // Manejar cambios en localStorage desde otras pestañas
  private handleStorageChange = (event: StorageEvent): void => {
    if (event.key === "storynema_global_state" && event.newValue && event.newValue !== event.oldValue) {
      try {
        const newState = JSON.parse(event.newValue)

        // Verificar si el estado es diferente antes de actualizar
        if (JSON.stringify(this.state) !== event.newValue) {
          this.state = newState

          // Notificar a todos los listeners sobre el cambio
          Object.keys(this.listeners).forEach((key) => {
            if (this.state[key] !== undefined) {
              this.listeners[key].forEach((listener) => listener(this.state[key]))
            }
          })
        }
      } catch (error) {
        console.error("Error al procesar cambios de almacenamiento:", error)
      }
    }
  }

  // Obtener un valor del estado
  public getState<T>(key: string, projectId: string): T | null {
    const fullKey = `${key}_${projectId}`
    return (this.state[fullKey] as T) || null
  }

  // Establecer un valor en el estado
  public setState<T>(key: string, projectId: string, value: T): void {
    const fullKey = `${key}_${projectId}`
    this.state[fullKey] = value

    // Notificar a los listeners
    if (this.listeners[fullKey]) {
      this.listeners[fullKey].forEach((listener) => listener(value))
    }

    // Persistir el cambio
    this.saveStateToStorage()

    // También guardar en localStorage específico para mayor redundancia
    if (typeof window !== "undefined" && this.persistenceEnabled) {
      try {
        localStorage.setItem(`storynema_${key}_${projectId}`, JSON.stringify(value))
      } catch (error) {
        console.error(`Error al guardar ${key} en localStorage:`, error)
      }
    }
  }

  // Suscribirse a cambios en una clave específica
  public subscribe(key: string, projectId: string, listener: StateChangeListener): () => void {
    const fullKey = `${key}_${projectId}`

    if (!this.listeners[fullKey]) {
      this.listeners[fullKey] = []
    }

    this.listeners[fullKey].push(listener)

    // Devolver función para cancelar la suscripción
    return () => {
      this.listeners[fullKey] = this.listeners[fullKey].filter((l) => l !== listener)
    }
  }

  // Limpiar el estado para un proyecto específico
  public clearProjectState(projectId: string): void {
    // Desactivar persistencia temporalmente para evitar múltiples escrituras
    this.persistenceEnabled = false

    // Eliminar todas las claves relacionadas con este proyecto
    Object.keys(this.state).forEach((key) => {
      if (key.endsWith(`_${projectId}`)) {
        delete this.state[key]
      }
    })

    // Reactivar persistencia y guardar
    this.persistenceEnabled = true
    this.saveStateToStorage()

    // Limpiar también localStorage específico
    if (typeof window !== "undefined") {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("storynema_") && key.includes(projectId)) {
          localStorage.removeItem(key)
        }
      })
    }

    console.log(`Estado limpiado para el proyecto ${projectId}`)
  }
}

// Exportar la instancia única
export const stateManager = StateManager.getInstance()

// Funciones de utilidad para escenas
export function saveScenes(projectId: string, scenes: any[]): void {
  // Asegurar que las escenas estén ordenadas por order_index
  const sortedScenes = [...scenes].sort((a, b) => {
    if (a.order_index !== undefined && b.order_index !== undefined) {
      return a.order_index - b.order_index
    }
    return 0
  })

  stateManager.setState("scenes", projectId, sortedScenes)

  // También guardar en localStorage con timestamp para mejor sincronización
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`storynema_scenes_${projectId}`, JSON.stringify(sortedScenes))
      localStorage.setItem(`storynema_last_update_time_${projectId}`, Date.now().toString())
      localStorage.setItem(`storynema_last_update_source_${projectId}`, "state_manager")
    } catch (error) {
      console.error(`Error al guardar escenas en localStorage:`, error)
    }
  }
}

export function getScenes(projectId: string): any[] {
  return stateManager.getState<any[]>("scenes", projectId) || []
}

export function subscribeToScenes(projectId: string, listener: (scenes: any[]) => void): () => void {
  return stateManager.subscribe("scenes", projectId, listener)
}

// Funciones de utilidad para el storyboard
export function saveStoryboardData(projectId: string, data: any): void {
  stateManager.setState("storyboard_data", projectId, data)
}

export function getStoryboardData(projectId: string): any {
  return stateManager.getState<any>("storyboard_data", projectId) || null
}

export function subscribeToStoryboardData(projectId: string, listener: (data: any) => void): () => void {
  return stateManager.subscribe("storyboard_data", projectId, listener)
}

// Funciones de utilidad para el índice de escena activa
export function saveActiveSceneIndex(projectId: string, index: number): void {
  stateManager.setState("active_scene_index", projectId, index)
}

export function getActiveSceneIndex(projectId: string): number {
  return stateManager.getState<number>("active_scene_index", projectId) || 0
}

export function subscribeToActiveSceneIndex(projectId: string, listener: (index: number) => void): () => void {
  return stateManager.subscribe("active_scene_index", projectId, listener)
}
