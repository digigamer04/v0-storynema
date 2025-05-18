"use client"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react"
import type { AudioTrack } from "./types"

interface SceneNavigationProps {
  activeSceneIndex: number
  totalScenes: number
  onPrevScene: () => void
  onNextScene: () => void
  isPrevDisabled: boolean
  isNextDisabled: boolean
  isPlaying: boolean
  togglePlayPause: () => void
  audioTrack: AudioTrack | null
}

export function SceneNavigation({
  activeSceneIndex,
  totalScenes,
  onPrevScene,
  onNextScene,
  isPrevDisabled,
  isNextDisabled,
  isPlaying,
  togglePlayPause,
  audioTrack,
}: SceneNavigationProps) {
  return (
    <div className="flex items-center justify-between px-2 py-1 bg-[#1E1E1E] rounded-lg border border-[#333333]">
      <Button variant="outline" onClick={onPrevScene} disabled={isPrevDisabled} className="flex items-center gap-1">
        <ChevronLeft className="h-4 w-4" />
        Escena anterior
      </Button>

      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={togglePlayPause} className="rounded-full">
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>

        <div className="text-sm">
          Escena {activeSceneIndex + 1} de {totalScenes}
          {audioTrack && <span className="ml-2 text-xs text-gray-400">{isPlaying ? "Reproduciendo" : "Pausado"}</span>}
        </div>
      </div>

      <Button variant="outline" onClick={onNextScene} disabled={isNextDisabled} className="flex items-center gap-1">
        Siguiente escena
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

export default SceneNavigation
