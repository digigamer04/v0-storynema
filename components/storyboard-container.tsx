"use client"

import { useState, useEffect } from "react"
import { StoryboardEditor } from "@/components/storyboard/StoryboardEditor"
import type { ScriptScene } from "@/types"

interface StoryboardContainerProps {
  projectId: string
  userId: string
  scenes?: ScriptScene[]
  setScenes?: (scenes: ScriptScene[]) => void
  onScenesUpdate?: (scenes: any[]) => void
  activeSceneIndex?: number
  setActiveSceneIndex?: (index: number) => void
}

export default function StoryboardContainer({
  projectId,
  userId,
  scenes,
  setScenes,
  onScenesUpdate,
  activeSceneIndex,
  setActiveSceneIndex,
}: StoryboardContainerProps) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simular tiempo de carga para asegurar que todos los componentes estén listos
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-[#1E1E1E] rounded-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    )
  }

  return (
    <StoryboardEditor projectId={projectId} userId={userId} scenes={scenes || []} onScenesUpdate={onScenesUpdate} />
  )
}
