"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText } from "lucide-react"
import type { Scene } from "@/types"

// Importar el editor de guiones aislado
import ScriptEditorIsolated from "./script-editor-isolated"

interface ProjectScriptEditorProps {
  projectId: string
  userId: string
  scenes: Scene[]
  onScenesUpdate?: (scenes: Scene[]) => void
}

export function ProjectScriptEditor({ projectId, userId, scenes, onScenesUpdate }: ProjectScriptEditorProps) {
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
