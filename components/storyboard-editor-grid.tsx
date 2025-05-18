"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { TimelineContainer } from "./timeline/TimelineContainer"
import * as TimelineGrid from "@/lib/timeline-grid"
import { useTimelineGrid } from "@/lib/hooks/useTimelineGrid"

// Importar los tipos y componentes necesarios
// (Reutilizamos los tipos del StoryboardEditor original)

interface StoryboardEditorGridProps {
  projectId: string
  scenes?: any[]
  setScenes?: (scenes: any[]) => void
  onScenesUpdate?: (scenes: any[]) => void
  activeSceneIndex?: number
  setActiveSceneIndex?: (index: number) => void
  storyboardData?: any
  onStoryboardDataUpdate?: (data: any) => void
  audioSrc?: string
  onAudioUpload?: (audio: any) => void
}

export function StoryboardEditorGrid({
  projectId,
  scenes: scriptScenes,
  setScenes: setScriptScenes,
  onScenesUpdate,
  activeSceneIndex: scriptActiveSceneIndex,
  setActiveSceneIndex: setScriptActiveSceneIndex,
  storyboardData,
  onStoryboardDataUpdate,
  audioSrc,
  onAudioUpload,
}: StoryboardEditorGridProps) {
  // Estado para las escenas del storyboard
  const [internalScenes, setInternalScenes] = useState<any[]>([])

  // Referencia para rastrear si ya se han inicializado las escenas
  const scenesInitializedRef = useRef(false)

  // Estado para la escena y toma activas
  const [activeSceneIndex, setActiveSceneIndex] = useState(0)
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  // Usar nuestro hook de grid de tiempo
  const timelineGrid = useTimelineGrid({
    precision: TimelineGrid.GRID_PRECISION,
    frameRate: TimelineGrid.FRAME_RATES.FILM,
    snapToGrid: true,
  })

  // Referencia para el elemento de audio
  const audioRef = useRef<HTMLAudioElement>(null)

  // Estado para el audio
  const [audioTrack, setAudioTrack] = useState<any>(null)
  const [audioDuration, setAudioDuration] = useState(0)
  const [audioCurrentTime, setAudioCurrentTime] = useState(0)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)

  // Inicializar las escenas desde scriptScenes
  useEffect(() => {
    if (scriptScenes && scriptScenes.length > 0 && !scenesInitializedRef.current) {
      console.log("Inicializando escenas del storyboard desde script:", scriptScenes.length)

      // Convertir las escenas del guion a escenas del storyboard
      const convertedScenes = scriptScenes.map((scriptScene) => {
        // Buscar si ya existe una escena con este ID
        const existingScene = internalScenes.find((s) => s.id === scriptScene.id)

        if (existingScene) {
          // Si existe, mantener sus imágenes y metadatos
          return {
            ...existingScene,
            title: scriptScene.title,
            description: scriptScene.content || "Sin descripción",
          }
        } else {
          // Si no existe, crear una nueva escena con valores predeterminados
          return {
            id: scriptScene.id,
            title: scriptScene.title,
            description: scriptScene.content || "Sin descripción",
            images: [
              {
                id: `${scriptScene.id}-1`,
                url: "/placeholder.svg?height=300&width=500",
                description: scriptScene.content || "Nueva imagen - añade una descripción",
                duration: 3,
                cameraSettings: {
                  model: "Sony FX6",
                  lens: "24-70mm f/2.8",
                  aperture: "f/4.0",
                  shutterSpeed: "1/50",
                  iso: "800",
                  whiteBalance: "5600K",
                  resolution: "4K",
                  frameRate: "24 fps",
                  format: "ProRes 422 HQ",
                },
              },
            ],
            metadata: {
              camera: "Sin información",
              lighting: "Sin información",
              audio: "Sin información",
              duration: "0 segundos",
            },
          }
        }
      })

      setInternalScenes(convertedScenes)
      scenesInitializedRef.current = true

      // Guardar en localStorage
      try {
        localStorage.setItem("storynema_storyboard_scenes", JSON.stringify(convertedScenes))
        localStorage.setItem(`storynema_last_update_source_${projectId}`, "script_editor")
        localStorage.setItem(`storynema_last_update_time_${projectId}`, Date.now().toString())
      } catch (error) {
        console.error("Error saving storyboard scenes to localStorage:", error)
      }
    }
  }, [scriptScenes, projectId, internalScenes])

  // Sincronizar el índice de escena activa
  useEffect(() => {
    if (scriptActiveSceneIndex !== undefined) {
      console.log("Actualizando activeSceneIndex en storyboard:", scriptActiveSceneIndex)
      setActiveSceneIndex(scriptActiveSceneIndex)
    }
  }, [scriptActiveSceneIndex])

  // Obtener la escena activa
  const activeScene = internalScenes[activeSceneIndex] ||
    internalScenes[0] || {
      id: "0",
      title: "Sin escenas",
      description: "No hay escenas disponibles",
      images: [],
      metadata: {
        camera: "",
        lighting: "",
        audio: "",
        duration: "0 segundos",
      },
    }

  // Obtener la imagen activa
  const activeImage =
    activeScene?.images && activeScene.images.length > 0
      ? activeScene.images[activeImageIndex] || activeScene.images[0]
      : null

  // Función para establecer la escena activa
  const handleSetActiveScene = useCallback(
    (index: number) => {
      if (index >= 0 && index < internalScenes.length) {
        setActiveSceneIndex(index)
        setActiveImageIndex(0) // Resetear a la primera imagen

        // Sincronizar con el editor de guiones
        if (setScriptActiveSceneIndex) {
          setScriptActiveSceneIndex(index)
        }
      }
    },
    [internalScenes.length, setScriptActiveSceneIndex],
  )

  // Función para establecer la imagen activa
  const handleSetActiveImage = useCallback(
    (sceneIndex: number, imageIndex: number) => {
      if (
        sceneIndex >= 0 &&
        sceneIndex < internalScenes.length &&
        imageIndex >= 0 &&
        imageIndex < internalScenes[sceneIndex].images.length
      ) {
        setActiveSceneIndex(sceneIndex)
        setActiveImageIndex(imageIndex)

        // Sincronizar con el editor de guiones si cambia la escena
        if (setScriptActiveSceneIndex && sceneIndex !== activeSceneIndex) {
          setScriptActiveSceneIndex(sceneIndex)
        }

        // Calcular el tiempo transcurrido hasta la imagen seleccionada
        let elapsedTime = 0
        for (let i = 0; i < imageIndex; i++) {
          elapsedTime += internalScenes[sceneIndex].images[i]?.duration || 0
        }

        // Actualizar el tiempo en la grid
        timelineGrid.setCurrentTime(elapsedTime)
      }
    },
    [internalScenes, activeSceneIndex, setScriptActiveSceneIndex, timelineGrid],
  )

  // Función para manejar la actualización del tiempo de audio
  const handleAudioTimeUpdate = useCallback((time: number) => {
    setAudioCurrentTime(time)
  }, [])

  // Si no hay escenas o imágenes, mostrar un mensaje
  if (!activeScene || !activeScene.images || activeScene.images.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 bg-[#252525] border border-[#333333] rounded-md">
        <p>No hay escenas o imágenes disponibles.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 mt-4">
      <Card className="overflow-hidden bg-[#1E1E1E] border-[#333333]">
        <CardContent className="p-4">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-white">{activeScene.title}</h2>
            <p className="text-gray-400">{activeScene.description}</p>
          </div>

          {/* Contenedor de la línea de tiempo con grid precisa */}
          <TimelineContainer
            scenes={internalScenes}
            activeSceneIndex={activeSceneIndex}
            activeImageIndex={activeImageIndex}
            setActiveScene={handleSetActiveScene}
            setActiveImage={handleSetActiveImage}
            audioSrc={audioTrack?.url}
            onAudioTimeUpdate={handleAudioTimeUpdate}
          />

          <div className="mt-4 text-xs text-gray-500 text-center">
            Sistema de grid de tiempo con precisión de 1/120 segundos
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default StoryboardEditorGrid
