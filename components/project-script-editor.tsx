"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Save, FileText } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import type { Scene } from "@/types"

// Importar el editor de guiones aislado
import ScriptEditorIsolated from "./script-editor-isolated"

// Importar funciones para sincronizar con el servidor
import { saveScenes } from "@/lib/projects"
import { convertScriptsToScenes } from "@/lib/script-manager"

interface ProjectScriptEditorProps {
  projectId: string
  userId: string
  scenes: Scene[]
  onScenesUpdate?: (scenes: Scene[]) => void
}

export function ProjectScriptEditor({ projectId, userId, scenes, onScenesUpdate }: ProjectScriptEditorProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [localScenes, setLocalScenes] = useState<Scene[]>([])

  // Cargar escenas al inicio
  useEffect(() => {
    if (scenes && scenes.length > 0) {
      setLocalScenes(scenes)
      setIsLoading(false)
    }
  }, [scenes])

  // Manejar actualizaciones locales de escenas
  const handleLocalScenesUpdate = (updatedScenes: Scene[]) => {
    setLocalScenes(updatedScenes)

    // Notificar al componente padre si es necesario
    if (onScenesUpdate) {
      onScenesUpdate(updatedScenes)
    }
  }

  // Guardar escenas en el servidor
  const handleSaveToServer = async () => {
    setIsSaving(true)

    try {
      // Convertir guiones a escenas
      const scenesToSave = convertScriptsToScenes(projectId)

      // Guardar en el servidor
      await saveScenes(projectId, scenesToSave)

      toast({
        title: "Guardado en servidor",
        description: "Los guiones se han guardado correctamente en el servidor.",
      })

      // Actualizar escenas locales
      setLocalScenes(scenesToSave)

      // Notificar al componente padre
      if (onScenesUpdate) {
        onScenesUpdate(scenesToSave)
      }
    } catch (error) {
      console.error("Error al guardar en el servidor:", error)
      toast({
        title: "Error al guardar",
        description: "No se pudieron guardar los guiones en el servidor.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Si está cargando, mostrar indicador
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl">Editor de Guiones</CardTitle>
        <Button onClick={handleSaveToServer} disabled={isSaving} className="flex items-center">
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar en Servidor
            </>
          )}
        </Button>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="editor" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="editor" className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Editor de Guiones
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="space-y-4">
            <ScriptEditorIsolated
              projectId={projectId}
              userId={userId}
              scenes={localScenes}
              onScenesUpdate={handleLocalScenesUpdate}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default ProjectScriptEditor
