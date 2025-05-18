"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause, SkipBack, SkipForward } from "lucide-react"
import { formatTime } from "../../utils/time"

interface MasterClockProps {
  scenes: any[]
  activeSceneIndex: number
  activeImageIndex: number
  audioSrc?: string
  audioDuration: number
  audioCurrentTime: number
  isPlaying: boolean
  onSeek: (percent: number) => void
  onShotSelect: (sceneIndex: number, imageIndex: number) => void
  onTogglePlayPause: () => void
}

export default function MasterClock({
  scenes,
  activeSceneIndex,
  activeImageIndex,
  audioSrc,
  audioDuration,
  audioCurrentTime,
  isPlaying,
  onSeek,
  onShotSelect,
  onTogglePlayPause,
}: MasterClockProps) {
  const [totalDuration, setTotalDuration] = useState(0)
  const [shotStartTimes, setShotStartTimes] = useState<number[][]>([])
  const [shotEndTimes, setShotEndTimes] = useState<number[][]>([])
  const [currentShotTime, setCurrentShotTime] = useState(0)
  const progressBarRef = useRef<HTMLDivElement>(null)

  // Calcular la duración total de todas las escenas
  const calculateTotalProjectDuration = useCallback(() => {
    return scenes.reduce((total, scene) => {
      if (!scene || !scene.images) return total
      return total + scene.images.reduce((sum, img) => sum + (img.duration || 0), 0)
    }, 0)
  }, [scenes])

  // Calcular los tiempos de inicio y fin de cada toma en cada escena
  useEffect(() => {
    const startTimes: number[][] = []
    const endTimes: number[][] = []
    let globalTime = 0

    scenes.forEach((scene, sceneIndex) => {
      startTimes[sceneIndex] = []
      endTimes[sceneIndex] = []

      if (scene && scene.images) {
        scene.images.forEach((shot, shotIndex) => {
          startTimes[sceneIndex][shotIndex] = globalTime
          globalTime += shot.duration || 0
          endTimes[sceneIndex][shotIndex] = globalTime
        })
      }
    })

    setShotStartTimes(startTimes)
    setShotEndTimes(endTimes)

    // Calcular la duración total del proyecto
    const totalProjectDuration = calculateTotalProjectDuration()
    setTotalDuration(totalProjectDuration)

    console.log("MasterClock - Duración total del proyecto:", totalProjectDuration)
    console.log("MasterClock - Tiempos de inicio de tomas:", startTimes)
  }, [scenes, calculateTotalProjectDuration])

  // Actualizar el tiempo actual de la toma basado en el tiempo de audio
  useEffect(() => {
    if (!audioSrc || audioDuration <= 0 || totalDuration <= 0) return

    // Calcular la proporción entre el tiempo de audio y el tiempo de las tomas
    const ratio = totalDuration / audioDuration
    const mappedShotTime = audioCurrentTime * ratio

    setCurrentShotTime(mappedShotTime)

    // Encontrar la toma correspondiente a este tiempo
    let found = false
    for (let sceneIndex = 0; sceneIndex < shotStartTimes.length; sceneIndex++) {
      for (let shotIndex = 0; shotIndex < shotStartTimes[sceneIndex]?.length; shotIndex++) {
        const startTime = shotStartTimes[sceneIndex][shotIndex]
        const endTime = shotEndTimes[sceneIndex][shotIndex]

        if (mappedShotTime >= startTime && mappedShotTime < endTime) {
          // Solo actualizar si es diferente a la toma actual
          if (sceneIndex !== activeSceneIndex || shotIndex !== activeImageIndex) {
            onShotSelect(sceneIndex, shotIndex)
          }
          found = true
          break
        }
      }
      if (found) break
    }
  }, [
    audioCurrentTime,
    audioDuration,
    totalDuration,
    shotStartTimes,
    shotEndTimes,
    activeSceneIndex,
    activeImageIndex,
    onShotSelect,
    audioSrc,
  ])

  // Manejar clic en la barra de progreso
  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !audioSrc) return

    const rect = progressBarRef.current.getBoundingClientRect()
    const clickPosition = e.clientX - rect.left
    const percent = (clickPosition / rect.width) * 100

    onSeek(percent)
  }

  // Ir a la toma anterior
  const goToPreviousShot = () => {
    if (activeImageIndex > 0) {
      onShotSelect(activeSceneIndex, activeImageIndex - 1)
    } else if (activeSceneIndex > 0) {
      const prevSceneIndex = activeSceneIndex - 1
      const prevShotIndex = scenes[prevSceneIndex]?.images?.length - 1 || 0
      onShotSelect(prevSceneIndex, prevShotIndex)
    }
  }

  // Ir a la toma siguiente
  const goToNextShot = () => {
    if (activeImageIndex < (scenes[activeSceneIndex]?.images?.length || 0) - 1) {
      onShotSelect(activeSceneIndex, activeImageIndex + 1)
    } else if (activeSceneIndex < scenes.length - 1) {
      onShotSelect(activeSceneIndex + 1, 0)
    }
  }

  // Calcular el porcentaje de progreso
  const calculateProgress = () => {
    if (totalDuration <= 0) return 0
    return (currentShotTime / totalDuration) * 100
  }

  // Función para sincronizar con una escena específica
  const syncWithScene = (sceneIndex: number) => {
    if (sceneIndex < 0 || sceneIndex >= scenes.length || !scenes[sceneIndex]) return

    // Calcular el tiempo acumulado hasta el inicio de la escena
    let accumulatedTime = 0
    for (let i = 0; i < sceneIndex; i++) {
      if (scenes[i] && scenes[i].images) {
        accumulatedTime += scenes[i].images.reduce((total, img) => total + (img.duration || 0), 0)
      }
    }

    // Calcular la proporción correcta usando la duración total del proyecto
    const totalProjectDuration = calculateTotalProjectDuration()
    const audioTimeRatio = audioDuration / totalProjectDuration

    // Calcular el nuevo tiempo de audio
    const newAudioTime = accumulatedTime * audioTimeRatio

    console.log("Sincronizando con escena:", sceneIndex)
    console.log("Tiempo acumulado hasta la escena:", accumulatedTime)
    console.log("Duración total del proyecto:", totalProjectDuration)
    console.log("Proporción tiempo audio/tomas:", audioTimeRatio)
    console.log("Nuevo tiempo de audio calculado:", newAudioTime)

    // Buscar en la línea de tiempo
    onSeek((newAudioTime / audioDuration) * 100)
  }

  return (
    <div className="bg-[#1E1E1E] border border-[#333333] rounded-md p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPreviousShot}
            className="h-8 w-8 text-gray-400 hover:text-white"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onTogglePlayPause}
            className="h-8 w-8 text-gray-400 hover:text-white"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={goToNextShot} className="h-8 w-8 text-gray-400 hover:text-white">
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        <div className="text-sm text-gray-400">
          <span>
            {formatTime(audioCurrentTime)} / {formatTime(audioDuration)}
          </span>
        </div>
      </div>

      <div
        ref={progressBarRef}
        className="h-2 bg-[#333333] rounded-full overflow-hidden cursor-pointer"
        onClick={handleProgressBarClick}
      >
        <div className="h-full bg-amber-500" style={{ width: `${(audioCurrentTime / audioDuration) * 100}%` }}></div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {scenes.map((scene, index) => (
          <Button
            key={index}
            variant={index === activeSceneIndex ? "default" : "outline"}
            size="sm"
            onClick={() => syncWithScene(index)}
            className={`text-xs ${
              index === activeSceneIndex
                ? "bg-amber-600 text-white border-amber-700"
                : "bg-[#2A2A2A] text-gray-300 border-[#444444]"
            }`}
          >
            {scene.name || `Escena ${index + 1}`}
          </Button>
        ))}
      </div>
    </div>
  )
}
