"use client"

import type React from "react"

import { useEffect, useRef, useCallback } from "react"

interface SyncEngineProps {
  timelineState: ReturnType<typeof import("./useTimelineState").useTimelineState>
  audioRef: React.RefObject<HTMLAudioElement>
}

export function useSyncEngine({ timelineState, audioRef }: SyncEngineProps) {
  const {
    isPlaying,
    isAudioPlaying,
    audioCurrentTime,
    audioDuration,
    shotCurrentTime,
    activeSceneIndex,
    activeImageIndex,
    scenes,
    getActiveShot,
    getAllShots,
    getTotalDuration,
    nextShot,
    setActiveShot,
    setShotCurrentTime,
    setAudioCurrentTime,
    setIsAudioPlaying,
    intervalRef,
  } = timelineState

  // Referencia para el último tiempo registrado
  const lastTimeRef = useRef<number>(0)

  // Sincronizar audio con el estado
  useEffect(() => {
    const audioElement = audioRef.current
    if (!audioElement) return

    const handleTimeUpdate = () => {
      setAudioCurrentTime(audioElement.currentTime)
    }

    const handleDurationChange = () => {
      setAudioCurrentTime(audioElement.duration)
    }

    const handlePlay = () => {
      setIsAudioPlaying(true)
    }

    const handlePause = () => {
      setIsAudioPlaying(false)
    }

    audioElement.addEventListener("timeupdate", handleTimeUpdate)
    audioElement.addEventListener("durationchange", handleDurationChange)
    audioElement.addEventListener("play", handlePlay)
    audioElement.addEventListener("pause", handlePause)

    return () => {
      audioElement.removeEventListener("timeupdate", handleTimeUpdate)
      audioElement.removeEventListener("durationchange", handleDurationChange)
      audioElement.removeEventListener("play", handlePlay)
      audioElement.removeEventListener("pause", handlePause)
    }
  }, [audioRef, setAudioCurrentTime, setIsAudioPlaying])

  // Sincronizar reproducción de tomas
  useEffect(() => {
    if (isPlaying) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      const startTime = Date.now()
      lastTimeRef.current = shotCurrentTime

      intervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000
        const newTime = lastTimeRef.current + elapsed

        const activeShot = getActiveShot()
        if (!activeShot) return

        if (newTime >= activeShot.duration) {
          // Pasar a la siguiente toma
          nextShot()
          lastTimeRef.current = 0
        } else {
          setShotCurrentTime(newTime)
        }
      }, 50)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
      lastTimeRef.current = shotCurrentTime
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPlaying, shotCurrentTime, getActiveShot, nextShot, setShotCurrentTime, intervalRef])

  // Sincronizar audio con tomas cuando hay audio
  useEffect(() => {
    if (isAudioPlaying && audioDuration > 0) {
      const totalDuration = getTotalDuration()
      if (totalDuration === 0) return

      // Calcular la proporción entre la duración del audio y la duración total de las tomas
      const audioTimeRatio = totalDuration / audioDuration

      // Calcular el tiempo equivalente en las tomas
      const equivalentShotTime = audioCurrentTime * audioTimeRatio

      // Encontrar la toma correspondiente a este tiempo
      let accumulatedTime = 0
      let foundSceneIndex = -1
      let foundImageIndex = -1

      for (let s = 0; s < scenes.length; s++) {
        const scene = scenes[s]
        for (let i = 0; i < scene.images.length; i++) {
          const image = scene.images[i]
          const nextTime = accumulatedTime + (image.duration || 0)

          if (equivalentShotTime >= accumulatedTime && equivalentShotTime < nextTime) {
            foundSceneIndex = s
            foundImageIndex = i
            break
          }

          accumulatedTime = nextTime
        }

        if (foundSceneIndex !== -1) break
      }

      // Si encontramos la toma correspondiente, actualizamos el estado
      if (foundSceneIndex !== -1 && foundImageIndex !== -1) {
        if (foundSceneIndex !== activeSceneIndex || foundImageIndex !== activeImageIndex) {
          setActiveShot(foundSceneIndex, foundImageIndex)
        }

        // Calcular el tiempo dentro de la toma actual
        let timeBeforeCurrentShot = 0
        const scene = scenes[foundSceneIndex]
        for (let i = 0; i < foundImageIndex; i++) {
          timeBeforeCurrentShot += scene.images[i].duration || 0
        }

        const timeInCurrentShot = equivalentShotTime - timeBeforeCurrentShot
        setShotCurrentTime(timeInCurrentShot)
      }
    }
  }, [
    isAudioPlaying,
    audioCurrentTime,
    audioDuration,
    scenes,
    activeSceneIndex,
    activeImageIndex,
    getTotalDuration,
    setActiveShot,
    setShotCurrentTime,
  ])

  // Métodos para interacción del usuario
  const seekAudioToPercent = useCallback(
    (percent: number) => {
      const audioElement = audioRef.current
      if (!audioElement || audioDuration === 0) return

      const newTime = (percent / 100) * audioDuration
      audioElement.currentTime = newTime
      setAudioCurrentTime(newTime)
    },
    [audioRef, audioDuration, setAudioCurrentTime],
  )

  const seekShotToPercent = useCallback(
    (percent: number) => {
      const totalDuration = getTotalDuration()
      if (totalDuration === 0) return

      const targetTime = (percent / 100) * totalDuration

      // Encontrar la toma correspondiente
      let accumulatedTime = 0
      let foundSceneIndex = -1
      let foundImageIndex = -1
      let timeInShot = 0

      for (let s = 0; s < scenes.length; s++) {
        const scene = scenes[s]
        for (let i = 0; i < scene.images.length; i++) {
          const image = scene.images[i]
          const nextTime = accumulatedTime + (image.duration || 0)

          if (targetTime >= accumulatedTime && targetTime < nextTime) {
            foundSceneIndex = s
            foundImageIndex = i
            timeInShot = targetTime - accumulatedTime
            break
          }

          accumulatedTime = nextTime
        }

        if (foundSceneIndex !== -1) break
      }

      // Actualizar estado
      if (foundSceneIndex !== -1 && foundImageIndex !== -1) {
        setActiveShot(foundSceneIndex, foundImageIndex)
        setShotCurrentTime(timeInShot)

        // Si hay audio, sincronizar también
        if (audioDuration > 0) {
          const audioTimeRatio = audioDuration / totalDuration
          const newAudioTime = targetTime * audioTimeRatio

          const audioElement = audioRef.current
          if (audioElement) {
            audioElement.currentTime = newAudioTime
          }
        }
      }
    },
    [scenes, getTotalDuration, setActiveShot, setShotCurrentTime, audioDuration, audioRef],
  )

  return {
    seekAudioToPercent,
    seekShotToPercent,
  }
}
