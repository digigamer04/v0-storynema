"use client"

import { useState, useEffect, useCallback } from "react"
import { ScriptEditor } from "@/components/script-editor"
import { StoryboardEditor } from "@/components/storyboard-editor"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Scene } from "@/types/scene"
import type { StoryboardScene } from "@/types/storyboard"
import { v4 as uuidv4 } from "uuid"
import SyncService from "@/services/sync-service"
import { useToast } from "@/components/ui/use-toast"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { createClientSupabaseClient } from "@/lib/supabase/supabase"

interface ProjectEditorProps {
  projectId: string
}

export function ProjectEditor({ projectId }: ProjectEditorProps) {
  const { toast } = useToast()
  const syncService = SyncService.getInstance()
  const [activeTab, setActiveTab] = useState("script")

  // Usar localStorage para persistir los datos
  const { getItem, setItem } = useLocalStorage()

  // Estados para las escenas
  const [scriptScenes, setScriptScenes] = useState<Scene[]>([])
  const [storyboardScenes, setStoryboardScenes] = useState<StoryboardScene[]>([])

  // Cargar datos del localStorage al iniciar
  useEffect(() => {
    try {
      const savedScriptScenes = getItem(`script_scenes_${projectId}`)
      const savedStoryboardScenes = getItem(`storyboard_scenes_${projectId}`)

      if (savedScriptScenes) {
        setScriptScenes(JSON.parse(savedScriptScenes))
      } else {
        // Crear una escena inicial si no hay escenas guardadas
        const initialScene: Scene = {
          id: uuidv4(),
          title: "Escena 1",
          content: "",
          order: 0,
          versions: [],
          currentVersion: 0,
        }
        setScriptScenes([initialScene])
        setItem(`script_scenes_${projectId}`, JSON.stringify([initialScene]))
      }

      if (savedStoryboardScenes) {
        setStoryboardScenes(JSON.parse(savedStoryboardScenes))
      }
    } catch (error) {
      console.error("Error al cargar datos del localStorage:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos guardados",
        variant: "destructive",
      })
    }
  }, [projectId, getItem, setItem, toast])

  // Guardar datos en localStorage cuando cambien
  useEffect(() => {
    try {
      if (scriptScenes.length > 0) {
        setItem(`script_scenes_${projectId}`, JSON.stringify(scriptScenes))
      }

      if (storyboardScenes.length > 0) {
        setItem(`storyboard_scenes_${projectId}`, JSON.stringify(storyboardScenes))
      }
    } catch (error) {
      console.error("Error al guardar datos en localStorage:", error)
    }
  }, [scriptScenes, storyboardScenes, projectId, setItem])

  // Manejar actualizaciones de escenas del guion
  const handleScenesUpdate = useCallback(
    async (updatedScenes: Scene[]) => {
      try {
        // Optimistically update the local state
        setScriptScenes(updatedScenes)

        // Save to local storage immediately
        localStorage.setItem(`script_scenes_${projectId}`, JSON.stringify(updatedScenes))

        // Try updating the database
        const supabase = createClientSupabaseClient()
        for (let i = 0; i < updatedScenes.length; i++) {
          const scene = updatedScenes[i]
          // Update order_index as well, if necessary
          const { error } = await supabase.from("scenes").update({ order_index: i }).eq("id", scene.id)

          if (error) {
            throw error
          }
        }

        toast({
          title: "Reorder Success",
          description: "Scenes Reordered!",
        })
      } catch (error: any) {
        toast({
          title: "Error Reordering",
          description: error.message,
        })
      }
    },
    [projectId],
  )

  // Manejar actualizaciones de escenas del storyboard
  const handleStoryboardScenesUpdate = useCallback(
    (updatedScenes: StoryboardScene[]) => {
      try {
        setStoryboardScenes(updatedScenes)

        // Actualizar las escenas del guion basadas en las escenas del storyboard
        setScriptScenes((prevScriptScenes) =>
          syncService.updateScriptFromStoryboard(prevScriptScenes, updatedScenes, "storyboard"),
        )
      } catch (error) {
        console.error("Error al actualizar escenas del storyboard:", error)
      }
    },
    [syncService],
  )

  // Manejar la actualización de una escena específica del storyboard
  const handleStoryboardSceneUpdate = useCallback(
    (updatedScene: StoryboardScene) => {
      try {
        // Actualizar la escena en el storyboard
        setStoryboardScenes((prevScenes) => {
          const sceneIndex = prevScenes.findIndex((s) => s.id === updatedScene.id)
          if (sceneIndex >= 0) {
            const newScenes = [...prevScenes]
            newScenes[sceneIndex] = updatedScene
            return newScenes
          }
          return [...prevScenes, updatedScene]
        })

        // Sincronizar la escena específica con el guion
        setScriptScenes((prevScriptScenes) =>
          syncService.syncSpecificScene(prevScriptScenes, updatedScene, "storyboard"),
        )
      } catch (error) {
        console.error("Error al actualizar escena específica del storyboard:", error)
      }
    },
    [syncService],
  )

  return (
    <div className="w-full h-full flex flex-col">
      <Tabs
        defaultValue="script"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full h-full flex flex-col"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="script">Editor de Guion</TabsTrigger>
          <TabsTrigger value="storyboard">Storyboard</TabsTrigger>
        </TabsList>
        <TabsContent value="script" className="flex-1 overflow-hidden">
          <ScriptEditor scenes={scriptScenes} onScenesUpdate={handleScenesUpdate} projectId={projectId} />
        </TabsContent>
        <TabsContent value="storyboard" className="flex-1 overflow-hidden">
          <StoryboardEditor
            scenes={storyboardScenes}
            onScenesUpdate={handleStoryboardScenesUpdate}
            onSceneUpdate={handleStoryboardSceneUpdate}
            projectId={projectId}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
