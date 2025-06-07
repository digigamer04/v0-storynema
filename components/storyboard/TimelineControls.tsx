"use client"

import type React from "react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Volume2, VolumeX, X } from "lucide-react"
import AudioControls from "./AudioControls"
import type { AudioTrack, StoryboardScene, Shot } from "./types"

interface TimelineControlsProps {
  audioTrack: AudioTrack | null
  audioCurrentTime: number
  audioDuration: number
  audioVolume: number
  audioMuted: boolean
  audioError: boolean
  currentTime: number
  totalDuration: number
  activeScene: StoryboardScene
  activeImageIndex: number
  getAllShots: () => Shot[]
  formatTime: (seconds: number) => string
  onSeekToPosition: (time: number) => void
  onToggleMute: () => void
  onVolumeChange: (volume: number) => void
  onRemoveAudio: () => void
  goToShot: (sceneIndex: number, imageIndex: number, syncAudio?: boolean) => void
  onUpdateShotTime: (time: number) => void
}

export function TimelineControls({
  audioTrack,
  audioCurrentTime,
  audioDuration,
  audioVolume,
  audioMuted,
  audioError,
  currentTime,
  totalDuration,
  activeScene,
  activeImageIndex,
  getAllShots,
  formatTime,
  onSeekToPosition,
  onToggleMute,
  onVolumeChange,
  onRemoveAudio,
  goToShot,
  onUpdateShotTime,
}: TimelineControlsProps) {
  const shots = getAllShots()

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickPosition = (e.clientX - rect.left) / rect.width

    // Filtrar solo las tomas de la escena activa
    const sceneShotsOnly = shots.filter((shot) => shot.sceneIndex === activeScene.order)

    // Calcular la duración total de la escena activa
    const sceneDuration = sceneShotsOnly.reduce((total, shot) => total + shot.duration, 0) || 1 // Evitar división por cero

    // Calcular el tiempo de inicio de la escena activa
    const sceneStartTime = sceneShotsOnly.length > 0 ? sceneShotsOnly[0].startTime : 0

    // Calcular el nuevo tiempo basado en la posición del clic
    const newTimeInScene = clickPosition * sceneDuration
    const newGlobalTime = sceneStartTime + newTimeInScene

    // Verificar que el tiempo sea un número finito antes de aplicarlo
    if (isFinite(newGlobalTime) && newGlobalTime >= 0) {
      onSeekToPosition(newGlobalTime)
    } else {
      console.error("Tiempo calculado no válido:", newGlobalTime)
    }
  }

  const handleAudioTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioTrack) return

    const rect = e.currentTarget.getBoundingClientRect()
    const clickPosition = (e.clientX - rect.left) / rect.width
    const newTime = clickPosition * audioDuration
    onSeekToPosition(newTime)
  }

  const renderShotMarkers = () => {
    // Filtrar solo las tomas de la escena activa
    const sceneShotsOnly = shots.filter((shot) => shot.sceneIndex === activeScene.order)

    // Si no hay tomas, no renderizar nada
    if (sceneShotsOnly.length === 0) return null

    // Calcular la duración total de la escena activa
    const sceneDuration = sceneShotsOnly.reduce((total, shot) => total + shot.duration, 0) || 1 // Evitar división por cero

    // Calcular el tiempo de inicio de la escena
    const sceneStartTime = sceneShotsOnly[0].startTime

    return sceneShotsOnly.map((shot, index) => {
      // Calcular el tiempo de inicio relativo dentro de la escena
      const shotStartTimeInScene = sceneShotsOnly.slice(0, index).reduce((total, s) => total + s.duration, 0)
      const startPercent = (shotStartTimeInScene / sceneDuration) * 100
      const widthPercent = (shot.duration / sceneDuration) * 100
      const isActive = shot.imageIndex === activeImageIndex

      return (
        <div
          key={`${shot.sceneIndex}-${shot.imageIndex}`}
          className={`absolute h-3 top-1/2 -translate-y-1/2 cursor-pointer ${
            isActive ? "bg-primary/60" : "bg-gray-500/40"
          } ${index > 0 ? "border-l border-l-gray-600" : ""}`}
          style={{
            left: `${startPercent}%`,
            width: `${widthPercent}%`,
          }}
          onClick={() => goToShot(shot.sceneIndex, shot.imageIndex, true)}
          title={`Toma ${shot.imageIndex + 1}`}
        />
      )
    })
  }

  return (
    <div className="p-4 space-y-4 bg-[#1E1E1E]">
      {/* Audio Timeline */}
      {audioTrack && !audioError && (
        <AudioControls
          audioTrack={audioTrack}
          audioCurrentTime={audioCurrentTime}
          audioDuration={audioDuration}
          audioVolume={audioVolume}
          audioMuted={audioMuted}
          audioError={audioError}
          formatTime={formatTime}
          onToggleMute={onToggleMute}
          onVolumeChange={onVolumeChange}
          onRemoveAudio={onRemoveAudio}
          onSeek={handleAudioTimelineClick}
        />
      )}

      {/* Shots Timeline */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <div className="text-xs text-gray-400 flex items-center gap-2">
            <span className="font-medium">Escena {activeScene.order + 1}</span>
            <span>
              {formatTime(
                Math.max(0, currentTime - (shots.find((s) => s.sceneIndex === activeScene.order)?.startTime || 0)),
              )}{" "}
              /
              {formatTime(
                shots.filter((s) => s.sceneIndex === activeScene.order).reduce((total, s) => total + s.duration, 0) ||
                  0,
              )}
            </span>
          </div>
        </div>

        <div className="relative h-4 bg-gray-800 rounded cursor-pointer overflow-hidden" onClick={handleTimelineClick}>
          {renderShotMarkers()}

          {/* Indicador de posición actual relativa a la escena */}
          {(() => {
            const sceneShotsOnly = shots.filter((shot) => shot.sceneIndex === activeScene.order)
            if (sceneShotsOnly.length === 0) return null

            const sceneDuration = sceneShotsOnly.reduce((total, shot) => total + shot.duration, 0) || 1
            const sceneStartTime = sceneShotsOnly[0].startTime
            const relativePosition = ((currentTime - sceneStartTime) / sceneDuration) * 100

            // Asegurarse de que el porcentaje esté entre 0 y 100
            const safePosition = Math.max(0, Math.min(100, relativePosition))

            return (
              <>
                <div
                  className="absolute h-full bg-primary/30"
                  style={{
                    width: `${safePosition}%`,
                  }}
                />
                <div
                  className="absolute w-1 h-full bg-primary"
                  style={{
                    left: `${safePosition}%`,
                  }}
                />
              </>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

export default TimelineControls
