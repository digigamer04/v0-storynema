"use client"

import { useEffect, useRef } from "react"
import type { Scene } from "@/types"
import { syncScriptsFromScenes, hasPendingChanges } from "@/lib/script-manager"

interface ScriptSyncManagerProps {
  projectId: string
  scenes: Scene[]
}

/**
 * Componente invisible que se encarga de sincronizar los guiones
 * con las escenas del servidor en segundo plano
 */
export function ScriptSyncManager({ projectId, scenes }: ScriptSyncManagerProps) {
  const initialSyncDoneRef = useRef(false)
  const lastSyncTimeRef = useRef(0)

  // Sincronizar guiones al cargar el componente
  useEffect(() => {
    if (!initialSyncDoneRef.current && scenes && scenes.length > 0) {
      try {
        // Sincronizar guiones desde las escenas
        syncScriptsFromScenes(projectId, scenes)
        initialSyncDoneRef.current = true
        lastSyncTimeRef.current = Date.now()

        console.log("Sincronización inicial de guiones completada")
      } catch (error) {
        console.error("Error en sincronización inicial de guiones:", error)
      }
    }
  }, [projectId, scenes])

  // Sincronizar periódicamente si hay cambios en las escenas
  useEffect(() => {
    // Solo sincronizar si ya se hizo la sincronización inicial
    // y si han pasado al menos 5 segundos desde la última sincronización
    if (initialSyncDoneRef.current && Date.now() - lastSyncTimeRef.current > 5000) {
      try {
        // Verificar si hay cambios pendientes antes de sincronizar
        if (!hasPendingChanges(projectId)) {
          syncScriptsFromScenes(projectId, scenes)
          lastSyncTimeRef.current = Date.now()
          console.log("Sincronización periódica de guiones completada")
        } else {
          console.log("Hay cambios locales pendientes, omitiendo sincronización")
        }
      } catch (error) {
        console.error("Error en sincronización periódica de guiones:", error)
      }
    }
  }, [projectId, scenes])

  // Este componente no renderiza nada visible
  return null
}

export default ScriptSyncManager
