"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import * as TimelineGrid from "@/lib/timeline-grid"

interface Shot {
  id: string
  duration: number
  description?: string
  sceneIndex?: number
  imageIndex?: number
  startTime?: number
  endTime?: number
  isActive?: boolean
}

interface Scene {
  id: string
  title: string
  images: Shot[]
}

interface UseMasterClockOptions {
  scenes: Scene[]
  activeSceneIndex: number
  activeImageIndex: number
  audioSrc?: string
  audioDuration?: number
  audioCurrentTime?: number
  frameRate?: number
  initialClockMode?: "timecode" | "frames" | "seconds"
  onTimeUpdate?: (time: number) => void
}

export function useMasterClock({
  scenes,
  activeSceneIndex,
  activeImageIndex,
  audioSrc,
  audioDuration = 0,
  audioCurrentTime = 0,
  frameRate = 24,
  initialClockMode = "timecode",
  onTimeUpdate,
}: UseMasterClockOptions) {
  // Estado para el reloj maestro
  const [masterTime, setMasterTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [shotsWithTimecodes, setShotsWithTimecodes] = useState<Shot[]>([])
  const [clockMode, setClockMode] = useState<"timecode" | "frames" | "seconds">(initialClockMode)
  const [currentFrameRate, setCurrentFrameRate] = useState(frameRate)
  const [syncWithAudio, setSyncWithAudio] = useState(true)

  const clockIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const activeScene = scenes[activeSceneIndex]
  const activeShot = activeScene?.images?.[activeImageIndex]

  // Calcular todos los tiempos de inicio y fin de las tomas
  const calculateAllShotTimecodes = useCallback(() => {
    const allShots: Shot[] = []
    let accumulatedTime = 0

    scenes.forEach((scene, sceneIndex) => {
      scene.images.forEach((shot, imageIndex) => {
        const startTime = accumulatedTime
        accumulatedTime += shot.duration
        const endTime = accumulatedTime

        allShots.push({
          ...shot,
          sceneIndex,
          imageIndex,
          startTime,
          endTime,
          isActive: sceneIndex === activeSceneIndex && imageIndex === activeImageIndex,
        })
      })
    })

    setShotsWithTimecodes(allShots)
    setTotalDuration(accumulatedTime)

    return allShots
  }, [scenes, activeSceneIndex, activeImageIndex])

  // Calcular el tiempo de inicio de la toma actual
  const calculateCurrentShotStartTime = useCallback(() => {
    let startTime = 0

    if (!activeScene || activeImageIndex < 0) return startTime

    for (let i = 0; i < activeImageIndex; i++) {
      if (activeScene.images[i]) {
        startTime += activeScene.images[i].duration
      }
    }

    return startTime
  }, [activeScene, activeImageIndex])

  // Calcular el tiempo de fin de la toma actual
  const calculateCurrentShotEndTime = useCallback(() => {
    const startTime = calculateCurrentShotStartTime()
    if (!activeShot) return startTime

    return startTime + activeShot.duration
  }, [calculateCurrentShotStartTime, activeShot])

  // Formatear tiempo según el modo seleccionado
  const formatTime = useCallback(
    (seconds: number) => {
      switch (clockMode) {
        case "timecode":
          return TimelineGrid.gridPointsToSmpte(TimelineGrid.secondsToGridPoints(seconds), currentFrameRate)
        case "frames":
          return `${TimelineGrid.gridPointsToFrames(
            TimelineGrid.secondsToGridPoints(seconds),
            currentFrameRate,
          )} frames`
        case "seconds":
        default:
          const mins = Math.floor(seconds / 60)
          const secs = Math.floor(seconds % 60)
          const ms = Math.floor((seconds % 1) * 100)
          return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`
      }
    },
    [clockMode, currentFrameRate],
  )

  // Encontrar la toma correspondiente a un tiempo específico
  const findShotAtTime = useCallback(
    (time: number) => {
      for (const shot of shotsWithTimecodes) {
        if (time >= shot.startTime! && time < shot.endTime!) {
          return shot
        }
      }
      return null
    },
    [shotsWithTimecodes],
  )

  // Convertir tiempo de tomas a tiempo de audio
  const convertShotTimeToAudioTime = useCallback(
    (shotTime: number) => {
      if (audioDuration === 0 || totalDuration === 0) return 0

      // Convertir a puntos de grid para mayor precisión
      const shotTimeInGridPoints = TimelineGrid.secondsToGridPoints(shotTime)
      const totalDurationInGridPoints = TimelineGrid.secondsToGridPoints(totalDuration)

      // Calcular la proporción con mayor precisión
      const ratio = audioDuration / TimelineGrid.gridPointsToSeconds(totalDurationInGridPoints)

      // Convertir de vuelta a segundos con compensación de redondeo
      return TimelineGrid.gridPointsToSeconds(shotTimeInGridPoints) * ratio
    },
    [audioDuration, totalDuration],
  )

  // Convertir tiempo de audio a tiempo de tomas
  const convertAudioTimeToShotTime = useCallback(
    (audioTime: number) => {
      if (audioDuration === 0 || totalDuration === 0) return 0

      // Convertir a puntos de grid para mayor precisión
      const audioTimeInGridPoints = TimelineGrid.secondsToGridPoints(audioTime)
      const audioDurationInGridPoints = TimelineGrid.secondsToGridPoints(audioDuration)

      // Calcular la proporción con mayor precisión
      const ratio = totalDuration / TimelineGrid.gridPointsToSeconds(audioDurationInGridPoints)

      // Convertir de vuelta a segundos con compensación de redondeo
      return TimelineGrid.gridPointsToSeconds(audioTimeInGridPoints) * ratio
    },
    [audioDuration, totalDuration],
  )

  // Añadir esta nueva función después de convertAudioTimeToShotTime:
  const syncToNearestFrame = useCallback(
    (time: number, frameRate = currentFrameRate) => {
      // Convertir tiempo a frames
      const frames = Math.round(time * frameRate)
      // Convertir frames de vuelta a tiempo con precisión de frame
      return frames / frameRate
    },
    [currentFrameRate],
  )

  // Sincronizar el tiempo maestro con el tiempo de audio
  useEffect(() => {
    const mappedTime = convertAudioTimeToShotTime(audioCurrentTime)

    // Sincronizar al frame más cercano para evitar desviaciones
    const frameAlignedTime = syncToNearestFrame(mappedTime)

    // Actualizar el tiempo maestro con compensación de latencia
    setMasterTime(frameAlignedTime)

    // Notificar al componente padre si es necesario
    if (onTimeUpdate) {
      onTimeUpdate(frameAlignedTime)
    }
  }, [audioCurrentTime, convertAudioTimeToShotTime, syncToNearestFrame, onTimeUpdate])

  // Calcular los tiempos de las tomas cuando cambian las escenas
  useEffect(() => {
    calculateAllShotTimecodes()
  }, [scenes, activeSceneIndex, activeImageIndex, calculateAllShotTimecodes])

  // Calcular el porcentaje de progreso
  const calculateProgress = useCallback(() => {
    if (totalDuration === 0) return 0
    return (masterTime / totalDuration) * 100
  }, [masterTime, totalDuration])

  // Calcular el tiempo total acumulado hasta una escena específica
  const calculateAccumulatedTimeToScene = useCallback(
    (sceneIndex: number) => {
      let accumulatedTime = 0

      for (let i = 0; i < sceneIndex; i++) {
        if (scenes[i] && scenes[i].images) {
          scenes[i].images.forEach((shot) => {
            accumulatedTime += shot.duration
          })
        }
      }

      return accumulatedTime
    },
    [scenes],
  )

  // Calcular el tiempo total de una escena específica
  const calculateSceneDuration = useCallback(
    (sceneIndex: number) => {
      if (!scenes[sceneIndex] || !scenes[sceneIndex].images) return 0

      return scenes[sceneIndex].images.reduce((total, shot) => total + shot.duration, 0)
    },
    [scenes],
  )

  return {
    // Estado
    masterTime,
    totalDuration,
    shotsWithTimecodes,
    clockMode,
    currentFrameRate,
    syncWithAudio,

    // Setters
    setMasterTime,
    setClockMode,
    setCurrentFrameRate,
    setSyncWithAudio,

    // Cálculos
    calculateCurrentShotStartTime,
    calculateCurrentShotEndTime,
    formatTime,
    findShotAtTime,
    calculateProgress,
    calculateAllShotTimecodes,
    calculateAccumulatedTimeToScene,
    calculateSceneDuration,

    // Conversiones
    convertShotTimeToAudioTime,
    convertAudioTimeToShotTime,
    syncToNearestFrame, // Nueva función
  }
}

export default useMasterClock
