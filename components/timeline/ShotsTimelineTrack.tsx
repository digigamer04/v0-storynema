"use client"

import type React from "react"
import Image from "next/image"

interface Shot {
  id: string
  src: string
  url?: string
  duration: number
  description?: string
  startTime: number
  isActive: boolean
  type?: "image" | "video"
}

interface ShotsTimelineTrackProps {
  shots: Shot[]
  activeImageIndex: number
  shotCurrentTime: number
  totalDuration: number
  audioDuration: number
  audioCurrentTime: number
  onSeek: (percent: number) => void
  onShotSelect: (sceneIndex: number, imageIndex: number) => void
  theme: {
    backgroundColor: string
    activeColor: string
    inactiveColor: string
    playheadColor: string
  }
  isMagnetismEnabled?: boolean
  magneticPoints?: number[]
  activeSceneIndex?: number
}

export function ShotsTimelineTrack({
  shots,
  activeImageIndex,
  shotCurrentTime,
  totalDuration,
  audioDuration,
  audioCurrentTime,
  onSeek,
  onShotSelect,
  theme,
  isMagnetismEnabled = false,
  magneticPoints = [],
  activeSceneIndex = 0,
}: ShotsTimelineTrackProps) {
  // Calculate the position of the playhead based on audio time
  const calculatePlayheadPosition = () => {
    if (totalDuration === 0 || audioDuration === 0) return 0

    // Mapear el tiempo de audio al tiempo de tomas
    const mappedShotTime = (audioCurrentTime / audioDuration) * totalDuration
    return (mappedShotTime / totalDuration) * 100
  }

  // Handle click on the timeline - now based on audio time
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickPosition = e.clientX - rect.left
    const percent = (clickPosition / rect.width) * 100

    // Convertir el tiempo de toma a tiempo de audio
    const audioPercent = audioDuration > 0 ? (shotCurrentTime / totalDuration) * 100 : percent

    onSeek(audioPercent)
  }

  // Handle click on a shot - Corregido para pasar correctamente los parámetros a onShotSelect
  const handleShotClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const shot = shots[index]

    // Llamar a onShotSelect con los parámetros correctos
    onShotSelect(activeSceneIndex, index)

    // % exacto del audio donde empieza esta toma
    // Usar el tiempo de inicio absoluto de la toma
    const pct = (shot.startTime / audioDuration) * 100
    onSeek(pct) // mueve audio a pct% de audioDuration
  }

  // Format time in mm:ss.ms
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    const ms = Math.floor((time % 1) * 100)
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`
  }

  const isPlayheadNearMagneticPoint = () => {
    if (!isMagnetismEnabled || !magneticPoints) return false

    // Mapear el tiempo de audio al tiempo de tomas
    const mappedShotTime = (audioCurrentTime / audioDuration) * totalDuration

    for (const point of magneticPoints) {
      const distance = Math.abs(mappedShotTime - point)
      if (distance < 0.1) {
        return true
      }
    }

    return false
  }

  return (
    <div className="shots-timeline-track w-full">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>
          {formatTime(shotCurrentTime)} / {formatTime(totalDuration)}
        </span>
        <span>
          Toma {activeImageIndex + 1} de {shots.length}
        </span>
      </div>

      <div
        className={`relative h-16 ${theme.backgroundColor} rounded-md cursor-pointer overflow-hidden`}
        onClick={handleClick}
      >
        {/* Shot segments with thumbnails */}
        <div className="flex h-full">
          {shots.map((shot, index) => {
            const startPos = (shot.startTime / totalDuration) * 100
            const width = (shot.duration / totalDuration) * 100

            return (
              <div
                key={shot.id}
                className={`absolute top-0 h-full ${
                  index === activeImageIndex ? theme.activeColor : theme.inactiveColor
                } overflow-hidden`}
                style={{
                  left: `${startPos}%`,
                  width: `${width}%`,
                }}
                onClick={(e) => handleShotClick(index, e)}
              >
                {/* Thumbnail background */}
                {(shot.url || shot.src) && (
                  <div className="absolute inset-0 opacity-50">
                    <Image
                      src={shot.url || shot.src || "/placeholder.svg"}
                      alt={shot.description || `Shot ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                {/* Shot info overlay */}
                <div className="absolute inset-0 flex flex-col justify-between p-1">
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-white font-bold bg-black/50 px-1 rounded">{index + 1}</span>
                    {shot.type === "video" && (
                      <span className="text-xs text-white bg-blue-500/70 px-1 rounded">Video</span>
                    )}
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-white bg-black/50 px-1 rounded">{formatTime(shot.duration)}</span>
                    {width > 15 && shot.description && (
                      <span className="text-xs text-white bg-black/50 px-1 rounded truncate max-w-[80%]">
                        {shot.description}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Playhead indicator - now based on audio time */}
        <div
          className={`absolute top-0 w-0.5 h-full ${
            isPlayheadNearMagneticPoint() ? "bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.7)]" : theme.playheadColor
          }`}
          style={{ left: `${calculatePlayheadPosition()}%` }}
        />
      </div>
    </div>
  )
}
