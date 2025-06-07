"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { v4 as uuidv4 } from "uuid"
import { arrayMove } from "@dnd-kit/sortable"
import { AlertCircle, RefreshCw, Save } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

import StoryboardViewer from "./StoryboardViewer"
import TimelineControls from "./TimelineControls"
import Filmstrip from "./Filmstrip"
import SidePanel from "./SidePanel"
import SceneNavigation from "./SceneNavigation"
import SceneMasterClock from "@/components/timeline/SceneMasterClock"
import MediaManager from "@/components/media-manager"
import AmplifiedViewer from "./AmplifiedViewer"

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

// Importar el sistema mejorado de gestión de descripciones
import {
  saveDescription,
  loadAllDescriptions,
  DescriptionType,
  migrateDescriptions,
  preloadProjectDescriptions,
} from "@/lib/description-manager"

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
  // Corregido: Inicializar con un valor booleano en lugar de una referencia circular
  const [isUploading, setIsUploading] = useState(false)
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null)
  const [imageDescriptions, setImageDescriptions] = useState<Record<string, string>>({})
  const [sceneDescriptions, setSceneDescriptions] = useState<Record<string, string>>({})
  const [favoriteCameras, setFavoriteCameras] = useState<FavoriteCamera[]>([])
  const [favoriteLenses, setFavoriteLenses] = useState<FavoriteLens[]>([])
  const [showMediaManager, setShowMediaManager] = useState(false)
  const [isRecoveringAudio, setIsRecoveringAudio] = useState(false)
  const [isSceneChanging, setIsSceneChanging] = useState(false)
  const [manualSceneSelection, setManualSceneSelection] = useState(false)
  const [isAmplifiedMode, setIsAmplifiedMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // === REFS ===
  const scenesInitializedRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastUpdateTimeRef = useRef<number>(Date.now())
  const audioPlayPromiseRef = useRef<Promise<void> | undefined>(undefined)
  const maxRetryAttemptsRef = useRef(3)
  const sceneChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastManualSceneIndexRef = useRef<number>(0)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // === DERIVED STATE ===
  const activeScene = internalScenes[activeSceneIndex]
  const activeImage = activeScene?.images?.[activeImageIndex]

  // === INITIALIZATION ===
  // Precargar todas las descripciones al inicio
  useEffect(() => {
    if (scriptScenes && scriptScenes.length > 0 && !isInitialized) {
      console.log("Precargando datos del proyecto...")

      // Precargar descripciones
      preloadProjectDescriptions(projectId, scriptScenes)

      setIsInitialized(true)
    }
  }, [projectId, scriptScenes, isInitialized])

  useEffect(() => {
    // Initialize scenes from script scenes or localStorage
    if (!scenesInitializedRef.current && scriptScenes && scriptScenes.length > 0) {
      console.log("Actualizando escenas desde props externos")
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
    console.log("Inicializando escenas desde script:", scriptScenes.length)

    const initialScenes = scriptScenes.map((scene, index) => {
      // Crear la escena base
      const newScene: StoryboardScene = {
        id: scene.id || uuidv4(),
        title: scene.title || `Escena ${index + 1}`,
        description: scene.description || scene.content || "", // Usar content como fallback para description
        images: [],
        order: index,
        location: scene.location || "",
        time: scene.time || "",
        notes: "",
      }

      // Guardar la descripción de la escena
      if (newScene.description) {
        saveDescription(projectId, DescriptionType.SCENE, newScene.id, newScene.description)
      }

      // Procesar las imágenes
      if (scene.images && scene.images.length > 0) {
        newScene.images = scene.images.map((image) => {
          const imageId = image.id || `${newScene.id}-${uuidv4()}`

          // Si hay una descripción, guardarla en el sistema de gestión
          if (image.description) {
            console.log(`Guardando descripción inicial para ${imageId}: ${image.description.substring(0, 30)}...`)
            saveDescription(projectId, DescriptionType.IMAGE, imageId, image.description)
          }

          return {
            id: imageId,
            url: image.url || "/placeholder.svg?height=300&width=500",
            description: image.description || "",
            duration: image.duration || 3,
            cameraSettings: image.cameraSettings || { ...DEFAULT_CAMERA_SETTINGS },
          }
        })
      } else {
        // Si no hay imágenes, crear una por defecto
        const defaultImageId = `${newScene.id}-1`
        newScene.images = [
          {
            id: defaultImageId,
            url: "/placeholder.svg?height=300&width=500",
            description: "",
            duration: 3,
            cameraSettings: { ...DEFAULT_CAMERA_SETTINGS },
          },
        ]
      }

      return newScene
    })

    setInternalScenes(initialScenes)

    // Después de inicializar, cargar las descripciones en el estado
    setTimeout(() => {
      const imageDescs = loadAllDescriptions(projectId, DescriptionType.IMAGE)
      const sceneDescs = loadAllDescriptions(projectId, DescriptionType.SCENE)

      console.log(
        `Después de inicializar, cargadas ${Object.keys(imageDescs).length} descripciones de imágenes y ${Object.keys(sceneDescs).length} descripciones de escenas`,
      )

      setImageDescriptions(imageDescs)
      setSceneDescriptions(sceneDescs)
    }, 100)
  }

  // Modificar la función loadStoredData para cargar las descripciones con el nuevo sistema
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

    // Cargar descripciones de imágenes y escenas con el nuevo sistema
    const loadedImageDescriptions = loadAllDescriptions(projectId, DescriptionType.IMAGE)
    const loadedSceneDescriptions = loadAllDescriptions(projectId, DescriptionType.SCENE)

    // Verificar si hay descripciones en el sistema nuevo
    if (Object.keys(loadedImageDescriptions).length > 0 || Object.keys(loadedSceneDescriptions).length > 0) {
      console.log(
        `Cargadas ${Object.keys(loadedImageDescriptions).length} descripciones de imágenes y ${Object.keys(loadedSceneDescriptions).length} descripciones de escenas del sistema`,
      )
      setImageDescriptions(loadedImageDescriptions)
      setSceneDescriptions(loadedSceneDescriptions)
    } else {
      // Si no hay descripciones en el nuevo sistema, intentar migrar desde la estructura antigua
      console.log("No se encontraron descripciones en el nuevo sistema, intentando migrar...")

      // Verificar si hay descripciones en el formato antiguo
      const legacyDescriptions = localStorage.getItem(`image-descriptions-${projectId}`)
      if (legacyDescriptions) {
        try {
          const parsedLegacyDescriptions = JSON.parse(legacyDescriptions)
          console.log(`Encontradas ${Object.keys(parsedLegacyDescriptions).length} descripciones en formato antiguo`)

          // Migrar las descripciones antiguas al nuevo sistema
          migrateDescriptions(projectId, internalScenes, parsedLegacyDescriptions)

          // Cargar las descripciones migradas
          const migratedImageDescriptions = loadAllDescriptions(projectId, DescriptionType.IMAGE)
          const migratedSceneDescriptions = loadAllDescriptions(projectId, DescriptionType.SCENE)

          setImageDescriptions(migratedImageDescriptions)
          setSceneDescriptions(migratedSceneDescriptions)

          console.log(
            `Migración completada: ${Object.keys(migratedImageDescriptions).length} descripciones de imágenes y ${Object.keys(migratedSceneDescriptions).length} descripciones de escenas disponibles`,
          )
        } catch (error) {
          console.error("Error al migrar descripciones antiguas:", error)
        }
      } else {
        console.log("No se encontraron descripciones en ningún formato")

        // Si no hay descripciones en ningún formato, extraer las descripciones de la estructura principal
        if (internalScenes.length > 0) {
          console.log("Extrayendo descripciones de la estructura principal...")
          const extractedImageDescriptions: Record<string, string> = {}
          const extractedSceneDescriptions: Record<string, string> = {}

          // Extraer descripciones de scriptScenes primero (datos originales)
          if (scriptScenes && scriptScenes.length > 0) {
            scriptScenes.forEach((scene) => {
              // Extraer descripción de escena
              if (scene.id && (scene.description || scene.content)) {
                extractedSceneDescriptions[scene.id] = scene.description || scene.content || ""
                console.log(`Extraída descripción de escena para ${scene.id}`)
              }

              // Extraer descripciones de imágenes
              if (scene.images && Array.isArray(scene.images)) {
                scene.images.forEach((image) => {
                  if (image.id && image.description) {
                    extractedImageDescriptions[image.id] = image.description
                    console.log(
                      `Extraída descripción de scriptScenes para ${image.id}: ${image.description.substring(0, 30)}...`,
                    )
                  }
                })
              }
            })
          }

          // Luego extraer de internalScenes (por si hay alguna diferencia)
          internalScenes.forEach((scene) => {
            // Extraer descripción de escena
            if (scene.id && scene.description && !extractedSceneDescriptions[scene.id]) {
              extractedSceneDescriptions[scene.id] = scene.description
              console.log(`Extraída descripción de escena para ${scene.id} desde internalScenes`)
            }

            // Extraer descripciones de imágenes
            if (scene.images && Array.isArray(scene.images)) {
              scene.images.forEach((image) => {
                if (image.id && image.description && !extractedImageDescriptions[image.id]) {
                  extractedImageDescriptions[image.id] = image.description
                  console.log(
                    `Extraída descripción de internalScenes para ${image.id}: ${image.description.substring(0, 30)}...`,
                  )
                }
              })
            }
          })

          const totalExtracted =
            Object.keys(extractedImageDescriptions).length + Object.keys(extractedSceneDescriptions).length

          if (totalExtracted > 0) {
            console.log(`Extraídas ${totalExtracted} descripciones de la estructura principal`)

            // Guardar las descripciones extraídas en el nuevo sistema
            Object.entries(extractedImageDescriptions).forEach(([id, description]) => {
              saveDescription(projectId, DescriptionType.IMAGE, id, description)
            })

            Object.entries(extractedSceneDescriptions).forEach(([id, description]) => {
              saveDescription(projectId, DescriptionType.SCENE, id, description)
            })

            // Actualizar el estado
            setImageDescriptions(extractedImageDescriptions)
            setSceneDescriptions(extractedSceneDescriptions)
          }
        }
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
      // Al iniciar la reproducción, desactivamos el modo de selección manual
      // para permitir que la reproducción avance normalmente
      setManualSceneSelection(false)
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
          // Al iniciar la reproducción, desactivamos el modo de selección manual
          setManualSceneSelection(false)
        }
      })
      return
    }

    if (!audioRef.current) {
      setIsPlaying((prev) => !prev)
      // Al iniciar la reproducción, desactivamos el modo de selección manual
      if (!isPlaying) {
        setManualSceneSelection(false)
      }
      return
    }

    if (isPlaying) {
      // Si está reproduciendo, intentar pausar
      // La pausa real se maneja en el useEffect
      setIsPlaying(false)
    } else {
      // Si está pausado, intentar reproducir
      setIsPlaying(true) // Optimistic update
      // Al iniciar la reproducción, desactivamos el modo de selección manual
      setManualSceneSelection(false)
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
      // Activar modo de selección manual al cambiar de escena manualmente
      setManualSceneSelection(true)
      goToShot(activeSceneIndex + 1, 0)
    }
  }, [activeSceneIndex, internalScenes.length])

  const prevScene = useCallback(() => {
    if (activeSceneIndex > 0) {
      // Activar modo de selección manual al cambiar de escena manualmente
      setManualSceneSelection(true)
      const prevScene = internalScenes[activeSceneIndex - 1]
      const lastImageIndex = prevScene.images.length - 1
      goToShot(activeSceneIndex - 1, Math.max(0, lastImageIndex))
    }
  }, [activeSceneIndex, internalScenes])

  // Función para manejar el cambio de escena de forma segura
  const handleSceneChange = useCallback(
    (newIndex: number) => {
      // Evitar cambios rápidos consecutivos
      if (isSceneChanging) return

      console.log(`Cambio manual a escena: ${newIndex}`)

      // Activar el modo de selección manual para bloquear la sincronización automática
      setManualSceneSelection(true)

      // Guardar el índice de la escena seleccionada manualmente
      lastManualSceneIndexRef.current = newIndex

      setIsSceneChanging(true)
      setActiveSceneIndex(newIndex)

      // También actualizar el tiempo actual para que coincida con el inicio de la escena seleccionada
      let accumulatedTime = 0
      for (let i = 0; i < newIndex; i++) {
        if (internalScenes[i] && internalScenes[i].images) {
          internalScenes[i].images.forEach((img) => {
            accumulatedTime += img.duration || 0
          })
        }
      }
      setCurrentTime(accumulatedTime)

      // Si hay audio, sincronizarlo con la nueva posición
      if (audioRef.current && audioRef.current.readyState >= 2) {
        audioRef.current.currentTime = accumulatedTime
        console.log(`Audio sincronizado con nueva escena: ${accumulatedTime.toFixed(2)}s`)
      }

      // Limpiar cualquier timeout anterior
      if (sceneChangeTimeoutRef.current) {
        clearTimeout(sceneChangeTimeoutRef.current)
      }

      // Establecer un tiempo de espera antes de permitir otro cambio de escena
      sceneChangeTimeoutRef.current = setTimeout(() => {
        console.log("Fin del bloqueo de cambios rápidos")
        setIsSceneChanging(false)
      }, 500) // Tiempo corto solo para evitar cambios rápidos
    },
    [isSceneChanging, internalScenes, audioRef, setCurrentTime],
  )

  // Vamos a corregir el problema de reinicio del audio durante el cambio de escenas
  // Modificar la función goToShot para manejar mejor la sincronización del audio
  const goToShot = useCallback(
    (sceneIndex: number, imageIndex: number, syncAudio = true) => {
      // Verificar si la escena y la imagen existen antes de proceder
      if (!internalScenes[sceneIndex] || !internalScenes[sceneIndex].images[imageIndex]) {
        console.warn("Intento de ir a una toma que no existe:", sceneIndex, imageIndex)
        return
      }

      // Marcar que estamos en un cambio manual
      setIsSceneChanging(true)

      // Usar handleSceneChange para cambiar la escena de forma segura
      if (sceneIndex !== activeSceneIndex) {
        handleSceneChange(sceneIndex)
      } else {
        setActiveSceneIndex(sceneIndex)
      }

      setActiveImageIndex(imageIndex)

      const startTime = calculateCurrentShotStartTime(internalScenes, sceneIndex, imageIndex)
      setCurrentTime(startTime)

      // Solo sincronizar el audio si se solicita explícitamente y está habilitado
      if (syncAudio && audioRef.current && autoSyncAudioWithShots) {
        try {
          // Guardar la posición actual del audio para detectar si es una toma nueva fuera del proyecto
          const currentAudioPosition = audioRef.current.currentTime

          // Verificar si el audio está en un estado válido antes de cambiar su tiempo
          if (audioRef.current.readyState >= 2) {
            // HAVE_CURRENT_DATA o superior
            // Establecer el nuevo tiempo de audio
            audioRef.current.currentTime = startTime

            // Registrar el cambio para depuración
            console.log(`Audio sincronizado: ${currentAudioPosition.toFixed(2)}s → ${startTime.toFixed(2)}s`)
          } else {
            console.warn("Audio no listo para sincronizar. Estado:", audioRef.current.readyState)
            // Programar un intento de sincronización cuando el audio esté listo
            const checkAndSync = () => {
              if (audioRef.current && audioRef.current.readyState >= 2) {
                audioRef.current.currentTime = startTime
                console.log(`Audio sincronizado (retrasado): ${startTime.toFixed(2)}s`)
                audioRef.current.removeEventListener("canplay", checkAndSync)
              }
            }
            audioRef.current.addEventListener("canplay", checkAndSync)
          }
        } catch (error) {
          console.error("Error al sincronizar audio:", error)
        }
      }

      // Limpiar cualquier timeout anterior
      if (sceneChangeTimeoutRef.current) {
        clearTimeout(sceneChangeTimeoutRef.current)
      }

      // Establecer un tiempo de espera antes de permitir otro cambio de escena
      sceneChangeTimeoutRef.current = setTimeout(() => {
        console.log("Fin del bloqueo después de goToShot")
        setIsSceneChanging(false)
      }, 500) // Tiempo corto solo para evitar cambios rápidos
    },
    [internalScenes, autoSyncAudioWithShots, activeSceneIndex, handleSceneChange, setCurrentTime],
  )

  // Limpiar el timeout cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (sceneChangeTimeoutRef.current) {
        clearTimeout(sceneChangeTimeoutRef.current)
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Añadir esta función después de la declaración de goToShot
  const syncTimeReferences = useCallback(() => {
    // Si estamos en modo de selección manual, NO sincronizar automáticamente
    if (manualSceneSelection) {
      console.log("Sincronización automática desactivada: modo de selección manual activo")
      return
    }

    if (!audioRef.current || !autoSyncAudioWithShots) return

    // Si hubo un cambio manual reciente, no sincronizar automáticamente
    if (isSceneChanging) {
      console.log("Sincronización automática bloqueada por cambio manual reciente")
      return
    }

    // Aumentamos significativamente el umbral de diferencia para evitar sincronizaciones innecesarias
    // Solo sincronizar si hay una diferencia muy grande (más de 3 segundos)
    if (Math.abs(currentTime - audioCurrentTime) > 3.0) {
      console.log(
        `Diferencia de tiempo significativa detectada: storyboard=${currentTime.toFixed(2)}s, audio=${audioCurrentTime.toFixed(2)}s`,
      )

      // Decidir cuál es la fuente de verdad (en este caso, el audio)
      setCurrentTime(audioCurrentTime)

      // Encontrar la toma correspondiente a este tiempo
      const shots = getAllShots(internalScenes)
      const shot = findShotAtTime(shots, audioCurrentTime)

      if (shot && (shot.sceneIndex !== activeSceneIndex || shot.imageIndex !== activeImageIndex)) {
        // Registrar la intención de sincronización antes de realizarla
        console.log(
          `Sincronización automática necesaria: Escena ${shot.sceneIndex}, Toma ${shot.imageIndex} (desde Escena ${activeSceneIndex}, Toma ${activeImageIndex})`,
        )

        // Actualizar los índices sin volver a sincronizar el audio (para evitar bucles)
        setActiveSceneIndex(shot.sceneIndex)
        setActiveImageIndex(shot.imageIndex)
        console.log(`Sincronizando índices por tiempo de audio: Escena ${shot.sceneIndex}, Toma ${shot.imageIndex}`)
      }
    }
  }, [
    currentTime,
    audioCurrentTime,
    internalScenes,
    activeSceneIndex,
    activeImageIndex,
    autoSyncAudioWithShots,
    isSceneChanging,
    setCurrentTime,
    manualSceneSelection,
  ])

  const seekToPosition = useCallback(
    (time: number) => {
      // Al buscar una posición específica, desactivamos el modo de selección manual
      setManualSceneSelection(false)

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
    [internalScenes, setCurrentTime],
  )

  // Función para mostrar un indicador visual de guardado
  const showSaveIndicator = useCallback(() => {
    setIsSaving(true)

    // Limpiar cualquier timeout anterior
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Ocultar el indicador después de 1.5 segundos
    saveTimeoutRef.current = setTimeout(() => {
      setIsSaving(false)
    }, 1500)

    // Mostrar toast de confirmación
    toast({
      title: "Guardado",
      description: "La descripción se ha guardado correctamente.",
    })
  }, [])

  // Modificar la función updateImageDescription para usar el nuevo sistema
  const updateImageDescription = useCallback(
    (description: string) => {
      if (!activeImage) return

      // Guardar en el sistema de gestión de descripciones
      if (activeImage.id) {
        console.log(`updateImageDescription: Guardando para ${activeImage.id}: ${description.substring(0, 30)}...`)
        saveDescription(projectId, DescriptionType.IMAGE, activeImage.id, description)

        // Mostrar indicador de guardado
        showSaveIndicator()
      }

      // Actualizar el estado local de descripciones
      setImageDescriptions((prev) => {
        const updated = {
          ...prev,
          [activeImage.id]: description,
        }
        console.log(`Estado de descripciones actualizado, ahora tiene ${Object.keys(updated).length} entradas`)
        return updated
      })

      // También actualizar la descripción en la estructura principal para compatibilidad
      setInternalScenes((prev) => {
        const newScenes = [...prev]
        const scene = newScenes[activeSceneIndex]

        if (scene && scene.images) {
          const newImages = [...scene.images]
          newImages[activeImageIndex] = {
            ...newImages[activeImageIndex],
            description: description,
          }

          newScenes[activeSceneIndex] = {
            ...scene,
            images: newImages,
          }
        }

        return newScenes
      })
    },
    [activeImage, projectId, activeSceneIndex, activeImageIndex, showSaveIndicator],
  )

  // Función para actualizar la descripción de una escena
  const updateSceneDescription = useCallback(
    (description: string) => {
      if (!activeScene) return

      // Guardar en el sistema de gestión de descripciones
      if (activeScene.id) {
        console.log(`updateSceneDescription: Guardando para ${activeScene.id}: ${description.substring(0, 30)}...`)
        saveDescription(projectId, DescriptionType.SCENE, activeScene.id, description)

        // Mostrar indicador de guardado
        showSaveIndicator()
      }

      // Actualizar el estado local de descripciones de escenas
      setSceneDescriptions((prev) => ({
        ...prev,
        [activeScene.id]: description,
      }))

      // Actualizar la descripción en la estructura principal
      setInternalScenes((prev) => {
        const newScenes = [...prev]
        if (newScenes[activeSceneIndex]) {
          newScenes[activeSceneIndex] = {
            ...newScenes[activeSceneIndex],
            description,
          }
        }
        return newScenes
      })
    },
    [activeScene, projectId, activeSceneIndex, showSaveIndicator],
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

  // Definir handleSceneMasterClockTimeUpdate aquí, junto con los otros useCallback
  const handleSceneMasterClockTimeUpdate = useCallback(
    (sceneIndex: number, time: number, accumulatedTime?: number, totalDuration?: number) => {
      // Si estamos en modo de selección manual, NO actualizar el tiempo global
      if (manualSceneSelection && sceneIndex !== activeSceneIndex) {
        console.log("Actualización de tiempo bloqueada: modo de selección manual activo")
        return
      }

      // Usar setTimeout para evitar actualizaciones de estado durante el renderizado
      setTimeout(() => {
        // Calcular el tiempo global basado en el tiempo acumulado y el tiempo dentro de la escena
        const newGlobalTime = (accumulatedTime || 0) + time

        // Actualizar el tiempo actual solo si ha cambiado significativamente
        if (Math.abs(currentTime - newGlobalTime) > 0.1) {
          setCurrentTime(newGlobalTime)

          // Actualizar el tiempo de audio solo si es necesario y el audio está listo
          if (audioRef.current && Math.abs(audioRef.current.currentTime - newGlobalTime) > 0.5) {
            try {
              if (audioRef.current.readyState >= 2) {
                // HAVE_CURRENT_DATA o superior
                audioRef.current.currentTime = newGlobalTime
                console.log(`Audio actualizado por SceneMasterClock: ${newGlobalTime.toFixed(2)}s`)
              } else {
                console.warn("Audio no listo para actualizar desde SceneMasterClock")
              }
            } catch (error) {
              console.error("Error al actualizar tiempo de audio desde SceneMasterClock:", error)
            }
          }
        }
      }, 0)
    },
    [currentTime, setCurrentTime, manualSceneSelection, activeSceneIndex],
  )

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

  // Añadir este useEffect después de los otros useEffects relacionados con el audio
  useEffect(() => {
    // Sincronizar periódicamente para evitar desviaciones, pero con un intervalo mucho más largo
    // y solo si no estamos en modo de selección manual
    const syncInterval = setInterval(() => {
      if (!manualSceneSelection) {
        syncTimeReferences()
      }
    }, 10000) // Cambiar a 10 segundos

    return () => clearInterval(syncInterval)
  }, [syncTimeReferences, manualSceneSelection])

  // Cambiar el nombre de la función para reflejar la nueva funcionalidad
  const handleEnterAmplifiedMode = useCallback(() => {
    setIsAmplifiedMode(true)
  }, [])

  // Cambiar el nombre de la función para reflejar la nueva funcionalidad
  const handleExitAmplifiedMode = useCallback(() => {
    setIsAmplifiedMode(false)
  }, [])

  // === RENDER LOGIC ===
  if (!activeScene || !activeScene.images || activeScene.images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <p className="text-lg text-gray-500">No hay imágenes en esta escena.</p>
        <Button onClick={addImageToScene}>Añadir primera imagen</Button>
      </div>
    )
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

      {/* Indicador de guardado */}
      {isSaving && (
        <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded-md flex items-center shadow-md z-50">
          <Save className="h-4 w-4 mr-2" />
          <span>Guardado</span>
        </div>
      )}

      <div className="flex flex-row h-full w-full">
        {/* Contenido principal */}
        <div className="flex-grow w-full">
          <div className="w-full p-0">
            <div className="space-y-0 w-full">
              {/* Viewer Area */}
              <Card className="overflow-hidden bg-[#1E1E1E] border-[#333333] w-full p-0">
                {/* Modificar la parte donde se renderiza StoryboardViewer para añadir la prop onEnterFullscreen: */}
                {/* Buscar el componente StoryboardViewer y añadir la prop onEnterFullscreen */}
                <StoryboardViewer
                  activeImage={activeImage}
                  isPlaying={isPlaying}
                  showControls={showControls}
                  activeSceneImages={activeScene.images}
                  activeImageIndex={activeImageIndex}
                  projectId={projectId} // Añadir esta prop
                  onTogglePlayPause={togglePlayPause}
                  onNextImage={nextImage}
                  onPrevImage={prevImage}
                  onGoToShotByIndex={(index) => goToShot(activeSceneIndex, index, !autoSyncAudioWithShots)}
                  onUpdateImageDuration={updateImageDuration}
                  onEnterFullscreen={handleEnterAmplifiedMode}
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
            </div>
          </div>

          {/* Scene Master Clock */}
          <div className="mt-1">
            <SceneMasterClock
              scenes={internalScenes}
              activeSceneIndex={activeSceneIndex}
              setActiveScene={handleSceneChange} // Usar handleSceneChange en lugar de setActiveSceneIndex directamente
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
            sceneDescriptions={sceneDescriptions}
            showControls={showControls}
            isUploading={isUploading}
            userId={userId}
            projectId={projectId}
            audioTrack={audioTrack}
            favoriteCameras={favoriteCameras}
            favoriteLenses={favoriteLenses}
            autoSyncAudioWithShots={autoSyncAudioWithShots}
            onUpdateImageDescription={updateImageDescription}
            onUpdateSceneDescription={updateSceneDescription}
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
      {/* Cambiar el componente FullscreenViewer por AmplifiedViewer */}
      <AmplifiedViewer
        isOpen={isAmplifiedMode}
        onClose={handleExitAmplifiedMode}
        activeScene={activeScene}
        activeImage={activeImage}
        activeSceneIndex={activeSceneIndex}
        activeImageIndex={activeImageIndex}
        isPlaying={isPlaying}
        projectId={projectId} // Añadir esta prop
        onTogglePlayPause={togglePlayPause}
        onNextImage={nextImage}
        onPrevImage={prevImage}
        onGoToShot={goToShot}
        scenes={internalScenes}
      />
    </>
  )
}

export default StoryboardEditor
