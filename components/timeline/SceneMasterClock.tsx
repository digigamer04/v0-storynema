"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import type { Scene } from "../../types"
import { formatTime } from "../../utils/time"
import styles from "./SceneMasterClock.module.css"

interface SceneMasterClockProps {
  scenes: Scene[]
  activeSceneIndex: number
  setActiveScene: (index: number) => void
  isPlaying?: boolean
  onTogglePlayPause?: () => void
  currentTime?: number
  onTimeUpdate?: (sceneIndex: number, time: number, accumulatedTime?: number, totalProjectDuration?: number) => void
  activeImageIndex?: number // Añadir esta prop opcional
  onSeek?: (time: number) => void // Añadir esta prop opcional
  onGoToShot?: (sceneIndex: number, imageIndex: number, syncAudio?: boolean) => void // Añadir esta prop opcional
}

export default function SceneMasterClock({
  scenes,
  activeSceneIndex,
  setActiveScene,
  isPlaying = false,
  onTogglePlayPause,
  currentTime = 0,
  onTimeUpdate,
  activeImageIndex,
  onSeek,
  onGoToShot,
}: SceneMasterClockProps) {
  const [currentSceneTime, setCurrentSceneTime] = useState(0)
  const [sceneDurations, setSceneDurations] = useState<number[]>([])
  const [projectDuration, setProjectDuration] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const progressBarRef = useRef<HTMLDivElement>(null)

  // Agregar esta función después de la declaración de estados
  const calculateTotalProjectDuration = useCallback(() => {
    return scenes.reduce((total, scene) => {
      if (!scene || !scene.images) return total
      return total + scene.images.reduce((sum, img) => sum + (img.duration || 0), 0)
    }, 0)
  }, [scenes])

  // Reemplazar el useEffect existente que calcula las duraciones de escenas
  useEffect(() => {
    // Asegurarse de que cada escena tenga una duración válida
    const durations = scenes.map((scene, index) => {
      // Si la escena no tiene duración o es 0, calcularla sumando las duraciones de sus imágenes
      if (!scene.duration || scene.duration === 0) {
        const imagesDuration = scene.images?.reduce((sum, img) => sum + (img.duration || 0), 0) || 0
        console.log(`Escena ${index}: Duración calculada de imágenes: ${imagesDuration}`)
        return imagesDuration
      }
      console.log(`Escena ${index}: Duración definida: ${scene.duration}`)
      return scene.duration
    })

    setSceneDurations(durations)

    // Calcular la duración total de todas las escenas
    const totalDuration = calculateTotalProjectDuration()
    console.log("Duración total del proyecto:", totalDuration)
    setProjectDuration(totalDuration)
  }, [scenes, calculateTotalProjectDuration])

  useEffect(() => {
    let timerId: NodeJS.Timeout

    if (isPlaying) {
      timerId = setInterval(() => {
        setCurrentSceneTime((prevTime) => {
          const newTime = prevTime + 0.1
          if (newTime > (sceneDurations[activeSceneIndex] || 0)) {
            if (activeSceneIndex < scenes.length - 1) {
              // IMPORTANTE: Aquí es donde necesitamos asegurarnos de pasar el índice correcto
              // Llamamos a setActiveScene con el índice de la siguiente escena
              const nextSceneIndex = activeSceneIndex + 1
              setActiveScene(nextSceneIndex)

              // También notificamos al componente padre sobre el cambio de escena
              if (onTimeUpdate) {
                // Calcular el tiempo acumulado hasta el inicio de la siguiente escena
                let accumulatedTime = 0
                for (let i = 0; i < nextSceneIndex; i++) {
                  accumulatedTime += sceneDurations[i] || 0
                }

                // Pasar el índice correcto de la escena, tiempo 0 (inicio de la escena),
                // tiempo acumulado y duración total del proyecto
                onTimeUpdate(nextSceneIndex, 0, accumulatedTime, projectDuration)
              }

              return 0
            } else {
              clearInterval(timerId)
              return prevTime
            }
          }
          return newTime
        })
      }, 100)
    } else {
      clearInterval(timerId)
    }

    return () => clearInterval(timerId)
  }, [isPlaying, activeSceneIndex, scenes, setActiveScene, sceneDurations, onTimeUpdate, projectDuration])

  useEffect(() => {
    // Asegurarse de que currentTime sea un número válido
    const validTime = typeof currentTime === "number" && !isNaN(currentTime) ? currentTime : 0
    console.log("Actualizando currentSceneTime:", validTime)
    setCurrentSceneTime(validTime)
  }, [currentTime])

  // Reemplazar la función handleSceneClick existente
  const handleSceneClick = (index: number) => {
    // IMPORTANTE: Asegurarnos de pasar el índice correcto de la escena
    console.log("SceneMasterClock: Clic en escena con índice:", index)

    // Actualizar el estado local
    setActiveScene(index)

    // Calcular el tiempo acumulado hasta el inicio de la escena seleccionada
    let accumulatedTime = 0
    for (let i = 0; i < index; i++) {
      accumulatedTime += sceneDurations[i] || 0
    }

    // Establecer el tiempo actual al inicio de la escena seleccionada
    setCurrentSceneTime(0)

    // Obtener la duración total del proyecto
    const totalProjectDuration = calculateTotalProjectDuration()
    console.log("Selección de escena - Duración total:", totalProjectDuration)
    console.log("Selección de escena - Tiempo acumulado:", accumulatedTime)
    console.log("Selección de escena - Índice de escena:", index)

    // Notificar al componente padre sobre el cambio de tiempo
    if (onTimeUpdate) {
      // Ahora pasamos el índice de la escena, el tiempo dentro de la escena (0),
      // y el tiempo acumulado hasta el inicio de la escena
      onTimeUpdate(index, 0, accumulatedTime, totalProjectDuration)
    }
  }

  const togglePlayPause = () => {
    if (onTogglePlayPause) {
      onTogglePlayPause()
    }
  }

  const seekToProjectTime = (time: number) => {
    if (isLocked) return

    let accumulatedTime = 0
    for (let i = 0; i < scenes.length; i++) {
      const sceneDuration = sceneDurations[i] || 0
      if (time < accumulatedTime + sceneDuration) {
        const sceneTime = time - accumulatedTime

        // IMPORTANTE: Asegurarnos de pasar el índice correcto de la escena
        console.log("seekToProjectTime: Seleccionando escena con índice:", i)
        setActiveScene(i)
        setCurrentSceneTime(sceneTime)

        if (onTimeUpdate) {
          // Pasar el índice correcto, el tiempo dentro de la escena,
          // el tiempo acumulado y la duración total
          onTimeUpdate(i, sceneTime, accumulatedTime, projectDuration)
        }
        break
      }
      accumulatedTime += sceneDuration
    }
  }

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return

    const rect = progressBarRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const totalWidth = rect.width
    const time = (x / totalWidth) * projectDuration

    seekToProjectTime(time)
  }

  const calculateProgress = () => {
    let accumulatedTime = 0
    for (let i = 0; i < activeSceneIndex; i++) {
      accumulatedTime += sceneDurations[i] || 0
    }
    accumulatedTime += currentSceneTime
    return (accumulatedTime / projectDuration) * 100
  }

  const getSceneDuration = (sceneIndex: number): number => {
    if (!scenes[sceneIndex]) return 0

    // Si la escena tiene duración definida, usarla
    if (scenes[sceneIndex].duration && scenes[sceneIndex].duration > 0) {
      return scenes[sceneIndex].duration
    }

    // Si no, calcular la duración basada en las imágenes
    const images = scenes[sceneIndex].images || []
    return images.reduce((sum, img) => sum + (img.duration || 0), 0)
  }

  const getSceneStartTime = (sceneIndex: number): number => {
    let startTime = 0
    for (let i = 0; i < sceneIndex; i++) {
      startTime += sceneDurations[i] || 0
    }
    return startTime
  }

  const getSceneEndTime = (sceneIndex: number): number => {
    const startTime = getSceneStartTime(sceneIndex)
    const duration = sceneDurations[sceneIndex] || 0
    return startTime + duration
  }

  return (
    <div className={styles.masterClock}>
      <div className={styles.unifiedControls}>
        <button onClick={togglePlayPause} className={styles.playButton}>
          {isPlaying ? "Pause" : "Play"}
        </button>
        <span className={styles.timeDisplay}>
          {formatTime(getSceneStartTime(activeSceneIndex))} - {formatTime(getSceneEndTime(activeSceneIndex))}
        </span>

        <div className={styles.scenesContainer}>
          {scenes.map((scene, index) => (
            <div
              key={index}
              className={`${styles.scene} ${index === activeSceneIndex ? styles.active : ""}`}
              onClick={() => handleSceneClick(index)}
            >
              {scene.name || `${index + 1}`}
            </div>
          ))}
        </div>

        <span className={styles.totalTime}>Total: {formatTime(projectDuration)}</span>
      </div>

      <div className={styles.progressBar} ref={progressBarRef} onClick={handleProgressBarClick}>
        <div className={styles.progress} style={{ width: `${calculateProgress()}%` }} />
      </div>
    </div>
  )
}
