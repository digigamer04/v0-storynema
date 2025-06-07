// Administrador para trabajar sin conexión y sincronizar cambios

interface OfflineChange {
  id: string
  type: "create" | "update" | "delete"
  entity: "scene" | "project"
  data: any
  timestamp: number
  projectId: string
}

class OfflineManager {
  private static instance: OfflineManager
  private pendingChanges: OfflineChange[] = []
  private isOnline: boolean = navigator.onLine
  private syncInProgress = false

  private constructor() {
    this.loadPendingChanges()
    this.setupOnlineListener()
  }

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager()
    }
    return OfflineManager.instance
  }

  private setupOnlineListener() {
    window.addEventListener("online", () => {
      this.isOnline = true
      this.syncPendingChanges()
    })

    window.addEventListener("offline", () => {
      this.isOnline = false
    })
  }

  private loadPendingChanges() {
    try {
      const saved = localStorage.getItem("storynema_offline_changes")
      if (saved) {
        this.pendingChanges = JSON.parse(saved)
      }
    } catch (error) {
      console.error("Error loading pending changes:", error)
    }
  }

  private savePendingChanges() {
    try {
      localStorage.setItem("storynema_offline_changes", JSON.stringify(this.pendingChanges))
    } catch (error) {
      console.error("Error saving pending changes:", error)
    }
  }

  // Añadir un cambio para sincronizar más tarde
  addPendingChange(change: Omit<OfflineChange, "id" | "timestamp">) {
    const fullChange: OfflineChange = {
      ...change,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
    }

    this.pendingChanges.push(fullChange)
    this.savePendingChanges()

    // Si estamos online, intentar sincronizar inmediatamente
    if (this.isOnline && !this.syncInProgress) {
      this.syncPendingChanges()
    }
  }

  // Sincronizar cambios pendientes
  async syncPendingChanges() {
    if (this.syncInProgress || this.pendingChanges.length === 0) {
      return
    }

    this.syncInProgress = true

    try {
      const changesToSync = [...this.pendingChanges]

      for (const change of changesToSync) {
        try {
          await this.syncSingleChange(change)
          // Remover el cambio exitoso de la lista
          this.pendingChanges = this.pendingChanges.filter((c) => c.id !== change.id)
        } catch (error) {
          console.error("Error syncing change:", error)
          // Si es un error de autenticación, detener la sincronización
          if (error.message.includes("auth") || error.message.includes("401")) {
            break
          }
        }
      }

      this.savePendingChanges()
    } finally {
      this.syncInProgress = false
    }
  }

  // Modificar syncSingleChange para manejar eliminaciones
  private async syncSingleChange(change: OfflineChange) {
    const { authenticatedFetch } = await import("./auth")

    switch (change.entity) {
      case "scene":
        if (change.type === "create") {
          await authenticatedFetch(`/api/projects/${change.projectId}/scenes`, {
            method: "POST",
            body: JSON.stringify(change.data),
          })
        } else if (change.type === "update") {
          await authenticatedFetch(`/api/scenes/${change.data.id}`, {
            method: "PUT",
            body: JSON.stringify(change.data),
          })
        } else if (change.type === "delete") {
          await authenticatedFetch(`/api/scenes/${change.data.id}`, {
            method: "DELETE",
          })
        }
        break

      case "project":
        if (change.type === "update") {
          await authenticatedFetch(`/api/projects/${change.data.id}`, {
            method: "PUT",
            body: JSON.stringify(change.data),
          })
        }
        break
    }
  }

  // Verificar si hay cambios pendientes
  hasPendingChanges(): boolean {
    return this.pendingChanges.length > 0
  }

  // Obtener el estado de conexión
  getOnlineStatus(): boolean {
    return this.isOnline
  }

  // Limpiar cambios pendientes (usar con cuidado)
  clearPendingChanges() {
    this.pendingChanges = []
    this.savePendingChanges()
  }
}

export default OfflineManager
