"use client"

import { useState, useEffect, useCallback } from "react"
import { TimelineContainer } from "./timeline/TimelineContainer"
// ... resto de importaciones

interface StoryboardEditorProps {
  projectId: string
  scenes: any[] // Replace 'any' with the actual type of your scene object
  setScenes: (scenes: any[]) => void // Replace 'any' with the actual type
  onScenesUpdate: (scenes: any[]) => void // Replace 'any' with the actual type
  activeSceneIndex: number
  setActiveSceneIndex: (index: number) => void
  storyboardData: any // Replace 'any' with the actual type
  onStoryboardDataUpdate: (data: any) => void // Replace 'any' with the actual type
  audioSrc: string | null
  onAudioUpload: (file: File) => void
}

export function StoryboardEditorWithMagnetism({
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
}: StoryboardEditorProps) {
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [shotCurrentTime, setShotCurrentTime] = useState<number>(0)
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0)
  const [internalScenes, setInternalScenes] = useState(scriptScenes)
  const [activeSceneIndex, setActiveSceneIndex] = useState(scriptActiveSceneIndex)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [audioTrack, setAudioTrack] = useState<{ url: string; file: File } | null>(null)

  useEffect(() => {
    setInternalScenes(scriptScenes)
  }, [scriptScenes])

  useEffect(() => {
    setActiveSceneIndex(scriptActiveSceneIndex)
  }, [scriptActiveSceneIndex])
  // ... resto del código del componente StoryboardEditor

  // Añadir esta función para manejar la actualización de tiempo desde la línea de tiempo
  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time)
    setShotCurrentTime(time)
  }, [])

  // Añadir esta función para manejar la actualización de tiempo de audio
  const handleAudioTimeUpdate = useCallback((time: number) => {
    setAudioCurrentTime(time)
  }, [])

  // Modificar el return para incluir el nuevo TimelineContainer
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
      {/* ... resto del código */}

      {/* Añadir el nuevo TimelineContainer */}
      <div className="md:col-span-3 mt-4">
        <TimelineContainer
          scenes={internalScenes}
          activeSceneIndex={activeSceneIndex}
          activeImageIndex={activeImageIndex}
          setActiveScene={setActiveSceneIndex}
          setActiveImage={(sceneIndex, imageIndex) => {
            if (sceneIndex === activeSceneIndex) {
              setActiveImageIndex(imageIndex)
            } else {
              setActiveSceneIndex(sceneIndex)
              setActiveImageIndex(imageIndex)
            }
          }}
          audioSrc={audioTrack?.url}
          onAudioTimeUpdate={handleAudioTimeUpdate}
        />
      </div>

      {/* ... resto del código */}
    </div>
  )
}
