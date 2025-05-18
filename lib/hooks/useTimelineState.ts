"use client"

import { useState, useEffect, useCallback, useRef } from "react"

export interface Shot {
  id: string
  src: string
  duration: number
  description?: string
  cameraSettings?: any
}

export interface Scene {
  id: string
  title: string
  images: Shot[]
}

export interface TimelineStateProps {
  scenes: Scene[]
  initialSceneIndex?: number
  initialImageIndex?: number
  onScenesUpdate?: (scenes: Scene[]) => void
  onActiveSceneChange?: (index: number) => void
  onActiveImageChange?: (sceneIndex: number, imageIndex: number) => void
}

export function useTimelineState({
  scenes: initialScenes,
  initialSceneIndex = 0,
  initialImageIndex = 0,
  onScenesUpdate,
  onActiveSceneChange,
  onActiveImageChange,
}: TimelineStateProps) {
  // Estado general
  const [scenes, setScenes] = useState<Scene[]>(initialScenes)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  // Estado de audio
  const [audioSrc, setAudioSrc] = useState<string | null>(null)
  const [audioCurrentTime, setAudioCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)

  // Estado de tomas
  const [activeSceneIndex, setActiveSceneIndex] = useState(initialSceneIndex)
  const [activeImageIndex, setActiveImageIndex] = useState(initialImageIndex)
  const [shotCurrentTime, setShotCurrentTime] = useState(0)

  // Referencias
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Cálculos derivados
  const getActiveScene = useCallback(() => {
    return scenes[activeSceneIndex] || null
  }, [scenes, activeSceneIndex])

  const getActiveShot = useCallback(() => {
    const scene = getActiveScene()
    if (!scene) return null
    return scene.images[activeImageIndex] || null
  }, [getActiveScene, activeImageIndex])

  const getAllShots = useCallback(() => {
    return scenes.flatMap((scene) => scene.images)
  }, [scenes])

  const getTotalDuration = useCallback(() => {
    const activeScene = getActiveScene()
    if (!activeScene) return 0

    return activeScene.images.reduce((total, image) => total + (image.duration || 0), 0)
  }, [getActiveScene])

  // Métodos para manipular el estado
  const updateScenes = useCallback(
    (newScenes: Scene[]) => {
      setScenes(newScenes)
      if (onScenesUpdate) {
        onScenesUpdate(newScenes)
      }
    },
    [onScenesUpdate],
  )

  const setActiveScene = useCallback(
    (index: number) => {
      if (index >= 0 && index < scenes.length) {
        setActiveSceneIndex(index)
        setActiveImageIndex(0) // Reset to first image in scene
        setShotCurrentTime(0)

        if (onActiveSceneChange) {
          onActiveSceneChange(index)
        }
      }
    },
    [scenes, onActiveSceneChange],
  )

  const setActiveShot = useCallback(
    (sceneIndex: number, imageIndex: number) => {
      if (
        sceneIndex >= 0 &&
        sceneIndex < scenes.length &&
        imageIndex >= 0 &&
        imageIndex < scenes[sceneIndex].images.length
      ) {
        setActiveSceneIndex(sceneIndex)
        setActiveImageIndex(imageIndex)
        setShotCurrentTime(0)

        if (onActiveImageChange) {
          onActiveImageChange(sceneIndex, imageIndex)
        }
      }
    },
    [scenes, onActiveImageChange],
  )

  const updateShotDuration = useCallback(
    (sceneIndex: number, imageIndex: number, duration: number) => {
      const newScenes = [...scenes]
      if (newScenes[sceneIndex] && newScenes[sceneIndex].images[imageIndex]) {
        newScenes[sceneIndex].images[imageIndex].duration = duration
        updateScenes(newScenes)
      }
    },
    [scenes, updateScenes],
  )

  // Métodos de reproducción
  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev)
  }, [])

  const nextShot = useCallback(() => {
    const scene = getActiveScene()
    if (!scene) return

    if (activeImageIndex < scene.images.length - 1) {
      setActiveImageIndex((prev) => prev + 1)
      setShotCurrentTime(0)

      if (onActiveImageChange) {
        onActiveImageChange(activeSceneIndex, activeImageIndex + 1)
      }
    } else if (activeSceneIndex < scenes.length - 1) {
      setActiveSceneIndex((prev) => prev + 1)
      setActiveImageIndex(0)
      setShotCurrentTime(0)

      if (onActiveSceneChange) {
        onActiveSceneChange(activeSceneIndex + 1)
      }

      if (onActiveImageChange) {
        onActiveImageChange(activeSceneIndex + 1, 0)
      }
    }
  }, [getActiveScene, activeImageIndex, activeSceneIndex, scenes.length, onActiveImageChange, onActiveSceneChange])

  const prevShot = useCallback(() => {
    if (activeImageIndex > 0) {
      setActiveImageIndex((prev) => prev - 1)
      setShotCurrentTime(0)

      if (onActiveImageChange) {
        onActiveImageChange(activeSceneIndex, activeImageIndex - 1)
      }
    } else if (activeSceneIndex > 0) {
      const prevSceneIndex = activeSceneIndex - 1
      const prevScene = scenes[prevSceneIndex]
      const prevImageIndex = prevScene.images.length - 1

      setActiveSceneIndex(prevSceneIndex)
      setActiveImageIndex(prevImageIndex)
      setShotCurrentTime(0)

      if (onActiveSceneChange) {
        onActiveSceneChange(prevSceneIndex)
      }

      if (onActiveImageChange) {
        onActiveImageChange(prevSceneIndex, prevImageIndex)
      }
    }
  }, [activeImageIndex, activeSceneIndex, scenes, onActiveImageChange, onActiveSceneChange])

  // Métodos para audio
  const setAudio = useCallback((src: string) => {
    setAudioSrc(src)
  }, [])

  const updateAudioTime = useCallback((time: number) => {
    setAudioCurrentTime(time)
  }, [])

  const updateAudioDuration = useCallback((duration: number) => {
    setAudioDuration(duration)
  }, [])

  // Cálculos de tiempo y progreso
  const calculateAudioProgress = useCallback(() => {
    if (audioDuration === 0) return 0
    return (audioCurrentTime / audioDuration) * 100
  }, [audioCurrentTime, audioDuration])

  const calculateShotProgress = useCallback(() => {
    const activeShot = getActiveShot()
    if (!activeShot || activeShot.duration === 0) return 0
    return (shotCurrentTime / activeShot.duration) * 100
  }, [getActiveShot, shotCurrentTime])

  const calculateTotalProgress = useCallback(() => {
    const totalDuration = getTotalDuration()
    if (totalDuration === 0) return 0

    // Calcular tiempo acumulado hasta la toma actual
    let accumulatedTime = 0
    const activeScene = getActiveScene()

    if (!activeScene) return 0

    for (let i = 0; i < activeImageIndex; i++) {
      accumulatedTime += activeScene.images[i].duration || 0
    }

    // Añadir el tiempo actual de la toma activa
    accumulatedTime += shotCurrentTime

    return (accumulatedTime / totalDuration) * 100
  }, [getTotalDuration, getActiveScene, activeImageIndex, shotCurrentTime])

  // Limpiar intervalo al desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    // Estado
    scenes,
    isPlaying,
    currentTime,
    audioSrc,
    audioCurrentTime,
    audioDuration,
    isAudioPlaying,
    activeSceneIndex,
    activeImageIndex,
    shotCurrentTime,

    // Getters
    getActiveScene,
    getActiveShot,
    getAllShots,
    getTotalDuration,

    // Setters
    setScenes: updateScenes,
    setActiveScene,
    setActiveShot,
    updateShotDuration,
    setShotCurrentTime,
    setAudio,
    setAudioCurrentTime: updateAudioTime,
    setAudioDuration: updateAudioDuration,
    setIsAudioPlaying,

    // Métodos de reproducción
    togglePlayPause,
    nextShot,
    prevShot,

    // Cálculos
    calculateAudioProgress,
    calculateShotProgress,
    calculateTotalProgress,

    // Referencias
    intervalRef,
  }
}
