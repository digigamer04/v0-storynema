"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Lock, FileText, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import type { Scene, ScriptScene } from "@/types"

// Importar funciones del sistema hermético
import { loadScript, loadAllScripts } from "@/lib/script-manager"

interface HermeticScriptViewerProps {
  projectId: string
  activeSceneId?: string
  activeSceneIndex?: number
  onSceneChange?: (sceneIndex: number) => void
  scenes?: Scene[]
}

export function HermeticScriptViewer({
  projectId,
  activeSceneId,
  activeSceneIndex = 0,
  onSceneChange,
  scenes = [],
}: HermeticScriptViewerProps) {
  // Estado para el guion actual
  const [currentScript, setCurrentScript] = useState<ScriptScene | null>(null)
  const [localSceneIndex, setLocalSceneIndex] = useState(activeSceneIndex)
  const [isLoading, setIsLoading] = useState(true)
  const [allScripts, setAllScripts] = useState<Record<string, ScriptScene>>({})
  const [scriptIds, setScriptIds] = useState<string[]>([])

  // Referencias para evitar loops
  const initialLoadDoneRef = useRef(false)
  const activeSceneIndexRef = useRef(activeSceneIndex)
  const activeSceneIdRef = useRef(activeSceneId)

  // Cargar todos los guiones al inicio
  useEffect(() => {
    if (!initialLoadDoneRef.current) {
      setIsLoading(true)
      try {
        // Cargar todos los guiones del proyecto
        const scripts = loadAllScripts(projectId)
        setAllScripts(scripts)

        // Crear un array con los IDs de los guiones
        const ids = Object.keys(scripts)
        setScriptIds(ids)

        // Si hay escenas proporcionadas, usarlas para ordenar los guiones
        if (scenes && scenes.length > 0) {
          const orderedIds = scenes.map((scene) => scene.id)
          setScriptIds(orderedIds)
        }

        initialLoadDoneRef.current = true
      } catch (error) {
        console.error("Error al cargar guiones:", error)
        toast({
          title: "Error al cargar guiones",
          description: "No se pudieron cargar los guiones correctamente.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
  }, [projectId, scenes])

  // Actualizar el guion actual cuando cambia el índice de escena activa
  useEffect(() => {
    if (activeSceneIndex !== activeSceneIndexRef.current) {
      activeSceneIndexRef.current = activeSceneIndex
      setLocalSceneIndex(activeSceneIndex)
    }
  }, [activeSceneIndex])

  // Actualizar el guion actual cuando cambia el ID de escena activa
  useEffect(() => {
    if (activeSceneId !== activeSceneIdRef.current) {
      activeSceneIdRef.current = activeSceneId

      // Cargar el guion específico
      if (activeSceneId) {
        try {
          const script = loadScript(projectId, activeSceneId)
          if (script) {
            setCurrentScript(script)
          }
        } catch (error) {
          console.error(`Error al cargar guion (${activeSceneId}):`, error)
        }
      }
    }
  }, [activeSceneId, projectId])

  // Cargar el guion actual basado en el índice local
  useEffect(() => {
    if (scriptIds.length > 0 && localSceneIndex >= 0 && localSceneIndex < scriptIds.length) {
      const sceneId = scriptIds[localSceneIndex]

      try {
        const script = loadScript(projectId, sceneId)
        if (script) {
          setCurrentScript(script)
        } else if (scenes && scenes[localSceneIndex]) {
          // Si no hay guion pero hay escena, usar los datos de la escena
          const scene = scenes[localSceneIndex]
          setCurrentScript({
            id: scene.id,
            title: scene.title || "Sin título",
            content: scene.content || "",
          })
        }
      } catch (error) {
        console.error(`Error al cargar guion (${sceneId}):`, error)
      }
    }
  }, [localSceneIndex, scriptIds, projectId, scenes])

  // Navegar a la escena anterior
  const goToPreviousScene = () => {
    if (localSceneIndex > 0) {
      const newIndex = localSceneIndex - 1
      setLocalSceneIndex(newIndex)

      // Notificar al componente padre
      if (onSceneChange) {
        onSceneChange(newIndex)
      }
    }
  }

  // Navegar a la siguiente escena
  const goToNextScene = () => {
    if (localSceneIndex < scriptIds.length - 1) {
      const newIndex = localSceneIndex + 1
      setLocalSceneIndex(newIndex)

      // Notificar al componente padre
      if (onSceneChange) {
        onSceneChange(newIndex)
      }
    }
  }

  // Si está cargando, mostrar indicador
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32 bg-gray-800 rounded-md">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    )
  }

  // Si no hay guion actual, mostrar mensaje
  if (!currentScript) {
    return (
      <div className="flex flex-col items-center justify-center p-4 bg-gray-800 rounded-md">
        <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
        <p className="text-gray-300 text-center">No hay guion disponible para esta escena.</p>
      </div>
    )
  }

  return (
    <Card className="w-full bg-gray-800 border-gray-700 shadow-lg">
      <CardHeader className="bg-gray-900 border-b border-gray-700 flex flex-row items-center justify-between py-2 px-4">
        <div className="flex items-center">
          <Lock className="h-4 w-4 text-amber-500 mr-2" />
          <CardTitle className="text-sm font-medium text-gray-200">Guion Hermético</CardTitle>
        </div>
        <Badge variant="outline" className="bg-amber-900/30 text-amber-400 border-amber-700 text-xs">
          <FileText className="h-3 w-3 mr-1" />
          Solo lectura
        </Badge>
      </CardHeader>

      <CardContent className="p-3 space-y-3">
        {/* Título del guion */}
        <div className="bg-gray-900 rounded-md p-2">
          <p className="text-xs text-gray-400 mb-1">Título:</p>
          <Input
            value={currentScript.title || ""}
            readOnly
            className="bg-gray-800 border-gray-700 text-gray-200 text-sm"
          />
        </div>

        {/* Contenido del guion */}
        <div className="bg-gray-900 rounded-md p-2">
          <p className="text-xs text-gray-400 mb-1">Contenido:</p>
          <Textarea
            value={currentScript.content || ""}
            readOnly
            className="bg-gray-800 border-gray-700 text-gray-200 text-sm min-h-[120px] font-mono"
          />
        </div>

        {/* Navegación entre escenas */}
        <div className="flex justify-between items-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousScene}
            disabled={localSceneIndex <= 0}
            className="bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-gray-100"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>

          <span className="text-xs text-gray-400">
            Escena {localSceneIndex + 1} de {scriptIds.length}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={goToNextScene}
            disabled={localSceneIndex >= scriptIds.length - 1}
            className="bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-gray-100"
          >
            Siguiente
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default HermeticScriptViewer
