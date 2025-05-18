"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Save, AlertCircle } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import type { Scene, ScriptScene } from "@/types"

// Importar el nuevo sistema de gestión de guiones
import {
  saveScript,
  loadScript,
  loadAllScripts,
  syncScriptsFromScenes,
  convertScriptsToScenes,
} from "@/lib/script-manager"

interface ScriptEditorIsolatedProps {
  projectId: string
  userId: string
  scenes: Scene[]
  onScenesUpdate?: (scenes: Scene[]) => void
  initialSceneId?: string
}

export function ScriptEditorIsolated({
  projectId,
  userId,
  scenes,
  onScenesUpdate,
  initialSceneId,
}: ScriptEditorIsolatedProps) {
  // Estado para los guiones
  const [scripts, setScripts] = useState<Record<string, ScriptScene>>({})
  const [activeSceneId, setActiveSceneId] = useState<string | null>(initialSceneId || null)
  const [activeScript, setActiveScript] = useState<ScriptScene | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Referencias para evitar loops
  const isInitializedRef = useRef(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSaveTimeRef = useRef<number>(0)

  // Constante para el tiempo mínimo entre guardados automáticos (ms)
  const AUTO_SAVE_DELAY = 2000

  // Inicializar y sincronizar guiones al cargar
  useEffect(() => {
    if (!isInitializedRef.current && scenes && scenes.length > 0) {
      setIsLoading(true)

      try {
        // Sincronizar guiones desde las escenas del servidor
        syncScriptsFromScenes(projectId, scenes)

        // Cargar todos los guiones
        const loadedScripts = loadAllScripts(projectId)
        setScripts(loadedScripts)

        // Establecer la escena activa
        if (initialSceneId && loadedScripts[initialSceneId]) {
          setActiveSceneId(initialSceneId)
          setActiveScript(loadedScripts[initialSceneId])
        } else if (scenes.length > 0) {
          const firstSceneId = scenes[0].id
          setActiveSceneId(firstSceneId)
          setActiveScript(loadedScripts[firstSceneId] || null)
        }

        isInitializedRef.current = true
        console.log("Editor de guiones inicializado con éxito")
      } catch (error) {
        console.error("Error al inicializar el editor de guiones:", error)
        toast({
          title: "Error al cargar guiones",
          description: "No se pudieron cargar los guiones correctamente.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
  }, [scenes, projectId, initialSceneId])

  // Cargar un guion específico
  const loadScriptById = useCallback(
    (sceneId: string) => {
      if (!sceneId) return

      try {
        const script = loadScript(projectId, sceneId)

        if (script) {
          setActiveScript(script)
          setActiveSceneId(sceneId)
          setHasUnsavedChanges(false)
        } else {
          // Si no existe, crear uno nuevo basado en la escena
          const scene = scenes.find((s) => s.id === sceneId)

          if (scene) {
            const newScript: ScriptScene = {
              id: sceneId,
              title: scene.title || "Sin título",
              content: scene.content || "",
              order_index: scene.order_index,
            }

            saveScript(projectId, sceneId, newScript)
            setActiveScript(newScript)
            setActiveSceneId(sceneId)
            setHasUnsavedChanges(false)
          }
        }
      } catch (error) {
        console.error(`Error al cargar guion (${sceneId}):`, error)
        toast({
          title: "Error al cargar guion",
          description: "No se pudo cargar el guion seleccionado.",
          variant: "destructive",
        })
      }
    },
    [projectId, scenes],
  )

  // Cambiar de escena activa
  const handleSceneChange = useCallback(
    (sceneId: string) => {
      // Si hay cambios sin guardar, guardarlos primero
      if (hasUnsavedChanges && activeScript) {
        saveScript(projectId, activeScript.id, activeScript)
      }

      loadScriptById(sceneId)
    },
    [projectId, activeScript, hasUnsavedChanges, loadScriptById],
  )

  // Actualizar el título del guion
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!activeScript) return

      const newTitle = e.target.value

      setActiveScript((prev) => {
        if (!prev) return null
        return { ...prev, title: newTitle }
      })

      setHasUnsavedChanges(true)
      scheduleAutoSave()
    },
    [activeScript],
  )

  // Actualizar el contenido del guion
  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!activeScript) return

      const newContent = e.target.value

      setActiveScript((prev) => {
        if (!prev) return null
        return { ...prev, content: newContent }
      })

      setHasUnsavedChanges(true)
      scheduleAutoSave()
    },
    [activeScript],
  )

  // Programar guardado automático
  const scheduleAutoSave = useCallback(() => {
    // Limpiar cualquier timeout existente
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Programar nuevo guardado
    saveTimeoutRef.current = setTimeout(() => {
      if (activeScript) {
        saveCurrentScript()
      }
    }, AUTO_SAVE_DELAY)
  }, [activeScript])

  // Guardar el guion actual
  const saveCurrentScript = useCallback(() => {
    if (!activeScript) return

    // Evitar guardados demasiado frecuentes
    const now = Date.now()
    if (now - lastSaveTimeRef.current < 500) {
      return
    }

    lastSaveTimeRef.current = now
    setIsSaving(true)

    try {
      // Guardar en el sistema de gestión de guiones
      saveScript(projectId, activeScript.id, activeScript)

      // Actualizar el estado local
      setScripts((prev) => ({
        ...prev,
        [activeScript.id]: { ...activeScript },
      }))

      setHasUnsavedChanges(false)

      // Notificar cambios si es necesario
      if (onScenesUpdate) {
        const updatedScenes = convertScriptsToScenes(projectId)
        onScenesUpdate(updatedScenes)
      }

      // Mostrar notificación de éxito
      toast({
        title: "Guardado",
        description: "El guion se ha guardado correctamente.",
      })
    } catch (error) {
      console.error("Error al guardar guion:", error)
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar el guion.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }, [activeScript, projectId, onScenesUpdate])

  // Guardar manualmente
  const handleSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }

    saveCurrentScript()
  }, [saveCurrentScript])

  // Limpiar timeouts al desmontar
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Si está cargando, mostrar indicador
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Si no hay escenas, mostrar mensaje
  if (!scenes || scenes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <AlertCircle className="h-12 w-12 text-yellow-500" />
        <p className="text-lg text-gray-500">No hay escenas disponibles.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-4">
      {/* Selector de escenas */}
      <div className="flex flex-wrap gap-2 mb-4">
        {scenes.map((scene) => (
          <Button
            key={scene.id}
            variant={activeSceneId === scene.id ? "default" : "outline"}
            onClick={() => handleSceneChange(scene.id)}
            className="text-sm"
          >
            {scene.title || `Escena ${scene.order_index + 1}`}
          </Button>
        ))}
      </div>

      {/* Editor de guion */}
      {activeScript ? (
        <Card className="p-4">
          <div className="space-y-4">
            {/* Título */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Título
              </label>
              <Input
                id="title"
                value={activeScript.title || ""}
                onChange={handleTitleChange}
                placeholder="Título de la escena"
              />
            </div>

            {/* Contenido */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                Contenido
              </label>
              <Textarea
                id="content"
                value={activeScript.content || ""}
                onChange={handleContentChange}
                placeholder="Escribe el contenido de la escena aquí..."
                className="min-h-[300px] font-mono"
              />
            </div>

            {/* Botones de acción */}
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">{hasUnsavedChanges ? "Cambios sin guardar" : "Guardado"}</div>

              <Button onClick={handleSave} disabled={isSaving || !hasUnsavedChanges} className="flex items-center">
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <p className="text-lg text-gray-500">Selecciona una escena para editar.</p>
        </div>
      )}

      {/* Indicador de guardado automático */}
      {isSaving && (
        <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded-md flex items-center shadow-md z-50">
          <Save className="h-4 w-4 mr-2" />
          <span>Guardando...</span>
        </div>
      )}
    </div>
  )
}

export default ScriptEditorIsolated
