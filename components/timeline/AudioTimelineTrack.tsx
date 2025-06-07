"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { formatTimeWithMilliseconds } from "@/utils/time"
import { Loader2 } from "lucide-react"
import { generateSimulatedWaveform } from "@/lib/waveform-utils"
import { TimelineGrid } from "@/components/timeline/timeline-grid"

interface AudioTimelineTrackProps {
  audioCurrentTime: number
  audioDuration: number
  shots: any[]
  activeSceneIndex: number
  activeImageIndex: number
  calculateAudioProgress: () => number
  onSeek: (percent: number) => void
  theme: {
    backgroundColor: string
    activeColor: string
    inactiveColor: string
    playheadColor: string
  }
  isMagnetismEnabled?: boolean
  magneticPoints?: number[]
  totalShotsDuration: number
  audioRef?: React.RefObject<HTMLAudioElement>
  audioUrl?: string // URL del archivo de audio
}

export function AudioTimelineTrack({
  audioCurrentTime,
  audioDuration,
  shots,
  activeSceneIndex,
  activeImageIndex,
  calculateAudioProgress,
  onSeek,
  theme,
  isMagnetismEnabled = false,
  magneticPoints = [],
  totalShotsDuration,
  audioRef,
  audioUrl,
}: AudioTimelineTrackProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [waveformData, setWaveformData] = useState<number[]>([])
  const [isLoadingWaveform, setIsLoadingWaveform] = useState(false)
  const [waveformLoadProgress, setWaveformLoadProgress] = useState(0)

  // Cargar y dibujar la forma de onda cuando cambie la URL del audio
  useEffect(() => {
    if (!audioUrl || !canvasRef.current) return

    const loadWaveform = async () => {
      setIsLoadingWaveform(true)
      try {
        // Extraer datos de forma de onda
        // const data = await extractWaveformData(audioUrl, 200);
        const data = generateSimulatedWaveform(200)
        setWaveformData(data)

        // Dibujar la forma de onda
        // if (canvasRef.current) {
        //   drawWaveform(canvasRef.current, data);
        // }
      } catch (error) {
        console.error("Error al cargar la forma de onda:", error)
      } finally {
        setIsLoadingWaveform(false)
      }
    }

    loadWaveform()
  }, [audioUrl])

  // Redibujar la forma de onda cuando cambie el tamaño del canvas
  useEffect(() => {
    if (!canvasRef.current || waveformData.length === 0) return

    const handleResize = () => {
      // if (canvasRef.current) {
      //   drawWaveform(canvasRef.current, waveformData);
      // }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [waveformData])

  // Modificar el handleClick para usar la grid y el tiempo de audio como fuente de verdad
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickPosition = e.clientX - rect.left
    const percent = (clickPosition / rect.width) * 100

    // Calcular el tiempo de audio directamente
    const newAudioTime = (percent / 100) * audioDuration

    onSeek(percent)
  }

  // Formatear el tiempo (mm:ss.ms)
  const formatTime = (time: number) => formatTimeWithMilliseconds(time)

  // Verificar si el playhead está cerca de un punto magnético
  const isPlayheadNearMagneticPoint = () => {
    if (!isMagnetismEnabled || magneticPoints.length === 0) return false

    // Convertir puntos magnéticos de la línea de tiempo a puntos en el audio
    // const audioMagneticPoints = magneticPoints.map((point) => {
    //   return TimelineGrid.syncTimeBasedOnGrid(point, totalShotsDuration, audioDuration)
    // })

    return false
  }

  // Calcular las posiciones de los marcadores de tomas en la pista de audio con precisión de grid
  const calculateShotMarkers = () => {
    if (!shots || shots.length === 0 || audioDuration === 0) return []

    // Calcular la duración total de todas las tomas usando la grid
    const totalShotsDurationValue = shots.reduce((total, shot) => {
      // Convertir a puntos de grid para mayor precisión
      const durationInGridPoints = TimelineGrid.secondsToGridPoints(shot.duration || 0)
      return total + TimelineGrid.gridPointsToSeconds(durationInGridPoints)
    }, 0)

    // Crear marcadores para cada toma con precisión de grid
    const markers = []
    let accumulatedTime = 0

    for (let i = 0; i < shots.length; i++) {
      const shot = shots[i]

      // Convertir a puntos de grid para mayor precisión
      const shotDurationInGridPoints = TimelineGrid.secondsToGridPoints(shot.duration || 0)

      // Calcular la posición proporcional en el audio con precisión de grid
      const audioStartTime = TimelineGrid.syncTimeBasedOnGrid(accumulatedTime, totalShotsDurationValue, audioDuration)

      const audioStartPercent = (audioStartTime / audioDuration) * 100

      markers.push({
        id: shot.id,
        position: audioStartPercent,
        isActive: i === activeImageIndex,
      })

      // Acumular tiempo con precisión de grid
      accumulatedTime += TimelineGrid.gridPointsToSeconds(shotDurationInGridPoints)
    }

    return markers
  }

  return (
    <div className="audio-timeline-track w-full mb-4">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{formatTime(audioCurrentTime)}</span>
        <span>{formatTime(audioDuration)}</span>
      </div>

      <div
        className={`relative h-12 ${theme.backgroundColor} rounded-md cursor-pointer overflow-hidden`}
        onClick={handleClick}
      >
        {/* Indicador de carga de forma de onda */}
        {isLoadingWaveform && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10">
            <div className="flex flex-col items-center">
              <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
              <span className="text-xs text-amber-500 mt-1">Cargando forma de onda...</span>
            </div>
          </div>
        )}

        {/* Canvas para la forma de onda */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ opacity: 0.7 }} />

        {/* Barra de progreso */}
        <div
          className="absolute h-full bg-amber-500/40 rounded-l-md"
          style={{ width: `${(audioCurrentTime / audioDuration) * 100}%` }}
        />

        {/* Marcadores de tomas */}
        {calculateShotMarkers().map((marker) => (
          <div
            key={marker.id}
            className={`absolute w-0.5 h-full ${marker.isActive ? "bg-green-500" : "bg-green-700/50"}`}
            style={{ left: `${marker.position}%` }}
          />
        ))}

        {/* Puntos magnéticos (visibles solo cuando el magnetismo está activado) */}
        {isMagnetismEnabled &&
          magneticPoints.map((point, index) => {
            // Convertir puntos magnéticos de la línea de tiempo a puntos en el audio
            const audioPoint = TimelineGrid.syncTimeBasedOnGrid(point, totalShotsDuration, audioDuration)

            if (audioPoint > audioDuration) return null

            const position = (audioPoint / audioDuration) * 100
            return (
              <div
                key={`magnetic-point-${index}`}
                className="absolute top-0 bottom-0 w-px bg-amber-500/50"
                style={{ left: `${position}%` }}
              />
            )
          })}

        {/* Indicador de posición actual */}
        <div
          className={`absolute w-0.5 h-full ${
            isPlayheadNearMagneticPoint() ? "bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.7)]" : theme.playheadColor
          }`}
          style={{ left: `${(audioCurrentTime / audioDuration) * 100}%` }}
        />
      </div>
    </div>
  )
}
