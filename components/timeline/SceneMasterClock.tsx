"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause } from "lucide-react"
import styles from "./SceneMasterClock.module.css"

interface SceneMasterClockProps {
  scenes: any[]
  activeSceneIndex: number
  setActiveScene: (index: number) => void
  activeImageIndex?: number
  isPlaying?: boolean
  onTogglePlayPause?: () => void
  currentTime?: number
  onTimeUpdate?: (sceneIndex: number, time: number, accumulatedTime?: number, totalDuration?: number) => void
  onSeek?: (time: number) => void
  onGoToShot?: (sceneIndex: number, imageIndex: number, syncAudio?: boolean) => void
}

const SceneMasterClock: React.FC<SceneMasterClockProps> = ({
  scenes,
  activeSceneIndex,
  setActiveScene,
  activeImageIndex = 0,
  isPlaying = false,
  onTogglePlayPause,
  currentTime = 0,
  onTimeUpdate,
  onSeek,
  onGoToShot,
}) => {
  // Estado local
  const [sceneTime, setSceneTime] = useState(0)
  const [sceneDurations, setSceneDurations] = useState<number[]>([])
  const [projectDuration, setProjectDuration] = useState(0)
  const [isLocked, setIsLocked] = useState(false)

  // Referencias
  const progressBarRef = useRef<HTMLDivElement>(null)
  const lastActiveSceneIndexRef = useRef<number>(activeSceneIndex)
  const timeUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Calcular la duración total del proyecto
  const calculateTotalProjectDuration = useCallback(() => {
    return scenes.reduce((total, scene) => {
      if (!scene || !scene.images) return total
      return total + scene.images.reduce((sum, img) => sum + (img.duration || 0), 0)
    }, 0)
  }, [scenes])

  // Calcular las duraciones de las escenas
  useEffect(() => {
    const durations = scenes.map((scene) => {
      if (!scene.duration || scene.duration === 0) {
        return scene.images?.reduce((sum, img) => sum + (img.duration || 0), 0) || 0
      }
      return scene.duration
    })

    setSceneDurations(durations)
    setProjectDuration(calculateTotalProjectDuration())
  }, [scenes, calculateTotalProjectDuration])

  // Actualizar el tiempo de la escena cuando cambie el tiempo actual
  useEffect(() => {
    const validTime = typeof currentTime === "number" && !isNaN(currentTime) ? currentTime : 0
    setSceneTime(validTime)
  }, [currentTime])

  // Manejar clic en una escena - CORREGIDO para evitar setState durante renderizado
  const handleSceneClick = useCallback(
    (index: number) => {
      // Evitar cambios si el índice es el mismo
      if (index === activeSceneIndex) return

      console.log(`SceneMasterClock: Cambio manual a escena ${index}`)

      // Limpiar cualquier timeout pendiente
      if (timeUpdateTimeoutRef.current) {
        clearTimeout(timeUpdateTimeoutRef.current)
      }

      // Actualizar el estado local
      setActiveScene(index)
      setSceneTime(0) // Reiniciar el tiempo de la escena a 0

      // Calcular el tiempo acumulado hasta el inicio de la escena seleccionada
      let accumulatedTime = 0
      for (let i = 0; i < index; i++) {
        accumulatedTime += sceneDurations[i] || 0
      }

      // Usar setTimeout para evitar actualizar el estado durante el renderizado
      timeUpdateTimeoutRef.current = setTimeout(() => {
        if (onTimeUpdate) {
          console.log(`SceneMasterClock: Notificando cambio a escena ${index} con tiempo acumulado ${accumulatedTime}`)
          onTimeUpdate(index, 0, accumulatedTime, calculateTotalProjectDuration())
        }
      }, 0)
    },
    [setActiveScene, sceneDurations, calculateTotalProjectDuration, onTimeUpdate, activeSceneIndex],
  )

  // Manejar reproducción/pausa
  const togglePlayPause = useCallback(() => {
    if (onTogglePlayPause) {
      onTogglePlayPause()
    }
  }, [onTogglePlayPause])

  // Buscar una posición específica en el proyecto
  const seekToProjectTime = useCallback(
    (time: number) => {
      if (isLocked) return

      let accumulatedTime = 0
      for (let i = 0; i < scenes.length; i++) {
        const sceneDuration = sceneDurations[i] || 0
        if (time < accumulatedTime + sceneDuration) {
          const sceneTime = time - accumulatedTime

          // Actualizar la escena activa
          setActiveScene(i)
          setSceneTime(sceneTime)

          // Usar setTimeout para evitar actualizar el estado durante el renderizado
          if (timeUpdateTimeoutRef.current) {
            clearTimeout(timeUpdateTimeoutRef.current)
          }

          timeUpdateTimeoutRef.current = setTimeout(() => {
            if (onTimeUpdate) {
              onTimeUpdate(i, sceneTime, accumulatedTime, projectDuration)
            }
          }, 0)

          break
        }
        accumulatedTime += sceneDuration
      }
    },
    [isLocked, scenes, sceneDurations, setActiveScene, onTimeUpdate, projectDuration],
  )

  // Manejar clic en la barra de progreso
  const handleProgressBarClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressBarRef.current) return

      const rect = progressBarRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const totalWidth = rect.width
      const time = (x / totalWidth) * projectDuration

      seekToProjectTime(time)
    },
    [projectDuration, seekToProjectTime],
  )

  // Calcular el progreso actual
  const calculateProgress = useCallback(() => {
    let accumulatedTime = 0
    for (let i = 0; i < activeSceneIndex; i++) {
      accumulatedTime += sceneDurations[i] || 0
    }
    accumulatedTime += sceneTime
    return (accumulatedTime / projectDuration) * 100
  }, [activeSceneIndex, sceneTime, sceneDurations, projectDuration])

  // Obtener la duración de una escena
  const getSceneDuration = useCallback(
    (sceneIndex: number): number => {
      if (!scenes[sceneIndex]) return 0

      if (scenes[sceneIndex].duration && scenes[sceneIndex].duration > 0) {
        return scenes[sceneIndex].duration
      }

      const images = scenes[sceneIndex].images || []
      return images.reduce((sum, img) => sum + (img.duration || 0), 0)
    },
    [scenes],
  )

  // Obtener el tiempo de inicio de una escena
  const getSceneStartTime = useCallback(
    (sceneIndex: number): number => {
      let startTime = 0
      for (let i = 0; i < sceneIndex; i++) {
        startTime += sceneDurations[i] || 0
      }
      return startTime
    },
    [sceneDurations],
  )

  // Obtener el tiempo de fin de una escena
  const getSceneEndTime = useCallback(
    (sceneIndex: number): number => {
      const startTime = getSceneStartTime(sceneIndex)
      const duration = sceneDurations[sceneIndex] || 0
      return startTime + duration
    },
    [getSceneStartTime, sceneDurations],
  )

  // Formatear tiempo (mm:ss)
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }, [])

  // Actualizar lastActiveSceneIndexRef cuando cambia activeSceneIndex
  useEffect(() => {
    lastActiveSceneIndexRef.current = activeSceneIndex
  }, [activeSceneIndex])

  // Limpiar timeouts al desmontar
  useEffect(() => {
    return () => {
      if (timeUpdateTimeoutRef.current) {
        clearTimeout(timeUpdateTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className={styles.masterClock}>
      <div className={styles.unifiedControls}>
        <Button variant="outline" size="sm" onClick={togglePlayPause} className={styles.playButton}>
          {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        </Button>
        <div className={styles.scenesContainer}>
          {scenes.map((scene, index) => (
            <Button
              key={scene.id || index}
              variant={index === activeSceneIndex ? "default" : "outline"}
              size="sm"
              onClick={() => handleSceneClick(index)}
              className={`${styles.scene} ${index === activeSceneIndex ? styles.active : ""}`}
            >
              {scene.title || `Escena ${index + 1}`}
            </Button>
          ))}
        </div>
        <span className={styles.timeDisplay}>{formatTime(sceneTime)}</span>
      </div>

      <div className={styles.progressBar} ref={progressBarRef} onClick={handleProgressBarClick}>
        <div className={styles.progress} style={{ width: `${calculateProgress()}%` }} />
      </div>
    </div>
  )
}

export default SceneMasterClock
