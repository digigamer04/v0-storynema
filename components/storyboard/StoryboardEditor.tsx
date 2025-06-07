"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { v4 as uuidv4 } from "uuid"
import { arrayMove } from "@dnd-kit/sortable"
import { AlertCircle, RefreshCw } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

import StoryboardViewer from "./StoryboardViewer"
import TimelineControls from "./TimelineControls"
import Filmstrip from "./Filmstrip"
import SidePanel from "./SidePanel"
import SceneNavigation from "./SceneNavigation"
import SceneMasterClock from "@/components/timeline/SceneMasterClock"
import MediaManager from "@/components/media-manager"

import type {
  StoryboardEditorProps,
  StoryboardScene,
  StoryboardImage,
  AudioTrack,
  CameraSettings,
  FavoriteCamera,
  FavoriteLens,
} from "./types"
import {
  formatTime,
  DEFAULT_CAMERA_SETTINGS,
  calculateCurrentShotStartTime,
  getAllShots,
  findShotAtTime,
} from "./utils"

// Tipos de errores de audio
enum AudioErrorType {
  LOAD_FAILED = "load_failed",
  PLAY_FAILED = "play_failed",
  DECODE_FAILED = "decode_failed",
  NETWORK_ERROR = "network_error",
  ABORTED = "aborted",
  UNKNOWN = "unknown",
}

// Interfaz para errores de audio
interface AudioErrorState {
  hasError: boolean
  type: AudioErrorType
  message: string
  timestamp: number
  retryCount: number
}

export function StoryboardEditor({ projectId, userId, scenes: scriptScenes, onScenesUpdate }: StoryboardEditorProps) {
  // === STATE HOOKS ===
  const [internalScenes, setInternalScenes] = useState<StoryboardScene[]>([])
  const [activeSceneIndex, setActiveSceneIndex] = useState(0)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [audioTrack, setAudioTrack] = useState<AudioTrack | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioCurrentTime, setAudioCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [audioVolume, setAudioVolume] = useState(1)
  const [audioMuted, setAudioMuted] = useState(false)
  const [audioError, setAudioError] = useState(false)
  const [audioErrorDetails, setAudioErrorDetails] = useState<AudioErrorState>({
    hasError: false,
    type: AudioErrorType.UNKNOWN,
    message: "",
    timestamp: 0,
    retryCount: 0,
  })
  const [showControls, setShowControls] = useState(true)
  const [autoSyncAudioWithShots, setAutoSyncAudioWithShots] = useState(true)
  const [showSceneMasterClock, setShowSceneMasterClock] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null)
  const [imageDescriptions, setImageDescriptions] = useState<Record<string, string>>({})
  const [favoriteCameras, setFavoriteCameras] = useState<FavoriteCamera[]>([])
  const [favoriteLenses, setFavoriteLenses] = useState<FavoriteLens[]>([])
  const [showMediaManager, setShowMediaManager] = useState(false)
  const [isRecoveringAudio, setIsRecoveringAudio] = useState(false)

  // === REFS ===
  const scenesInitializedRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastUpdateTimeRef = useRef<number>(Date.now())
  const audioPlayPromiseRef = useRef<Promise<void> | undefined>(undefined)
  const maxRetryAttemptsRef = useRef(3)

  // === DERIVED STATE ===
  const activeScene = internalScenes[activeSceneIndex]
  const activeImage = activeScene?.images?.[activeImageIndex]

  // === INITIALIZATION ===
  useEffect(() => {
    // Initialize scenes from script scenes or localStorage
    if (!scenesInitializedRef.current && scriptScenes && scriptScenes.length > 0) {
      const storedScenes = localStorage.getItem(`storyboard-scenes-${projectId}`)

      if (storedScenes) {
        try {
          const parsedScenes = JSON.parse(storedScenes)
          setInternalScenes(parsedScenes)
        } catch (error) {
          console.error("Error parsing stored scenes:", error)
          initializeScenesFromScript()
        }
      } else {
        initializeScenesFromScript()
      }

      scenesInitializedRef.current = true
    }

    // Load other stored data
    loadStoredData()
  }, [scriptScenes, projectId])

  const initializeScenesFromScript = () => {
    const initialScenes = scriptScenes.map((scene, index) => ({
      id: scene.id || uuidv4(),
      title: scene.title || `Escena ${index + 1}`,
      description: scene.description || "",
      images: [
        {
          id: `${scene.id || uuidv4()}-1`,
          url: "/placeholder.svg?height=300&width=500",
          description: "",
          duration: 3,
          cameraSettings: { ...DEFAULT_CAMERA_SETTINGS },
        },
      ],
      order: index,
      location: scene.location || "",
      time: scene.time || "",
      notes: "",
    }))

    setInternalScenes(initialScenes)
  }

  const loadStoredData = () => {
    // Load favorite cameras
    const storedCameras = localStorage.getItem(`favorite-cameras-${userId}`)
    if (storedCameras) {
      try {
        setFavoriteCameras(JSON.parse(storedCameras))
      } catch (error) {
        console.error("Error parsing stored cameras:", error)
      }
    }

    // Load favorite lenses
    const storedLenses = localStorage.getItem(`favorite-lenses-${userId}`)
    if (storedLenses) {
      try {
        setFavoriteLenses(JSON.parse(storedLenses))
      } catch (error) {
        console.error("Error parsing stored lenses:", error)
      }
    }

    // Load audio track
    const storedAudioTrack = localStorage.getItem(`audio-track-${projectId}`)
    if (storedAudioTrack) {
      try {
        setAudioTrack(JSON.parse(storedAudioTrack))
      } catch (error) {
        console.error("Error parsing stored audio track:", error)
      }
    }

    // Load image descriptions
    const storedDescriptions = localStorage.getItem(`image-descriptions-${projectId}`)
    if (storedDescriptions) {
      try {
        setImageDescriptions(JSON.parse(storedDescriptions))
      } catch (error) {
        console.error("Error parsing stored descriptions:", error)
      }
    }
  }

  // === PERSISTENCE ===
  useEffect(() => {
    if (internalScenes.length > 0) {
      localStorage.setItem(`storyboard-scenes-${projectId}`, JSON.stringify(internalScenes))

      if (onScenesUpdate) {
        onScenesUpdate(internalScenes)
      }
    }
  }, [internalScenes, projectId, onScenesUpdate])

  useEffect(() => {
    if (Object.keys(imageDescriptions).length > 0) {
      localStorage.setItem(`image-descriptions-${projectId}`, JSON.stringify(imageDescriptions))
    }
  }, [imageDescriptions, projectId])

  useEffect(() => {
    if (favoriteCameras.length > 0) {
      localStorage.setItem(`favorite-cameras-${userId}`, JSON.stringify(favoriteCameras))
    }
  }, [favoriteCameras, userId])

  useEffect(() => {
    if (favoriteLenses.length > 0) {
      localStorage.setItem(`favorite-lenses-${userId}`, JSON.stringify(favoriteLenses))
    }
  }, [favoriteLenses, userId])

  useEffect(() => {
    if (audioTrack) {
      localStorage.setItem(`audio-track-${projectId}`, JSON.stringify(audioTrack))
    }
  }, [audioTrack, projectId])

  // === PLAYBACK LOGIC ===
  useEffect(() => {
    if (isPlaying) {
      startPlaybackTimer()
    } else {
      stopPlaybackTimer()
    }

    return () => {
      stopPlaybackTimer()
    }
  }, [isPlaying, activeImageIndex, activeSceneIndex, internalScenes])

  const startPlaybackTimer = () => {
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current)
    }

    lastUpdateTimeRef.current = Date.now()

    playbackTimerRef.current = setInterval(() => {
      const now = Date.now()
      const elapsed = (now - lastUpdateTimeRef.current) / 1000
      lastUpdateTimeRef.current = now

      updatePlaybackTime(elapsed)
    }, 100)
  }

  const stopPlaybackTimer = () => {
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current)
      playbackTimerRef.current = null
    }
  }

  const updatePlaybackTime = (elapsed: number) => {
    setCurrentTime((prevTime) => {
      const newTime = prevTime + elapsed

      // Check if we need to advance to the next image
      const activeScene = internalScenes[activeSceneIndex]
      if (activeScene && activeScene.images) {
        const activeImage = activeScene.images[activeImageIndex]
        const imageDuration = activeImage?.duration || 3

        const startTime = calculateCurrentShotStartTime(internalScenes, activeSceneIndex, activeImageIndex)

        if (newTime >= startTime + imageDuration) {
          // Time to move to the next image or scene
          if (activeImageIndex < activeScene.images.length - 1) {
            // Next image in same scene
            setActiveImageIndex(activeImageIndex + 1)
          } else if (activeSceneIndex < internalScenes.length - 1) {
            // First image of next scene
            setActiveSceneIndex(activeSceneIndex + 1)
            setActiveImageIndex(0)
          } else {
            // End of storyboard
            setIsPlaying(false)
            return startTime + imageDuration
          }
        }
      }

      return newTime
    })
  }

  // === AUDIO ERROR HANDLING ===
  const handleAudioError = useCallback(
    (errorType: AudioErrorType, errorMessage: string) => {
      // Actualizar el estado de error
      setAudioError(true)
      setAudioErrorDetails({
        hasError: true,
        type: errorType,
        message: errorMessage,
        timestamp: Date.now(),
        retryCount: audioErrorDetails.retryCount + 1,
      })

      // Mostrar notificación al usuario
      toast({
        title: "Error de audio",
        description: `${errorMessage}. Intenta recargar el audio.`,
        variant: "destructive",
      })

      // Detener la reproducción si estaba en curso
      if (isPlaying) {
        setIsPlaying(false)
      }

      console.error(`Audio error (${errorType}):`, errorMessage)
    },
    [audioErrorDetails.retryCount, isPlaying],
  )

  const retryAudioOperation = useCallback(async () => {
    if (!audioRef.current || !audioTrack) return false

    setIsRecoveringAudio(true)

    try {
      // Reiniciar el elemento de audio
      audioRef.current.pause()

      // Recargar la fuente de audio
      audioRef.current.load()

      // Esperar a que el audio esté listo
      await new Promise<void>((resolve, reject) => {
        if (!audioRef.current) return reject("No audio element")

        const onCanPlay = () => {
          audioRef.current?.removeEventListener("canplay", onCanPlay)
          resolve()
        }

        const onError = (e: Event) => {
          audioRef.current?.removeEventListener("error", onError)
          reject(new Error("Failed to reload audio"))
        }

        audioRef.current.addEventListener("canplay", onCanPlay)
        audioRef.current.addEventListener("error", onError)

        // Timeout para evitar esperas infinitas
        setTimeout(() => {
          audioRef.current?.removeEventListener("canplay", onCanPlay)
          audioRef.current?.removeEventListener("error", onError)
          reject(new Error("Audio reload timeout"))
        }, 10000)
      })

      // Restablecer el estado de error
      setAudioError(false)
      setAudioErrorDetails({
        hasError: false,
        type: AudioErrorType.UNKNOWN,
        message: "",
        timestamp: 0,
        retryCount: 0,
      })

      toast({
        title: "Audio recuperado",
        description: "El audio se ha recargado correctamente.",
      })

      return true
    } catch (error) {
      console.error("Error al reintentar operación de audio:", error)

      // Si hemos excedido el número máximo de intentos, mostrar un mensaje más definitivo
      if (audioErrorDetails.retryCount >= maxRetryAttemptsRef.current) {
        toast({
          title: "Error persistente",
          description:
            "No se pudo recuperar el audio después de varios intentos. Intenta cargar otro archivo de audio.",
          variant: "destructive",
        })
      }

      return false
    } finally {
      setIsRecoveringAudio(false)
    }
  }, [audioTrack, audioErrorDetails.retryCount])

  // === AUDIO HANDLING ===
  useEffect(() => {
    if (audioRef.current) {
      // Variable para rastrear la promesa de reproducción
      let playPromise: Promise<void> | undefined

      if (isPlaying) {
        const playAudio = async () => {
          try {
            // Solo intentar reproducir si el audio está pausado y no hay errores
            if (audioRef.current && audioRef.current.paused && !audioError) {
              // Guardar la promesa para manejarla correctamente
              playPromise = audioRef.current.play()
              audioPlayPromiseRef.current = playPromise

              // Esperar a que se complete la promesa antes de cualquier otra acción
              await playPromise

              // Limpiar la referencia a la promesa cuando se completa
              audioPlayPromiseRef.current = undefined
            }
          } catch (error) {
            console.error("Error playing audio:", error)

            // Determinar el tipo de error
            let errorType = AudioErrorType.PLAY_FAILED
            let errorMessage = "No se pudo reproducir el audio"

            if (error instanceof DOMException) {
              if (error.name === "AbortError") {
                errorType = AudioErrorType.ABORTED
                errorMessage = "La reproducción fue interrumpida"
              } else if (error.name === "NotAllowedError") {
                errorType = AudioErrorType.PLAY_FAILED
                errorMessage = "El navegador bloqueó la reproducción automática"
              } else if (error.name === "NotSupportedError") {
                errorType = AudioErrorType.DECODE_FAILED
                errorMessage = "Formato de audio no soportado"
              }
            }

            handleAudioError(errorType, errorMessage)
            setIsPlaying(false)
            audioPlayPromiseRef.current = undefined
          }
        }

        playAudio()
      } else {
        // Solo pausar si hay un audioRef y si no está ya pausado
        if (audioRef.current && !audioRef.current.paused) {
          // Verificar si hay una promesa pendiente antes de pausar
          if (audioPlayPromiseRef.current !== undefined) {
            // Esperar a que la promesa se resuelva antes de pausar
            audioPlayPromiseRef.current
              .then(() => {
                if (audioRef.current) audioRef.current.pause()
                audioPlayPromiseRef.current = undefined
              })
              .catch((err) => {
                console.error("Error handling play promise:", err)
                audioPlayPromiseRef.current = undefined
              })
          } else {
            // No hay promesa pendiente, pausar directamente
            audioRef.current.pause()
          }
        }
      }
    }
  }, [isPlaying, audioError, handleAudioError])

  useEffect(() => {
    if (audioRef.current && audioTrack) {
      // Configurar el audio cuando cambia la fuente
      const handleCanPlay = () => {
        console.log("Audio can now be played")
        setAudioError(false)
        setAudioErrorDetails({
          hasError: false,
          type: AudioErrorType.UNKNOWN,
          message: "",
          timestamp: 0,
          retryCount: 0,
        })
      }

      const handleLoadedMetadata = () => {
        console.log("Audio metadata loaded, duration:", audioRef.current?.duration)
        if (audioRef.current) {
          setAudioDuration(audioRef.current.duration)
        }
      }

      audioRef.current.addEventListener("canplay", handleCanPlay)
      audioRef.current.addEventListener("loadedmetadata", handleLoadedMetadata)

      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener("canplay", handleCanPlay)
          audioRef.current.removeEventListener("loadedmetadata", handleLoadedMetadata)
        }
      }
    }
  }, [audioTrack])

  useEffect(() => {
    if (audioRef.current) {
      const audioElement = audioRef.current

      const handleTimeUpdate = () => {
        setAudioCurrentTime(audioElement.currentTime)
      }

      const handleDurationChange = () => {
        setAudioDuration(audioElement.duration)
      }

      const handleEnded = () => {
        if (!isPlaying) return
        audioElement.currentTime = 0
        audioElement.play().catch((err) => {
          console.error("Error replaying audio:", err)
          handleAudioError(AudioErrorType.PLAY_FAILED, "Error al reiniciar la reproducción")
        })
      }

      const handleError = (e: Event) => {
        // Determinar el tipo de error basado en el código de error
        let errorType = AudioErrorType.UNKNOWN
        let errorMessage = "Error desconocido en la reproducción de audio"

        if (audioElement.error) {
          switch (audioElement.error.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              errorType = AudioErrorType.ABORTED
              errorMessage = "La carga del audio fue abortada"
              break
            case MediaError.MEDIA_ERR_NETWORK:
              errorType = AudioErrorType.NETWORK_ERROR
              errorMessage = "Error de red al cargar el audio"
              break
            case MediaError.MEDIA_ERR_DECODE:
              errorType = AudioErrorType.DECODE_FAILED
              errorMessage = "Error al decodificar el audio"
              break
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorType = AudioErrorType.LOAD_FAILED
              errorMessage = "Formato de audio no soportado"
              break
          }
        }

        handleAudioError(errorType, errorMessage)
      }

      audioElement.addEventListener("timeupdate", handleTimeUpdate)
      audioElement.addEventListener("durationchange", handleDurationChange)
      audioElement.addEventListener("ended", handleEnded)
      audioElement.addEventListener("error", handleError)

      return () => {
        audioElement.removeEventListener("timeupdate", handleTimeUpdate)
        audioElement.removeEventListener("durationchange", handleDurationChange)
        audioElement.removeEventListener("ended", handleEnded)
        audioElement.removeEventListener("error", handleError)
      }
    }
  }, [isPlaying, handleAudioError])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = audioMuted ? 0 : audioVolume
    }
  }, [audioVolume, audioMuted])

  // === CORE LOGIC / HANDLERS ===
  const togglePlayPause = useCallback(() => {
    // Si hay un error de audio y se intenta reproducir, intentar recuperar primero
    if (audioError && !isPlaying && audioRef.current) {
      retryAudioOperation().then((success) => {
        if (success) {
          setIsPlaying(true)
        }
      })
      return
    }

    if (!audioRef.current) {
      setIsPlaying((prev) => !prev)
      return
    }

    if (isPlaying) {
      // Si está reproduciendo, intentar pausar
      // La pausa real se maneja en el useEffect
      setIsPlaying(false)
    } else {
      // Si está pausado, intentar reproducir
      setIsPlaying(true) // Optimistic update
      // La reproducción real se maneja en el useEffect
    }
  }, [isPlaying, audioError, retryAudioOperation])

  const nextImage = useCallback(() => {
    const activeScene = internalScenes[activeSceneIndex]
    if (activeScene && activeScene.images && activeImageIndex < activeScene.images.length - 1) {
      goToShot(activeSceneIndex, activeImageIndex + 1)
    }
  }, [activeSceneIndex, activeImageIndex, internalScenes])

  const prevImage = useCallback(() => {
    if (activeImageIndex > 0) {
      goToShot(activeSceneIndex, activeImageIndex - 1)
    }
  }, [activeSceneIndex, activeImageIndex])

  const nextScene = useCallback(() => {
    if (activeSceneIndex < internalScenes.length - 1) {
      goToShot(activeSceneIndex + 1, 0)
    }
  }, [activeSceneIndex, internalScenes.length])

  const prevScene = useCallback(() => {
    if (activeSceneIndex > 0) {
      const prevScene = internalScenes[activeSceneIndex - 1]
      const lastImageIndex = prevScene.images.length - 1
      goToShot(activeSceneIndex - 1, Math.max(0, lastImageIndex))
    }
  }, [activeSceneIndex, internalScenes])

  const goToShot = useCallback(
    (sceneIndex: number, imageIndex: number, syncAudio = true) => {
      setActiveSceneIndex(sceneIndex)
      setActiveImageIndex(imageIndex)

      const startTime = calculateCurrentShotStartTime(internalScenes, sceneIndex, imageIndex)

      setCurrentTime(startTime)

      if (syncAudio && audioRef.current && autoSyncAudioWithShots) {
        audioRef.current.currentTime = startTime
      }
    },
    [internalScenes, autoSyncAudioWithShots],
  )

  const seekToPosition = useCallback(
    (time: number) => {
      setCurrentTime(time)

      if (audioRef.current) {
        audioRef.current.currentTime = time
      }

      // Find which shot corresponds to this time
      const shots = getAllShots(internalScenes)
      const shot = findShotAtTime(shots, time)

      if (shot) {
        setActiveSceneIndex(shot.sceneIndex)
        setActiveImageIndex(shot.imageIndex)
      }
    },
    [internalScenes],
  )

  const updateImageDescription = useCallback(
    (description: string) => {
      if (!activeImage) return

      // Update image descriptions state
      setImageDescriptions((prev) => ({
        ...prev,
        [activeImage.id]: description,
      }))

      // Update internal scenes
      setInternalScenes((prev) => {
        const newScenes = [...prev]
        const scene = newScenes[activeSceneIndex]

        if (scene && scene.images) {
          const newImages = [...scene.images]
          newImages[activeImageIndex] = {
            ...newImages[activeImageIndex],
            description,
          }

          newScenes[activeSceneIndex] = {
            ...scene,
            images: newImages,
          }
        }

        // Guardar en localStorage
        localStorage.setItem(`storynema_storyboard_scenes_${projectId}`, JSON.stringify(newScenes))

        return newScenes
      })
    },
    [activeSceneIndex, activeImageIndex, activeImage, projectId],
  )

  const updateImageDuration = useCallback(
    (duration: number) => {
      if (!activeImage || duration <= 0) return

      setInternalScenes((prev) => {
        const newScenes = [...prev]
        const scene = newScenes[activeSceneIndex]

        if (scene && scene.images) {
          const newImages = [...scene.images]
          newImages[activeImageIndex] = {
            ...newImages[activeImageIndex],
            duration,
          }

          newScenes[activeSceneIndex] = {
            ...scene,
            images: newImages,
          }
        }

        return newScenes
      })

      // Recalculate total duration
      calculateTotalDuration()
    },
    [activeSceneIndex, activeImageIndex, activeImage],
  )

  const calculateTotalDuration = useCallback(() => {
    let duration = 0

    internalScenes.forEach((scene) => {
      if (scene.images) {
        scene.images.forEach((image) => {
          duration += image.duration || 3
        })
      }
    })

    setTotalDuration(duration)
  }, [internalScenes])

  const updateCameraSetting = useCallback(
    (setting: keyof CameraSettings, value: string) => {
      if (!activeImage) return

      setInternalScenes((prev) => {
        const newScenes = [...prev]
        const scene = newScenes[activeSceneIndex]

        if (scene && scene.images) {
          const newImages = [...scene.images]
          const currentSettings = newImages[activeImageIndex].cameraSettings || DEFAULT_CAMERA_SETTINGS

          newImages[activeImageIndex] = {
            ...newImages[activeImageIndex],
            cameraSettings: {
              ...currentSettings,
              [setting]: value,
            },
          }

          newScenes[activeSceneIndex] = {
            ...scene,
            images: newImages,
          }
        }

        return newScenes
      })
    },
    [activeSceneIndex, activeImageIndex, activeImage],
  )

  const updateSceneMetadata = useCallback(
    (field: string, value: string) => {
      setInternalScenes((prev) => {
        const newScenes = [...prev]

        if (newScenes[activeSceneIndex]) {
          newScenes[activeSceneIndex] = {
            ...newScenes[activeSceneIndex],
            [field]: value,
          }
        }

        return newScenes
      })
    },
    [activeSceneIndex],
  )

  const addImageToScene = useCallback(() => {
    if (!activeScene) return

    setInternalScenes((prev) => {
      const newScenes = [...prev]
      const scene = newScenes[activeSceneIndex]

      if (scene) {
        const newImage: StoryboardImage = {
          id: uuidv4(),
          url: "/blank-comic-panel.png",
          description: "",
          duration: 3,
          cameraSettings: DEFAULT_CAMERA_SETTINGS,
        }

        newScenes[activeSceneIndex] = {
          ...scene,
          images: [...(scene.images || []), newImage],
        }
      }

      return newScenes
    })

    // Set active image to the new one
    setTimeout(() => {
      setActiveImageIndex(activeScene.images.length)
    }, 100)
  }, [activeScene, activeSceneIndex])

  const removeImage = useCallback(() => {
    if (!activeScene || !activeScene.images || activeScene.images.length <= 1) {
      return
    }

    setInternalScenes((prev) => {
      const newScenes = [...prev]
      const scene = newScenes[activeSceneIndex]

      if (scene && scene.images) {
        const newImages = scene.images.filter((_, index) => index !== activeImageIndex)

        newScenes[activeSceneIndex] = {
          ...scene,
          images: newImages,
        }
      }

      return newScenes
    })

    // Adjust active image index if needed
    if (activeImageIndex > 0) {
      setActiveImageIndex(activeImageIndex - 1)
    }
  }, [activeScene, activeSceneIndex, activeImageIndex])

  const handleImageReorder = useCallback(
    (oldIndex: number, newIndex: number) => {
      setInternalScenes((prev) => {
        const newScenes = [...prev]
        const scene = newScenes[activeSceneIndex]

        if (scene && scene.images) {
          newScenes[activeSceneIndex] = {
            ...scene,
            images: arrayMove(scene.images, oldIndex, newIndex),
          }
        }

        return newScenes
      })

      // Update active image index if it was moved
      if (activeImageIndex === oldIndex) {
        setActiveImageIndex(newIndex)
      } else if (activeImageIndex === newIndex) {
        setActiveImageIndex(oldIndex)
      }
    },
    [activeSceneIndex, activeImageIndex],
  )

  const handleUploadClick = useCallback(() => {
    setShowMediaManager(true)
  }, [])

  const handleMediaSelected = useCallback(
    (url: string) => {
      if (!activeScene) return

      setInternalScenes((prev) => {
        const newScenes = [...prev]
        const scene = newScenes[activeSceneIndex]

        if (scene && scene.images && activeImageIndex < scene.images.length) {
          const newImages = [...scene.images]
          newImages[activeImageIndex] = {
            ...newImages[activeImageIndex],
            url,
          }

          newScenes[activeSceneIndex] = {
            ...scene,
            images: newImages,
          }
        }

        // Guardar en localStorage
        localStorage.setItem(`storynema_storyboard_scenes_${projectId}`, JSON.stringify(newScenes))

        return newScenes
      })
    },
    [activeScene, activeSceneIndex, activeImageIndex, projectId],
  )

  const handleMultipleMediaSelected = useCallback(
    (urls: string[]) => {
      if (!activeScene || urls.length === 0) return

      setInternalScenes((prev) => {
        const newScenes = [...prev]
        const scene = newScenes[activeSceneIndex]

        if (scene) {
          const newImages = [...(scene.images || [])]

          urls.forEach((url) => {
            newImages.push({
              id: uuidv4(),
              url,
              description: "",
              duration: 3,
              cameraSettings: DEFAULT_CAMERA_SETTINGS,
            })
          })

          newScenes[activeSceneIndex] = {
            ...scene,
            images: newImages,
          }
        }

        return newScenes
      })

      setShowMediaManager(false)
    },
    [activeScene, activeSceneIndex],
  )

  const handleAudioUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const url = URL.createObjectURL(file)

    setAudioTrack({
      id: uuidv4(),
      url,
      name: file.name,
      duration: 0, // Will be updated when audio loads
    })

    // Reset file input
    e.target.value = ""

    // Reset error state when se carga un nuevo audio
    setAudioError(false)
    setAudioErrorDetails({
      hasError: false,
      type: AudioErrorType.UNKNOWN,
      message: "",
      timestamp: 0,
      retryCount: 0,
    })
  }, [])

  const removeAudioTrack = useCallback(() => {
    if (audioTrack && audioTrack.url.startsWith("blob:")) {
      URL.revokeObjectURL(audioTrack.url)
    }

    setAudioTrack(null)
    localStorage.removeItem(`audio-track-${projectId}`)

    // Reset error state when se elimina el audio
    setAudioError(false)
    setAudioErrorDetails({
      hasError: false,
      type: AudioErrorType.UNKNOWN,
      message: "",
      timestamp: 0,
      retryCount: 0,
    })
  }, [audioTrack, projectId])

  const toggleAudioMute = useCallback(() => {
    setAudioMuted((prev) => !prev)
  }, [])

  const handleAudioVolumeChange = useCallback((values: number[]) => {
    if (values.length > 0) {
      setAudioVolume(values[0])
    }
  }, [])

  const addToFavoriteCameras = useCallback((model: string) => {
    setFavoriteCameras((prev) => [...prev, { id: uuidv4(), model }])
  }, [])

  const removeFromFavoriteCameras = useCallback((id: string) => {
    setFavoriteCameras((prev) => prev.filter((camera) => camera.id !== id))
  }, [])

  const addToFavoriteLenses = useCallback((name: string) => {
    setFavoriteLenses((prev) => [...prev, { id: uuidv4(), name }])
  }, [])

  const removeFromFavoriteLenses = useCallback((id: string) => {
    setFavoriteLenses((prev) => prev.filter((lens) => lens.id !== id))
  }, [])

  // Calculate total duration when scenes change
  useEffect(() => {
    calculateTotalDuration()
  }, [internalScenes, calculateTotalDuration])

  // === RENDER LOGIC ===
  if (!activeScene || !activeScene.images || activeScene.images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <p className="text-lg text-gray-500">No hay imágenes en esta escena.</p>
        <Button onClick={addImageToScene}>Añadir primera imagen</Button>
      </div>
    )
  }

  const handleSceneMasterClockTimeUpdate = (time: number) => {
    setCurrentTime(time)
    if (audioRef.current) {
      audioRef.current.currentTime = time
    }
  }

  return (
    <>
      {/* Audio Element */}
      <audio ref={audioRef} src={audioTrack?.url} preload="auto" loop={false} />

      {/* Audio Error Banner */}
      {audioError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{audioErrorDetails.message || "Error en la reproducción de audio"}</p>
            </div>
            <div className="ml-auto pl-3">
              <Button
                variant="outline"
                size="sm"
                onClick={retryAudioOperation}
                disabled={isRecoveringAudio}
                className="flex items-center"
              >
                {isRecoveringAudio ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    Recuperando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Reintentar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-row h-full w-full">
        {/* Contenido principal */}
        <div className="flex-grow w-full">
          <div className="w-full p-0">
            <div className="space-y-0 w-full">
              {/* Viewer Area */}
              <Card className="overflow-hidden bg-[#1E1E1E] border-[#333333] w-full p-0">
                <StoryboardViewer
                  activeImage={activeImage}
                  isPlaying={isPlaying}
                  showControls={showControls}
                  activeSceneImages={activeScene.images}
                  activeImageIndex={activeImageIndex}
                  onTogglePlayPause={togglePlayPause}
                  onNextImage={nextImage}
                  onPrevImage={prevImage}
                  onGoToShotByIndex={(index) => goToShot(activeSceneIndex, index, !autoSyncAudioWithShots)}
                  onUpdateImageDuration={updateImageDuration}
                />

                {/* Timelines */}
                <TimelineControls
                  audioTrack={audioTrack}
                  audioCurrentTime={audioCurrentTime}
                  audioDuration={audioDuration}
                  audioVolume={audioVolume}
                  audioMuted={audioMuted}
                  audioError={audioError}
                  currentTime={currentTime}
                  totalDuration={totalDuration}
                  activeScene={activeScene}
                  activeImageIndex={activeImageIndex}
                  getAllShots={() => getAllShots(internalScenes)}
                  formatTime={formatTime}
                  onSeekToPosition={seekToPosition}
                  onToggleMute={toggleAudioMute}
                  onVolumeChange={setAudioVolume}
                  onRemoveAudio={removeAudioTrack}
                  goToShot={goToShot}
                  onUpdateShotTime={setCurrentTime}
                />

                {/* Filmstrip */}
                <Filmstrip
                  images={activeScene.images}
                  activeImageIndex={activeImageIndex}
                  onImageClick={(index) => goToShot(activeSceneIndex, index, !autoSyncAudioWithShots)}
                  onReorderImages={handleImageReorder}
                  onAddImage={addImageToScene}
                />
              </Card>

              {/* Scene Navigation */}
              <SceneNavigation
                activeSceneIndex={activeSceneIndex}
                totalScenes={internalScenes.length}
                onPrevScene={prevScene}
                onNextScene={nextScene}
                isPrevDisabled={activeSceneIndex === 0}
                isNextDisabled={activeSceneIndex === internalScenes.length - 1}
                isPlaying={isPlaying}
                togglePlayPause={togglePlayPause}
                audioTrack={audioTrack}
              />

              {/* Debug Audio Toggle */}
            </div>
          </div>

          {/* Scene Master Clock */}
          <div className="mt-1">
            <SceneMasterClock
              scenes={internalScenes}
              activeSceneIndex={activeSceneIndex}
              setActiveScene={setActiveSceneIndex} // Asegurarse de pasar la función correcta
              activeImageIndex={activeImageIndex}
              currentTime={currentTime}
              isPlaying={isPlaying}
              onTogglePlayPause={togglePlayPause}
              onSeek={seekToPosition}
              onGoToShot={goToShot}
              onTimeUpdate={handleSceneMasterClockTimeUpdate}
            />
          </div>
        </div>

        {/* Panel lateral expandible */}
        <div className="flex-shrink-0">
          <SidePanel
            activeScene={activeScene}
            activeImage={activeImage}
            imageDescriptions={imageDescriptions}
            showControls={showControls}
            isUploading={isUploading}
            userId={userId}
            projectId={projectId}
            audioTrack={audioTrack}
            favoriteCameras={favoriteCameras}
            favoriteLenses={favoriteLenses}
            autoSyncAudioWithShots={autoSyncAudioWithShots}
            onUpdateImageDescription={updateImageDescription}
            onUpdateImageDuration={updateImageDuration}
            onRemoveImage={removeImage}
            onUploadClick={handleUploadClick}
            onMediaSelect={handleMediaSelected}
            onAudioUpload={handleAudioUpload}
            onRemoveAudioTrack={removeAudioTrack}
            onToggleShowControls={setShowControls}
            onToggleAutoSync={setAutoSyncAudioWithShots}
            onUpdateCameraSetting={updateCameraSetting}
            onAddFavoriteCamera={addToFavoriteCameras}
            onRemoveFavoriteCamera={removeFromFavoriteCameras}
            onAddFavoriteLens={addToFavoriteLenses}
            onRemoveFavoriteLens={removeFromFavoriteLenses}
            onUpdateSceneMetadata={updateSceneMetadata}
          />
        </div>
      </div>

      {/* Media Manager Modal */}
      {showMediaManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold">Gestor de medios</h2>
            </div>
            <div className="p-4">
              <MediaManager
                userId={userId}
                projectId={projectId}
                onSelect={handleMediaSelected}
                onMultipleSelect={handleMultipleMediaSelected}
                onClose={() => setShowMediaManager(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default StoryboardEditor
