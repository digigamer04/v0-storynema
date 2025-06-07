"use client"

import { SelectContent } from "@/components/ui/select"
import { SelectValue } from "@/components/ui/select"
import { SelectTrigger } from "@/components/ui/select"
import { Select, SelectItem as SelectItemComponent } from "@/components/ui/select"
import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import Image from "next/image"
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Film,
  ImageIcon,
  Mic,
  Plus,
  Settings,
  Upload,
  X,
  Play,
  Pause,
  Edit,
  Star,
  Trash,
  MoreHorizontal,
  Check,
  Volume2,
  VolumeX,
  AlertCircle,
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { PopoverClose } from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "@/components/ui/use-toast"

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

// Importar el componente MediaManager
import MediaManager from "@/components/media-manager"

// Primero, importar el nuevo componente SceneMasterClock
// Añadir esta línea junto con las otras importaciones cerca del inicio del archivo
import SceneMasterClock from "@/components/timeline/SceneMasterClock"

// Añadir esta importación al principio del archivo, junto con las otras importaciones
import HermeticScriptViewer from "@/components/hermetic-script-viewer"
import ScriptSyncManager from "@/components/script-sync-manager"

// Modificar la interfaz ScriptScene para que coincida con la estructura de las escenas del guion
interface ScriptScene {
  id: string
  title: string
  content: string
  images?: any[]
}

// Actualizar la interfaz StoryboardEditorProps para incluir la nueva función de callback
interface StoryboardEditorProps {
  projectId: string
  userId: string // Añadir userId como prop requerido
  scenes?: ScriptScene[]
  setScenes?: (scenes: ScriptScene[]) => void
  onScenesUpdate?: (scenes: StoryboardScene[]) => void
  activeSceneIndex?: number
  setActiveSceneIndex?: (index: number) => void
  storyboardData?: any
  onStoryboardDataUpdate?: (data: any) => void
  audioSrc?: string
  onAudioUpload?: (audio: any) => void
}

// Definir la interfaz para los ajustes de cámara
interface CameraSettings {
  model: string
  lens: string
  aperture: string
  shutterSpeed: string
  iso: string
  whiteBalance: string
  resolution: string
  frameRate: string
  format: string
}

// Modificar la interfaz StoryboardImage
interface StoryboardImage {
  id: string
  url: string
  description: string
  duration: number
  cameraSettings: CameraSettings
  type?: "image" | "video" // Añadir tipo para distinguir entre imágenes y videos
}

// Definir la interfaz para las escenas
interface StoryboardScene {
  id: string
  title: string
  description: string
  images: StoryboardImage[]
  metadata: {
    camera: string
    lighting: string
    audio: string
    duration: string
  }
}

// Definir la interfaz para los modelos de cámara favoritos
interface FavoriteCamera {
  id: string
  name: string
}

// Definir la interfaz para los lentes favoritos
interface FavoriteLens {
  id: string
  name: string
}

// Definir la interfaz para la pista de audio
interface AudioTrack {
  id: string
  url: string
  name: string
  duration: number
}

// Configuración de cámara predeterminada para nuevas imágenes
const DEFAULT_CAMERA_SETTINGS: CameraSettings = {
  model: "Sony FX6",
  lens: "24-70mm f/2.8",
  aperture: "f/4.0",
  shutterSpeed: "1/50",
  iso: "800",
  whiteBalance: "5600K",
  resolution: "4K",
  frameRate: "24 fps",
  format: "ProRes 422 HQ",
}

// Actualizar la función del componente para incluir el nuevo prop
export function StoryboardEditor({
  projectId,
  userId, // Añadir userId a los props destructurados
  scenes: scriptScenes,
  setScenes: setScriptScenes,
  onScenesUpdate,
  activeSceneIndex: scriptActiveSceneIndex,
  setActiveSceneIndex: setScriptActiveSceneIndex,
  storyboardData,
  onStoryboardDataUpdate,
  audioSrc,
  onAudioUpload,
}: StoryboardEditorProps) {
  console.log("StoryboardEditor renderizado con scriptScenes:", scriptScenes?.length)

  // Estado para las escenas del storyboard
  const [internalScenes, setInternalScenes] = useState<StoryboardScene[]>([])
  // Referencia para rastrear si ya se han inicializado las escenas
  const scenesInitializedRef = useRef(false)

  // Añadir soporte para pista de audio master
  // Primero, añadir un nuevo estado para la pista de audio
  const [audioTrack, setAudioTrack] = useState<AudioTrack | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [audioVolume, setAudioVolume] = useState<number>(1)
  const [audioMuted, setAudioMuted] = useState<boolean>(false)
  const [audioDuration, setAudioDuration] = useState<number>(0)
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0)
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false)
  const audioProgressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [showDebugAudio, setShowDebugAudio] = useState<boolean>(false)

  // Luego, añadir un nuevo estado para controlar la visibilidad del SceneMasterClock
  // Añadir esto junto con los otros estados, cerca de la línea 140-150
  const [showSceneMasterClock, setShowSceneMasterClock] = useState(true)

  // Estado separado para descripciones de imágenes (almacenamiento superficial)
  const [imageDescriptions, setImageDescriptions] = useState<Record<string, string>>({})

  // Primero, let's add a state variable to track whether audio and shots are synchronized or independent
  // Add this with the other state variables near line 135-140
  const [audioShotsLinked, setAudioShotsLinked] = useState(false)

  // Primero, añadir estos nuevos estados para la línea de tiempo independiente de las tomas
  // Añadir después de la declaración de estados existentes, cerca de la línea 100-120:
  const [shotCurrentTime, setShotCurrentTime] = useState(0)
  const [shotProgressIntervalRef, setShotProgressIntervalRef] = useState<NodeJS.Timeout | null>(null)

  // Estado para modelos de cámara y lentes favoritos
  const [favoriteCameras, setFavoriteCameras] = useState<FavoriteCamera[]>([
    { id: "1", name: "Sony FX6" },
    { id: "2", name: "Canon C300 Mark III" },
    { id: "3", name: "Blackmagic URSA Mini Pro 12K" },
  ])

  const [favoriteLenses, setFavoriteLenses] = useState<FavoriteLens[]>([
    { id: "1", name: "24-70mm f/2.8" },
    { id: "2", name: "50mm f/1.2" },
    { id: "3", name: "85mm f/1.4" },
  ])

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Add a state for tracking dragging
  const [isDragging, setIsDragging] = useState(false)

  // Add a handler for drag start
  const handleDragStart = () => {
    setIsDragging(true)
  }

  const [activeSceneIndex, setActiveSceneIndex] = useState(0)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false) // Initialize isPlaying here
  const [showControls, setShowControls] = useState(true)
  const [isUploading, setIsUploading] = useState(false) // Initialize isUploading here
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [customCameraModel, setCustomCameraModel] = useState("")
  const [customLens, setCustomLens] = useState("")
  const [showCameraModelInput, setShowCameraModelInput] = useState(false)
  const [showLensInput, setShowLensInput] = useState(false)
  const [editingCameraModel, setEditingCameraModel] = useState(false)
  const [editingLens, setEditingLens] = useState(false)
  const [tempCameraModel, setTempCameraModel] = useState("")
  const [tempLens, setTempLens] = useState("")
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null)

  // 1. Primero, agregar una función para calcular todas las tomas de todas las escenas
  // Agregar después de la declaración de estados, justo antes de la función handleAudioUpload

  // Función para recopilar todas las tomas de todas las escenas
  const getAllShots = useCallback(() => {
    const allShots = []
    let accumulatedTime = 0

    // Recorrer todas las escenas
    internalScenes.forEach((scene, sceneIndex) => {
      // Para cada escena, recorrer todas sus imágenes
      scene.images?.forEach((image, imageIndex) => {
        allShots.push({
          id: image.id,
          sceneIndex,
          imageIndex,
          startTime: accumulatedTime,
          duration: image.duration,
          isActive: sceneIndex === activeSceneIndex && imageIndex === activeImageIndex,
        })
        accumulatedTime += image.duration
      })
    })

    return {
      shots: allShots,
      totalDuration: accumulatedTime,
    }
  }, [internalScenes, activeSceneIndex, activeImageIndex])

  // Cargar audio guardado al iniciar
  useEffect(() => {
    try {
      const savedAudioTrack = localStorage.getItem(`storynema_audio_track_${projectId}`)
      if (savedAudioTrack) {
        const parsedTrack = JSON.parse(savedAudioTrack)
        setAudioTrack(parsedTrack)
        setAudioDuration(parsedTrack.duration)

        // Asegurarse de que el elemento de audio se actualice con la URL guardada
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.src = parsedTrack.url
            audioRef.current.load()

            // Verificar que el audio se cargó correctamente
            audioRef.current.onloadeddata = () => {
              console.log("Audio cargado correctamente:", parsedTrack.name)
            }

            audioRef.current.onerror = (e) => {
              console.error("Error al cargar el audio guardado:", e)
              setAudioError("Error al cargar el archivo de audio. Intenta cargar un nuevo archivo.")
              toast({
                title: "Error al cargar audio",
                description: "Por favor, intenta con otro archivo.",
                variant: "destructive",
              })
            }
          }
        }, 100)
      }
    } catch (error) {
      console.error("Error loading audio track from localStorage:", error)
    }
  }, [projectId])

  // Función para guardar la pista de audio en localStorage
  const saveAudioTrackToLocalStorage = (track: AudioTrack | null) => {
    if (track) {
      try {
        localStorage.setItem(`storynema_audio_track_${projectId}`, JSON.stringify(track))
        console.log("Audio guardado correctamente en localStorage")
      } catch (error) {
        console.error("Error saving audio track to localStorage:", error)
      }
    } else {
      try {
        localStorage.removeItem(`storynema_audio_track_${projectId}`)
        console.log("Audio eliminado correctamente de localStorage")
      } catch (error) {
        console.error("Error removing audio track from localStorage:", error)
      }
    }
  }

  // Modificar la función handleAudioUpload para guardar la pista de audio
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Mostrar algún tipo de feedback visual
    console.log("Cargando archivo de audio: " + file.name)
    toast({
      title: "Cargando audio",
      description: `Archivo: ${file.name}`,
    })

    // Crear un objeto URL para el archivo
    const audioUrl = URL.createObjectURL(file)

    // Crear un elemento de audio temporal para obtener la duración
    const audio = new Audio()

    // Manejar errores de carga
    audio.onerror = (e) => {
      console.error("Error al cargar el audio:", e)
      setAudioError("Error al cargar el archivo de audio. Por favor, intenta con otro archivo.")
      toast({
        title: "Error al cargar audio",
        description: "Por favor, intenta con otro archivo.",
        variant: "destructive",
      })
    }

    audio.onloadedmetadata = () => {
      const newAudioTrack = {
        id: `audio-${Date.now()}`,
        url: audioUrl,
        duration: audio.duration,
        name: file.name,
      }

      setAudioTrack(newAudioTrack)
      setAudioDuration(audio.duration)
      setAudioError(null)

      // Guardar la pista de audio en localStorage
      saveAudioTrackToLocalStorage(newAudioTrack)

      // Asegurarse de que el elemento de audio se actualice con la nueva URL
      if (audioRef.current) {
        audioRef.current.src = audioUrl
        audioRef.current.load()

        // NO intentar reproducir para verificación
        // Esto evita el error "The play() request was interrupted by a new load request"
        toast({
          title: "Audio cargado correctamente",
          description: `Duración: ${Math.round(audio.duration)} segundos`,
        })
      }
    }

    // Establecer la fuente y cargar el audio
    audio.src = audioUrl

    // Limpiar el input para permitir cargar el mismo archivo nuevamente
    e.target.value = ""
  }

  // Modificar la función para eliminar la pista de audio
  const removeAudioTrack = () => {
    setAudioTrack(null)
    setIsAudioPlaying(false)
    saveAudioTrackToLocalStorage(null) // Eliminar la pista de audio de localStorage
    if (audioRef.current) {
      audioRef.current.pause()
    }
    if (audioProgressIntervalRef.current) {
      clearInterval(audioProgressIntervalRef.current)
    }
  }

  // Mejorar la sincronización con las escenas del guion
  useEffect(() => {
    // Solo inicializar las escenas una vez para evitar que se pierdan al cambiar de escena
    if (scriptScenes && scriptScenes.length > 0 && !scenesInitializedRef.current) {
      // Verificar si hay cambios reales antes de actualizar
      const lastUpdateSource = localStorage.getItem(`storynema_last_update_source_${projectId}`)
      const lastUpdateTime = localStorage.getItem(`storynema_last_update_time_${projectId}`)

      // Si la última actualización vino del storyboard y fue reciente, no actualizar
      if (lastUpdateSource === "storyboard" && lastUpdateTime) {
        const timeSinceLastUpdate = Date.now() - Number.parseInt(lastUpdateTime)
        if (timeSinceLastUpdate < 2000) {
          // 2 segundos
          console.log("Ignorando actualización desde script porque el storyboard acaba de actualizarse")
          return
        }
      }

      console.log("Inicializando escenas del storyboard desde script:", scriptScenes.length)

      // Intentar cargar escenas guardadas primero
      const savedScenes = localStorage.getItem(`storynema_storyboard_scenes_${projectId}`)
      if (savedScenes) {
        try {
          const parsedScenes = JSON.parse(savedScenes)
          if (parsedScenes && parsedScenes.length > 0) {
            console.log(`Cargando escenas guardadas del storyboard para el proyecto ${projectId}:`, parsedScenes.length)

            // Asegurarse de que las escenas tengan la información más actualizada del guion
            const updatedScenes = parsedScenes.map((storyboardScene: any) => {
              const matchingScriptScene = scriptScenes.find((s) => s.id === storyboardScene.id)
              if (matchingScriptScene) {
                return {
                  ...storyboardScene,
                  title: matchingScriptScene.title,
                  description: matchingScriptScene.content || storyboardScene.description,
                }
              }
              return storyboardScene
            })

            setInternalScenes(updatedScenes)
            scenesInitializedRef.current = true
            return
          }
        } catch (error) {
          console.error("Error parsing saved storyboard scenes:", error)
        }
      }

      // Si no hay escenas guardadas, convertir desde el guion
      const convertedScenes = scriptScenes.map((scriptScene) => {
        // Find if a scene with this ID already exists in the storyboard
        const existingScene = internalScenes.find((s) => s.id === scriptScene.id)

        if (existingScene) {
          // If it exists, keep its images and metadata, but update title and description
          return {
            ...existingScene,
            title: scriptScene.title,
            description: scriptScene.content || existingScene.description,
            // Ensure there's at least one image
            images:
              existingScene.images && existingScene.images.length > 0
                ? existingScene.images
                : [
                    {
                      id: `${scriptScene.id}-1`,
                      url: "/blank-comic-panel.png",
                      description: "",
                      duration: 3,
                      cameraSettings: { ...DEFAULT_CAMERA_SETTINGS },
                    },
                  ],
          }
        } else {
          // If it doesn't exist, create a new scene with default values
          return {
            id: scriptScene.id,
            title: scriptScene.title,
            description: scriptScene.content || "Sin descripción",
            images: [
              {
                id: `${scriptScene.id}-1`,
                url: "/blank-comic-panel.png",
                description: "", // Iniciar con descripción vacía
                duration: 3,
                cameraSettings: { ...DEFAULT_CAMERA_SETTINGS },
              },
            ],
            metadata: {
              camera: "Sin información",
              lighting: "Sin información",
              audio: "Sin información",
              duration: "0 segundos",
            },
          }
        }
      })

      console.log("Escenas convertidas para storyboard:", convertedScenes.length)
      setInternalScenes(convertedScenes)

      // Marcar que las escenas ya se han inicializado
      scenesInitializedRef.current = true

      // Guardar en localStorage para persistencia
      try {
        localStorage.setItem(`storynema_storyboard_scenes_${projectId}`, JSON.stringify(convertedScenes))
        // Marcar que los cambios vienen del editor de guiones
        localStorage.setItem(`storynema_last_update_source_${projectId}`, "script_editor")
        localStorage.setItem(`storynema_last_update_time_${projectId}`, Date.now().toString())
      } catch (error) {
        console.error("Error saving storyboard scenes to localStorage:", error)
      }
    }
  }, [scriptScenes, projectId, internalScenes])

  // Sincronizar el índice de escena activa
  useEffect(() => {
    if (scriptActiveSceneIndex !== undefined) {
      console.log("Actualizando activeSceneIndex en storyboard:", scriptActiveSceneIndex)
      setActiveSceneIndex(scriptActiveSceneIndex)
    }
  }, [scriptActiveSceneIndex, setActiveSceneIndex])

  const activeScene = internalScenes[activeSceneIndex] ||
    internalScenes[0] || {
      id: "0",
      title: "Sin escenas",
      description: "No hay escenas disponibles",
      images: [],
      metadata: {
        camera: "",
        lighting: "",
        audio: "",
        duration: "0 segundos",
      },
    }

  const activeImage =
    activeScene?.images && activeScene.images.length > 0
      ? activeScene.images[activeImageIndex] || activeScene.images[0]
      : null

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Calcular la duración total de la escena activa
  useEffect(() => {
    if (activeScene && activeScene.images) {
      const duration = activeScene.images.reduce((total, img) => total + img.duration, 0)
      setTotalDuration(duration)
      console.log("Duración total actualizada:", duration)
    }
  }, [activeScene, activeScene?.images, activeScene?.images?.length])

  // Funciones para controlar el audio
  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      setAudioCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleAudioEnded = () => {
    setIsAudioPlaying(false)
    setIsPlaying(false) // Detener también la reproducción de tomas
    setAudioCurrentTime(0)
    if (audioRef.current) {
      audioRef.current.currentTime = 0
    }
    if (audioProgressIntervalRef.current) {
      clearInterval(audioProgressIntervalRef.current)
    }
  }

  const handleAudioVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    setAudioVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
  }

  const toggleAudioMute = () => {
    setAudioMuted(!audioMuted)
    if (audioRef.current) {
      audioRef.current.muted = !audioMuted
    }
  }

  // Función mejorada para saltar a un punto específico en la línea de tiempo
  const seekToPosition = (percent: number) => {
    if (!activeScene || !activeScene.images || activeScene.images.length === 0) return

    const newTime = (totalDuration * percent) / 100
    setCurrentTime(newTime)

    // Encontrar la imagen correspondiente a este tiempo
    let accumulatedTime = 0
    for (let i = 0; i < activeScene.images.length; i++) {
      const previousTime = accumulatedTime
      accumulatedTime += activeScene.images[i].duration
      if (newTime <= accumulatedTime) {
        setActiveImageIndex(i)
        break
      }
    }

    // Sincronizar el audio si existe
    if (audioTrack && audioRef.current && audioDuration > 0) {
      // Calcular la posición proporcional en el audio
      const audioTimeRatio = audioDuration / totalDuration
      const newAudioTime = newTime * audioTimeRatio
      audioRef.current.currentTime = newAudioTime
      setAudioCurrentTime(newAudioTime)
    }
  }

  // Now, let's modify the goToShot function to make audio position changes optional
  // Replace the existing goToShot function with this updated version
  const goToShot = (sceneIndex, imageIndex, syncAudio = true) => {
    // Se permiten pasar solo el índice de imagen cuando se quiere navegar dentro de la escena actual
    if (imageIndex === undefined) {
      imageIndex = sceneIndex
      sceneIndex = activeSceneIndex
    }

    // Verificar que los índices son válidos
    if (
      sceneIndex < 0 ||
      sceneIndex >= internalScenes.length ||
      !internalScenes[sceneIndex].images ||
      imageIndex < 0 ||
      imageIndex >= internalScenes[sceneIndex].images.length
    )
      return

    // Si cambiamos de escena, actualizar también el índice de escena activa
    if (sceneIndex !== activeSceneIndex) {
      setActiveSceneIndex(sceneIndex)

      // Sincronizar con el editor de guiones si es necesario
      if (setScriptActiveSceneIndex) {
        setScriptActiveSceneIndex(sceneIndex)
      }
    }

    // Establece la toma activa
    setActiveImageIndex(imageIndex)

    // Calcular el tiempo acumulado hasta la escena seleccionada
    let accumulatedTimeToScene = 0
    for (let i = 0; i < sceneIndex; i++) {
      if (internalScenes[i] && internalScenes[i].images) {
        accumulatedTimeToScene += internalScenes[i].images.reduce((total, img) => total + (img.duration || 0), 0)
      }
    }

    // Calcular el tiempo exacto de inicio de la toma seleccionada dentro de la escena
    let elapsedTimeBeforeCurrentImage = 0
    for (let i = 0; i < imageIndex; i++) {
      if (internalScenes[sceneIndex].images[i]) {
        elapsedTimeBeforeCurrentImage += internalScenes[sceneIndex].images[i].duration || 0
      }
    }

    // Tiempo total desde el inicio del proyecto hasta la toma seleccionada
    const totalTimeToSelectedShot = accumulatedTimeToScene + elapsedTimeBeforeCurrentImage

    // Actualizar el tiempo actual de las tomas con precisión de grid
    setCurrentTime(totalTimeToSelectedShot)
    setShotCurrentTime(totalTimeToSelectedShot)

    // Sincronizar con el audio si es necesario
    if (syncAudio && audioTrack && audioRef.current && audioDuration > 0) {
      // Obtener la información de todas las tomas para calcular la proporción correcta
      const { totalDuration: allShotsDuration } = getAllShots()

      // Calcular la posición exacta en el audio basada en la proporción global
      const audioPosition = (totalTimeToSelectedShot / allShotsDuration) * audioDuration

      // Asegurarse de que el tiempo no exceda la duración del audio
      const safeAudioTime = Math.min(audioPosition, audioDuration - 0.1)

      audioRef.current.currentTime = safeAudioTime
      setAudioCurrentTime(safeAudioTime)
    }
  }
  // Modificar la función para eliminar la pista de audio

  // Cargar audio guardado al iniciar

  // Efecto para manejar la reproducción automática y actualizar la línea de tiempo en tiempo real
  useEffect(() => {
    if (isPlaying && activeScene && activeScene.images && activeImage) {
      // Limpiar cualquier intervalo existente
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }

      // Calcular el tiempo transcurrido hasta la imagen actual
      let elapsedTimeBeforeCurrentImage = 0
      for (let i = 0; i < activeImageIndex; i++) {
        if (activeScene.images[i]) {
          elapsedTimeBeforeCurrentImage += activeScene.images[i].duration
        }
      }

      // Iniciar desde el tiempo correcto
      setCurrentTime(elapsedTimeBeforeCurrentImage)

      // Actualizar el tiempo actual cada 50ms para una actualización más fluida
      progressIntervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const newTime = prev + 0.05

          // Si hay audio, sincronizar con el tiempo del audio
          if (audioTrack && audioRef.current && !audioRef.current.paused) {
            const audioTimeRatio = totalDuration / audioDuration
            return audioRef.current.currentTime * audioTimeRatio
          }

          return Math.min(newTime, totalDuration)
        })

        // Actualizar también el tiempo de las tomas independientemente
        setShotCurrentTime((prev) => {
          const newTime = prev + 0.05
          return Math.min(newTime, totalDuration)
        })
      }, 50)

      // Configurar el temporizador para cambiar a la siguiente imagen
      timerRef.current = setTimeout(() => {
        if (activeImageIndex < activeScene.images.length - 1) {
          setActiveImageIndex(activeImageIndex + 1)
        } else if (activeSceneIndex < internalScenes.length - 1) {
          setActiveSceneIndex(activeSceneIndex + 1)
          setActiveImageIndex(0)
          setCurrentTime(0)
        } else {
          setIsPlaying(false)
          setCurrentTime(totalDuration)

          // También pausar el audio si está reproduciéndose
          if (audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause()
            setIsAudioPlaying(false)
          }
        }
      }, activeImage.duration * 1000)
    } else {
      // Detener la actualización del tiempo cuando no está reproduciendo
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [
    isPlaying,
    activeImageIndex,
    activeSceneIndex,
    activeScene,
    activeImage,
    totalDuration,
    audioTrack,
    audioDuration,
  ])

  // Also modify the togglePlayPause function to ensure proper synchronization when playback starts
  // Around line 1270, update the logic:
  // Añadir un estado para controlar si el audio y las tomas están sincronizados
  const [autoSyncAudioWithShots, setAutoSyncAudioWithShots] = useState(true)

  // Modificar la función togglePlayPause para usar la sincronización automática
  const togglePlayPause = () => {
    const newPlayingState = !isPlaying
    setIsPlaying(newPlayingState)

    // Sincronizar la reproducción de audio con el storyboard
    if (audioTrack && audioRef.current) {
      if (newPlayingState) {
        // Si vamos a reproducir y la sincronización automática está activada, primero sincronizamos
        if (autoSyncAudioWithShots) {
          // Calcular la posición adecuada en el audio basada en la toma actual
          let elapsedTimeBeforeCurrentImage = 0
          for (let i = 0; i < activeImageIndex; i++) {
            elapsedTimeBeforeCurrentImage += activeScene.images[i].duration
          }

          const audioTimeRatio = audioDuration / totalDuration
          const newAudioTime = elapsedTimeBeforeCurrentImage * audioTimeRatio
          const safeAudioTime = Math.min(newAudioTime, audioDuration - 0.1)

          audioRef.current.currentTime = safeAudioTime
          setAudioCurrentTime(safeAudioTime)
        }

        // Ahora reproducimos el audio
        audioRef.current
          .play()
          .then(() => {
            console.log("Audio reproduciendo correctamente")
            setIsAudioPlaying(true)
            setAudioError(null)

            // Iniciar el intervalo para actualizar el tiempo del audio
            if (audioProgressIntervalRef.current) {
              clearInterval(audioProgressIntervalRef.current)
            }
            audioProgressIntervalRef.current = setInterval(() => {
              if (audioRef.current) {
                setAudioCurrentTime(audioRef.current.currentTime)
              }
            }, 50)
          })
          .catch((error) => {
            console.error("Error al reproducir audio:", error)
            setAudioError("Error al reproducir el audio. Intenta hacer clic directamente en el reproductor de audio.")
            toast({
              title: "Error al reproducir audio",
              description: "Intenta hacer clic directamente en el reproductor de audio.",
              variant: "destructive",
            })
          })
      } else {
        // Si vamos a pausar
        audioRef.current.pause()
        setIsAudioPlaying(false)
        if (audioProgressIntervalRef.current) {
          clearInterval(audioProgressIntervalRef.current)
        }
      }
    }
  }

  const nextScene = () => {
    if (isPlaying) setIsPlaying(false)
    if (activeSceneIndex < internalScenes.length - 1) {
      // Guardar el estado actual antes de cambiar de escena
      const updatedScenes = [...internalScenes]
      // Asegurarse de que la escena actual se guarde correctamente
      if (activeScene && activeImage) {
        localStorage.setItem(`storynema_storyboard_scenes_${projectId}`, JSON.stringify(updatedScenes))
        localStorage.setItem(`storynema_storyboard_activeSceneIndex_${projectId}`, activeSceneIndex.toString())
        localStorage.setItem(`storynema_storyboard_activeImageIndex_${projectId}`, activeImageIndex.toString())
      }

      // Cambiar a la siguiente escena
      setActiveSceneIndex(activeSceneIndex + 1)
      setActiveImageIndex(0)
      setCurrentTime(0)

      // Sincronizar con el editor de guiones
      if (setScriptActiveSceneIndex) {
        setScriptActiveSceneIndex(activeSceneIndex + 1)
      }

      // Cargar específicamente la siguiente escena para asegurar que esté disponible
      setTimeout(() => {
        const nextScene = internalScenes[activeSceneIndex + 1]
        if (nextScene && nextScene.images && nextScene.images.length > 0) {
          console.log("Cargando siguiente escena:", nextScene.title)
        }
      }, 0)
    }
  }

  const prevScene = () => {
    if (isPlaying) setIsPlaying(false)
    if (activeSceneIndex > 0) {
      // Guardar el estado actual antes de cambiar de escena
      const updatedScenes = [...internalScenes]
      // Asegurarse de que la escena actual se guarde correctamente
      if (activeScene && activeImage) {
        localStorage.setItem(`storynema_storyboard_scenes_${projectId}`, JSON.stringify(updatedScenes))
        localStorage.setItem(`storynema_storyboard_activeSceneIndex_${projectId}`, activeSceneIndex.toString())
        localStorage.setItem(`storynema_storyboard_activeImageIndex_${projectId}`, activeImageIndex.toString())
      }

      // Cambiar a la escena anterior
      setActiveSceneIndex(activeSceneIndex - 1)
      setActiveImageIndex(0)
      setCurrentTime(0)

      // Sincronizar con el editor de guiones
      if (setScriptActiveSceneIndex) {
        setScriptActiveSceneIndex(activeSceneIndex - 1)
      }

      // Cargar específicamente la escena anterior para asegurar que esté disponible
      setTimeout(() => {
        const previousScene = internalScenes[activeSceneIndex - 1]
        if (previousScene && previousScene.images && previousScene.images.length > 0) {
          console.log("Cargando escena anterior:", previousScene.title)
        }
      }, 0)
    }
  }

  const nextImage = () => {
    if (activeScene && activeImageIndex < activeScene.images.length - 1) {
      // Actualizar el tiempo actual al cambiar a la siguiente imagen
      let newTime = 0
      for (let i = 0; i <= activeImageIndex; i++) {
        if (activeScene.images[i]) {
          newTime += activeScene.images[i].duration
        }
      }
      setCurrentTime(newTime)
      setShotCurrentTime(newTime) // Actualizar también el tiempo de las tomas
      setActiveImageIndex(activeImageIndex + 1)
    }
  }

  const prevImage = () => {
    if (activeImageIndex > 0) {
      // Actualizar el tiempo actual al cambiar a la imagen anterior
      let newTime = 0
      for (let i = 0; i < activeImageIndex - 1; i++) {
        if (activeScene.images[i]) {
          newTime += activeScene.images[i].duration
        }
      }
      setCurrentTime(newTime)
      setShotCurrentTime(newTime) // Actualizar también el tiempo de las tomas
      setActiveImageIndex(activeImageIndex - 1)
    }
  }

  // Función para obtener el tiempo formateado (mm:ss)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Función para calcular el tiempo de inicio de la toma actual
  const calculateCurrentShotStartTime = () => {
    let startTime = 0

    if (!activeScene || activeImageIndex < 0) return startTime

    for (let i = 0; i < activeImageIndex; i++) {
      if (activeScene.images[i]) {
        startTime += activeScene.images[i].duration
      }
    }

    return startTime
  }

  // Función para calcular el porcentaje de progreso
  const calculateProgress = () => {
    if (totalDuration === 0) return 0
    return (currentTime / totalDuration) * 100
  }

  const addImageToScene = () => {
    if (!activeScene) return

    // Crear configuración de cámara predeterminada basada en la imagen activa
    const cameraSettings = activeImage ? { ...activeImage.cameraSettings } : { ...DEFAULT_CAMERA_SETTINGS }

    const newImage: StoryboardImage = {
      id: `${activeScene.id}-${activeScene.images.length + 1}`,
      url: "/placeholder.svg?height=300&width=500",
      description: "", // Iniciar con descripción vacía
      duration: 3,
      cameraSettings: cameraSettings,
    }

    const updatedScenes = [...internalScenes]
    if (updatedScenes[activeSceneIndex] && updatedScenes[activeSceneIndex].images) {
      updatedScenes[activeSceneIndex].images.push(newImage)
      setInternalScenes(updatedScenes)

      // Recalcular inmediatamente la duración total
      const newTotalDuration = updatedScenes[activeSceneIndex].images.reduce((total, img) => total + img.duration, 0)
      setTotalDuration(newTotalDuration)

      localStorage.setItem(`storynema_storyboard_scenes_${projectId}`, JSON.stringify(updatedScenes))
      localStorage.setItem(`storynema_storyboard_activeSceneIndex_${projectId}`, activeSceneIndex.toString())
      localStorage.setItem(`storynema_storyboard_activeImageIndex_${projectId}`, activeImageIndex.toString())
    }
  }

  // Modificar la función updateImageDescription para sincronizar cambios
  const updateImageDescription = (description: string) => {
    if (!activeScene || !activeImage) return

    const updatedScenes = [...internalScenes]
    if (
      updatedScenes[activeSceneIndex] &&
      updatedScenes[activeSceneIndex].images &&
      updatedScenes[activeSceneIndex].images[activeImageIndex]
    ) {
      updatedScenes[activeSceneIndex].images[activeImageIndex].description = description

      // No actualizamos la descripción de la escena, solo la de la imagen
      // updatedScenes[activeSceneIndex].description = description

      setInternalScenes(updatedScenes)
      localStorage.setItem(`storynema_storyboard_scenes_${projectId}`, JSON.stringify(updatedScenes))
      localStorage.setItem(`storynema_storyboard_activeSceneIndex_${projectId}`, activeSceneIndex.toString())
      localStorage.setItem(`storynema_storyboard_activeImageIndex_${projectId}`, activeImageIndex.toString())

      // Notificar al componente padre sobre los cambios
      if (onScenesUpdate) {
        onScenesUpdate(updatedScenes)
      }
    }
  }

  const updateImageDuration = (duration: number) => {
    if (!activeScene || !activeImage) return

    const updatedScenes = [...internalScenes]
    if (
      updatedScenes[activeSceneIndex] &&
      updatedScenes[activeSceneIndex].images &&
      updatedScenes[activeSceneIndex].images[activeImageIndex]
    ) {
      updatedScenes[activeSceneIndex].images[activeImageIndex].duration = duration
      setInternalScenes(updatedScenes)

      // Recalcular inmediatamente la duración total
      const newTotalDuration = updatedScenes[activeSceneIndex].images.reduce((total, img) => total + img.duration, 0)
      setTotalDuration(newTotalDuration)

      localStorage.setItem(`storynema_storyboard_scenes_${projectId}`, JSON.stringify(updatedScenes))
      localStorage.setItem(`storynema_storyboard_activeSceneIndex_${projectId}`, activeSceneIndex.toString())
      localStorage.setItem(`storynema_storyboard_activeImageIndex_${projectId}`, activeImageIndex.toString())
    }
  }

  const updateCameraSetting = (setting: string, value: string) => {
    if (!activeScene || !activeImage) return

    const updatedScenes = [...internalScenes]
    if (
      updatedScenes[activeSceneIndex] &&
      updatedScenes[activeSceneIndex].images &&
      updatedScenes[activeSceneIndex].images[activeImageIndex] &&
      updatedScenes[activeSceneIndex].images[activeImageIndex].cameraSettings
    ) {
      updatedScenes[activeSceneIndex].images[activeImageIndex].cameraSettings[setting as keyof CameraSettings] = value
      setInternalScenes(updatedScenes)
      localStorage.setItem(`storynema_storyboard_scenes_${projectId}`, JSON.stringify(updatedScenes))
      localStorage.setItem(`storynema_storyboard_activeSceneIndex_${projectId}`, activeSceneIndex.toString())
      localStorage.setItem(`storynema_storyboard_activeImageIndex_${projectId}`, activeImageIndex.toString())
    }
  }

  // Cargar el estado guardado al iniciar
  useEffect(() => {
    try {
      // Si hay datos proporcionados por el componente padre, usarlos
      if (storyboardData) {
        console.log("Usando datos de storyboard proporcionados:", storyboardData)
        setInternalScenes(storyboardData)
        scenesInitializedRef.current = true // Marcar como inicializado
        return
      }

      // Intentar cargar desde localStorage si no se han inicializado las escenas
      if (!scenesInitializedRef.current) {
        const savedScenes = localStorage.getItem(`storynema_storyboard_scenes_${projectId}`)
        const savedActiveSceneIndex = localStorage.getItem(`storynema_storyboard_activeSceneIndex_${projectId}`)
        const savedActiveImageIndex = localStorage.getItem(`storynema_storyboard_activeImageIndex_${projectId}`)

        if (savedScenes) {
          try {
            const parsedScenes = JSON.parse(savedScenes)
            if (parsedScenes && parsedScenes.length > 0) {
              console.log(
                `Cargando escenas del storyboard desde localStorage para el proyecto ${projectId}:`,
                parsedScenes.length,
              )
              // Ensure that the content is loaded from the scriptScenes if it exists
              const updatedScenes = parsedScenes.map((scene) => {
                const scriptScene = scriptScenes?.find((s) => s.id === scene.id)
                return {
                  ...scene,
                  title: scriptScene?.title || scene.title,
                  description: scriptScene?.content || scene.description,
                }
              })
              setInternalScenes(updatedScenes)
              scenesInitializedRef.current = true
            }
          } catch (error) {
            console.error("Error parsing saved storyboard scenes:", error)
          }
        }

        if (savedActiveSceneIndex && scriptActiveSceneIndex === undefined) {
          setActiveSceneIndex(Number.parseInt(savedActiveSceneIndex))
        }

        if (savedActiveImageIndex) {
          setActiveImageIndex(Number.parseInt(savedActiveImageIndex))
        }
      }
    } catch (error) {
      console.error("Error loading state from localStorage:", error)
    }
  }, [storyboardData, scriptScenes, scriptActiveSceneIndex, projectId])

  // Guardar el estado cuando cambie
  useEffect(() => {
    // Solo guardar si las escenas ya se han inicializado
    if (scenesInitializedRef.current) {
      localStorage.setItem(`storynema_storyboard_scenes_${projectId}`, JSON.stringify(internalScenes))
      localStorage.setItem(`storynema_storyboard_activeSceneIndex_${projectId}`, activeSceneIndex.toString())
      localStorage.setItem(`storynema_storyboard_activeImageIndex_${projectId}`, activeImageIndex.toString())
    }
  }, [internalScenes, activeSceneIndex, activeImageIndex, projectId])

  // Asegurar que los datos persistan al cambiar de sección
  // Modificar el useEffect para guardar los cambios inmediatamente
  useEffect(() => {
    // Only save if we have valid data to save and scenes are initialized
    if (activeScene && activeImage && Object.keys(activeScene).length > 0 && scenesInitializedRef.current) {
      localStorage.setItem(`storynema_storyboard_scenes_${projectId}`, JSON.stringify(internalScenes))
      localStorage.setItem(`storynema_storyboard_activeSceneIndex_${projectId}`, activeSceneIndex.toString())
      localStorage.setItem(`storynema_storyboard_activeImageIndex_${projectId}`, activeImageIndex.toString())
    }
  }, [activeScene, activeImage, internalScenes, activeSceneIndex, activeImageIndex, projectId])

  // Añadir este useEffect después de los otros useEffects
  useEffect(() => {
    // Este efecto se ejecuta cuando cambia el índice de escena activa
    // Su propósito es asegurar que las escenas se mantengan intactas al cambiar entre ellas
    if (internalScenes.length > 0 && scenesInitializedRef.current) {
      // Verificar que la escena existe y está completa
      const currentScene = internalScenes[activeSceneIndex]
      if (currentScene && (!currentScene.images || currentScene.images.length === 0)) {
        console.log("Detectada escena sin imágenes, intentando recuperar...")

        // Intentar recuperar desde localStorage
        try {
          const savedScenes = localStorage.getItem(`storynema_storyboard_scenes_${projectId}`)
          if (savedScenes) {
            const parsedScenes = JSON.parse(savedScenes)
            if (parsedScenes && parsedScenes.length > activeSceneIndex) {
              const savedScene = parsedScenes[activeSceneIndex]
              if (savedScene && savedScene.images && savedScene.images.length > 0) {
                // Actualizar solo la escena actual, manteniendo el resto intacto
                const updatedScenes = [...internalScenes]
                updatedScenes[activeSceneIndex] = savedScene
                setInternalScenes(updatedScenes)
                console.log("Escena recuperada correctamente")
              }
            }
          }
        } catch (error) {
          console.error("Error al recuperar escena desde localStorage:", error)
        }
      }
    }
  }, [activeSceneIndex, internalScenes, projectId])

  // Cargar descripciones de imágenes guardadas
  useEffect(() => {
    try {
      // Intentar cargar descripciones guardadas
      const keys = Object.keys(localStorage).filter((key) =>
        key.startsWith(`storynema_image_description_${projectId}_`),
      )

      const loadedDescriptions: Record<string, string> = {}
      keys.forEach((key) => {
        const value = localStorage.getItem(key)
        if (value) {
          // Extraer el ID de la imagen del key
          const imageId = key.replace(`storynema_image_description_${projectId}_`, "")
          loadedDescriptions[imageId] = value
        }
      })

      setImageDescriptions(loadedDescriptions)
    } catch (error) {
      console.error("Error loading image descriptions:", error)
    }
  }, [projectId])

  const handleCustomCameraModelSave = () => {
    if (customCameraModel.trim() !== "") {
      updateCameraSetting("model", customCameraModel)
      setShowCameraModelInput(false)
      setCustomCameraModel("")
    }
  }

  const handleCustomLensSave = () => {
    if (customLens.trim() !== "") {
      updateCameraSetting("lens", customLens)
      setShowLensInput(false)
      setCustomLens("")
    }
  }

  const startEditingCameraModel = () => {
    if (activeImage) {
      setTempCameraModel(activeImage.cameraSettings.model)
      setEditingCameraModel(true)
    }
  }

  const saveEditedCameraModel = () => {
    if (tempCameraModel.trim() !== "") {
      updateCameraSetting("model", tempCameraModel)
      setEditingCameraModel(false)
    }
  }

  const startEditingLens = () => {
    if (activeImage) {
      setTempLens(activeImage.cameraSettings.lens)
      setEditingLens(true)
    }
  }

  const saveEditedLens = () => {
    if (tempLens.trim() !== "") {
      updateCameraSetting("lens", tempLens)
      setEditingLens(false)
    }
  }

  const addToFavoriteCameras = (model: string) => {
    // Verificar si ya existe
    if (!favoriteCameras.some((cam) => cam.name === model)) {
      const newFavorite = {
        id: `cam-${Date.now()}`,
        name: model,
      }
      setFavoriteCameras([...favoriteCameras, newFavorite])
    }
  }

  const removeFromFavoriteCameras = (id: string) => {
    setFavoriteCameras(favoriteCameras.filter((cam) => cam.id !== id))
  }

  const addToFavoriteLenses = (lens: string) => {
    // Verificar si ya existe
    if (!favoriteLenses.some((l) => l.name === lens)) {
      const newFavorite = {
        id: `lens-${Date.now()}`,
        name: lens,
      }
      setFavoriteLenses([...favoriteLenses])
    }
  }

  const removeFromFavoriteLenses = (id: string) => {
    setFavoriteLenses(favoriteLenses.filter((l) => l.id !== id))
  }

  const removeImage = () => {
    if (!activeScene || activeScene.images.length <= 1) return

    const updatedScenes = [...internalScenes]
    if (updatedScenes[activeSceneIndex] && updatedScenes[activeSceneIndex].images) {
      updatedScenes[activeSceneIndex].images.splice(activeImageIndex, 1)
      setInternalScenes(updatedScenes)

      if (activeImageIndex >= updatedScenes[activeSceneIndex].images.length) {
        setActiveImageIndex(updatedScenes[activeSceneIndex].images.length - 1)
      }

      // Recalcular inmediatamente la duración total
      const newTotalDuration = updatedScenes[activeSceneIndex].images.reduce((total, img) => total + img.duration, 0)
      setTotalDuration(newTotalDuration)

      localStorage.setItem(`storynema_storyboard_scenes_${projectId}`, JSON.stringify(updatedScenes))
      localStorage.setItem(`storynema_storyboard_activeSceneIndex_${projectId}`, activeSceneIndex.toString())
      localStorage.setItem(`storynema_storyboard_activeImageIndex_${projectId}`, activeImageIndex.toString())
    }
  }

  // Añadir esta función para manejar múltiples medios seleccionados
  const handleMultipleMediaSelected = (urls: string[]) => {
    if (!activeScene || urls.length === 0) return

    console.log("Implementando múltiples medios:", urls)
    toast({
      title: "Añadiendo imágenes",
      description: `Añadiendo ${urls.length} imágenes al storyboard...`,
    })

    const updatedScenes = [...internalScenes]
    if (updatedScenes[activeSceneIndex]) {
      // Crear nuevas imágenes para cada URL
      const newImages = urls.map((url, index) => {
        // Usar la configuración de cámara de la imagen activa o la predeterminada
        const cameraSettings = activeImage ? { ...activeImage.cameraSettings } : { ...DEFAULT_CAMERA_SETTINGS }

        // Determine if it's a video based on the URL
        const isVideo =
          url.toLowerCase().endsWith(".mp4") ||
          url.toLowerCase().endsWith(".webm") ||
          url.toLowerCase().endsWith(".mov")

        return {
          id: `${activeScene.id}-${Date.now()}-${index}`,
          url,
          description: "", // Iniciar con descripción vacía
          duration: isVideo ? 10 : 3, // Longer duration for videos
          type: isVideo ? "video" : "image",
          cameraSettings,
        }
      })

      // Añadir las nuevas imágenes después de la imagen activa
      if (activeImageIndex >= 0 && activeImageIndex < updatedScenes[activeSceneIndex].images.length) {
        // Insertar después de la imagen activa
        updatedScenes[activeSceneIndex].images.splice(activeImageIndex + 1, 0, ...newImages)
      } else {
        // Añadir al final si no hay imagen activa
        updatedScenes[activeSceneIndex].images.push(...newImages)
      }

      setInternalScenes(updatedScenes)

      // Seleccionar la primera imagen añadida
      setActiveImageIndex(activeImageIndex + 1)

      localStorage.setItem(`storynema_storyboard_scenes_${projectId}`, JSON.stringify(updatedScenes))
      localStorage.setItem(`storynema_storyboard_activeSceneIndex_${projectId}`, activeSceneIndex.toString())
      localStorage.setItem(`storynema_storyboard_activeImageIndex_${projectId}`, (activeImageIndex + 1).toString())

      toast({
        title: "Imágenes añadidas",
        description: `${urls.length} imágenes han sido añadidas al storyboard.`,
      })
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  // Modificar la función handleFileChange para detectar videos correctamente
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeScene || !activeImage) return

    setIsUploading(true)

    // Simulación de carga de imagen o video
    setTimeout(() => {
      // Crear una URL para el archivo seleccionado
      const fileUrl = URL.createObjectURL(file)
      const isVideo = file.type.startsWith("video/")

      // Actualizar la imagen actual con la nueva URL
      const updatedScenes = [...internalScenes]
      if (
        updatedScenes[activeSceneIndex] &&
        updatedScenes[activeSceneIndex].images &&
        updatedScenes[activeSceneIndex].images[activeImageIndex]
      ) {
        updatedScenes[activeSceneIndex].images[activeImageIndex].url = fileUrl
        updatedScenes[activeSceneIndex].images[activeImageIndex].type = isVideo ? "video" : "image"

        // Si es un video, establecer una duración predeterminada más larga
        if (isVideo) {
          updatedScenes[activeSceneIndex].images[activeImageIndex].duration = 10
        }

        setInternalScenes(updatedScenes)
        localStorage.setItem(`storynema_storyboard_scenes_${projectId}`, JSON.stringify(updatedScenes))
        localStorage.setItem(`storynema_storyboard_activeSceneIndex_${projectId}`, activeSceneIndex.toString())
        localStorage.setItem(`storynema_storyboard_activeImageIndex_${projectId}`, activeImageIndex.toString())
      }

      setIsUploading(false)

      // Limpiar el input de archivo
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }, 1500)
  }

  // Apply the selected media image when it changes
  useEffect(() => {
    if (selectedMediaUrl && activeScene && activeImage) {
      console.log("Aplicando imagen seleccionada:", selectedMediaUrl)

      // Solo actualizar si la URL es diferente y válida
      if (activeImage.url !== selectedMediaUrl && selectedMediaUrl.trim() !== "") {
        toast({
          title: "Aplicando imagen",
          description: "Actualizando la imagen en el storyboard...",
        })

        const updatedScenes = [...internalScenes]
        if (
          updatedScenes[activeSceneIndex] &&
          updatedScenes[activeSceneIndex].images &&
          updatedScenes[activeSceneIndex].images[activeImageIndex]
        ) {
          updatedScenes[activeSceneIndex].images[activeImageIndex].url = selectedMediaUrl

          // Determine if it's a video based on the URL
          const isVideo =
            selectedMediaUrl.toLowerCase().endsWith(".mp4") ||
            selectedMediaUrl.toLowerCase().endsWith(".webm") ||
            selectedMediaUrl.toLowerCase().endsWith(".mov")

          updatedScenes[activeSceneIndex].images[activeImageIndex].type = isVideo ? "video" : "image"

          // If it's a video, set a longer default duration
          if (isVideo) {
            updatedScenes[activeSceneIndex].images[activeImageIndex].duration = 10
          }

          setInternalScenes(updatedScenes)

          // Limpiar inmediatamente para evitar actualizaciones en cascada
          setSelectedMediaUrl(null)

          // Usar setTimeout para evitar actualizaciones en el mismo ciclo de renderizado
          setTimeout(() => {
            localStorage.setItem(`storynema_storyboard_scenes_${projectId}`, JSON.stringify(updatedScenes))
            localStorage.setItem(`storynema_storyboard_activeSceneIndex_${projectId}`, activeSceneIndex.toString())
            localStorage.setItem(`storynema_storyboard_activeImageIndex_${projectId}`, activeImageIndex.toString())

            toast({
              title: "Imagen actualizada",
              description: "La imagen ha sido actualizada correctamente en el storyboard.",
            })
          }, 0)
        }
      } else {
        // Limpiar si no hay actualización necesaria
        setSelectedMediaUrl(null)
      }
    }
  }, [selectedMediaUrl, activeSceneIndex, activeImageIndex, activeImage, internalScenes, projectId])

  // Corregir la función SortableImage para permitir seleccionar con click
  const SortableImage = ({ image, index, activeImageIndex, onClick }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: image.id,
      transition: {
        duration: 150, // Transición más rápida para mejor respuesta
        easing: "cubic-bezier(0.25, 1, 0.5, 1)",
      },
    })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? 10 : 1,
      opacity: isDragging ? 0.8 : 1,
    }

    // Usar un estado local para rastrear si estamos arrastrando
    const mouseDownTimeRef = useRef(0)
    const mousePositionRef = useRef({ x: 0, y: 0 })

    // Función para manejar el inicio del arrastre
    const handleMouseDown = (e) => {
      mouseDownTimeRef.current = Date.now()
      mousePositionRef.current = { x: e.clientX, y: e.clientY }
    }

    // Now, let's update the onclick handlers for shot selection to not synchronize audio

    // Update in the SortableImage component, inside the handleMouseUp function
    // Find the section around line 1160 and modify it as follows:
    const handleMouseUp = (e) => {
      const dragTime = Date.now() - mouseDownTimeRef.current
      const dragDistance = Math.sqrt(
        Math.pow(e.clientX - mousePositionRef.current.x, 2) + Math.pow(e.clientY - mousePositionRef.current.y, 2),
      )

      // Si el tiempo es corto y la distancia pequeña, consideramos que es un clic
      if (dragTime < 200 && dragDistance < 5) {
        // Llamar a goToShot sin sincronizar el audio (false como tercer parámetro)
        goToShot(activeSceneIndex, index, false)
      }
    }

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`relative min-w-[100px] h-16 cursor-pointer border-2 ${
          index === activeImageIndex ? "border-amber-500" : "border-transparent"
        } hover:border-amber-300`}
        {...attributes}
        {...listeners}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        <Image src={image.url || "/placeholder.svg"} alt={image.description} fill className="object-cover" />
        <div className="absolute bottom-0 right-0 bg-black/70 text-white text-xs px-1">{image.duration}s</div>
        {image.type === "video" && (
          <div className="absolute top-0 left-0 bg-black/70 text-white text-xs px-1 rounded-br">
            <Film className="h-3 w-3" />
          </div>
        )}
        <div className="absolute top-0 left-0 bg-black/70 text-white text-xs px-1 rounded-br opacity-70">
          {index + 1}
        </div>
        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors duration-200"></div>
      </div>
    )
  }

  // Dentro del componente StoryboardEditor, añadir:
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 100, // Reducir el retraso para activar el arrastre más rápido
        tolerance: 8, // Aumentar la tolerancia para mejor detección
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // Update the handleDragEnd function to reset the dragging state
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setIsDragging(false) // Reset dragging state

    if (active.id !== over?.id && over?.id) {
      const updatedScenes = [...internalScenes]
      const activeScene = updatedScenes[activeSceneIndex]

      if (activeScene && activeScene.images) {
        const oldIndex = activeScene.images.findIndex((img) => img.id === active.id)
        const newIndex = activeScene.images.findIndex((img) => img.id === over.id)

        if (oldIndex !== -1 && newIndex !== -1) {
          updatedScenes[activeSceneIndex].images = arrayMove(activeScene.images, oldIndex, newIndex)

          setInternalScenes(updatedScenes)
          localStorage.setItem(`storynema_storyboard_scenes_${projectId}`, JSON.stringify(updatedScenes))
          localStorage.setItem(`storynema_storyboard_activeSceneIndex_${projectId}`, activeSceneIndex.toString())
          localStorage.setItem(`storynema_storyboard_activeImageIndex_${projectId}`, activeImageIndex.toString())

          // Update the active image index if necessary
          if (activeImageIndex === oldIndex) {
            setActiveImageIndex(newIndex)
          } else if (
            (activeImageIndex > oldIndex && activeImageIndex <= newIndex) ||
            (activeImageIndex < oldIndex && activeImageIndex >= newIndex)
          ) {
            // Adjust the index if the active image is affected by the movement
            setActiveImageIndex(activeImageIndex > oldIndex ? activeImageIndex - 1 : activeImageIndex + 1)
          }
        }
      }
    }
  }

  // Componente para la vista detallada de la toma
  const ShotDetailsView = () => (
    <div className="space-y-4 p-4 bg-[#1E1E1E] text-gray-200">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold">Detalles de la toma</h3>
        <PopoverClose asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 p-0 text-gray-400 hover:text-white">
            <X className="h-4 w-4" />
          </Button>
        </PopoverClose>
      </div>

      <div className="relative aspect-video w-full mb-4">
        {activeImage &&
          (activeImage.type === "video" ? (
            <video
              src={activeImage.url}
              controls
              className="absolute inset-0 w-full h-full object-contain"
              onLoadedMetadata={(e) => {
                // Actualizar la duración automáticamente si es un video
                const video = e.currentTarget

                if (video.duration && video.duration !== activeImage.duration) {
                  updateImageDuration(Math.round(video.duration))
                }
              }}
            />
          ) : (
            <Image
              src={activeImage.url || "/placeholder.svg"}
              alt={activeImage.description}
              fill
              className="object-contain rounded-md"
            />
          ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium mb-2 text-gray-300">Información básica</h4>
          <div className="space-y-2">
            <div>
              <Label className="text-gray-400">Descripción</Label>
              <p className="text-sm bg-[#2A2A2A] p-2 rounded-md">
                {activeImage ? imageDescriptions[activeImage.id] || activeImage.description || "" : ""}
              </p>
            </div>
            <div>
              <Label className="text-gray-400">Duración</Label>
              <p className="text-sm bg-[#2A2A2A] p-2 rounded-md">{activeImage?.duration} segundos</p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2 text-gray-300">Configuración de cámara</h4>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-gray-400">Modelo</Label>
                <p className="text-sm bg-[#2A2A2A] p-2 rounded-md">{activeImage?.cameraSettings.model}</p>
              </div>
              <div>
                <Label className="text-gray-400">Lente</Label>
                <p className="text-sm bg-[#2A2A2A] p-2 rounded-md">{activeImage?.cameraSettings.lens}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-gray-400">Apertura</Label>
                <p className="text-sm bg-[#2A2A2A] p-2 rounded-md">{activeImage?.cameraSettings.aperture}</p>
              </div>
              <div>
                <Label className="text-gray-400">Velocidad</Label>
                <p className="text-sm bg-[#2A2A2A] p-2 rounded-md">{activeImage?.cameraSettings.shutterSpeed}</p>
              </div>
              <div>
                <Label className="text-gray-400">ISO</Label>
                <p className="text-sm bg-[#2A2A2A] p-2 rounded-md">{activeImage?.cameraSettings.iso}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // Si no hay escenas o imágenes, mostrar un mensaje
  if (!activeScene || !activeScene.images || activeScene.images.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 bg-[#252525] border border-[#333333] rounded-md">
        <p>No hay escenas o imágenes disponibles.</p>
      </div>
    )
  }

  // Modificar el return para mover el botón de subir audio y mejorar la interfaz
  // Añadir el ScriptSyncManager antes del return
  return (
    <>
      {/* Componente invisible para sincronización de guiones */}
      <ScriptSyncManager projectId={projectId} scenes={scriptScenes || []} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
        <div className="md:col-span-2">
          {/* Añadir el visor hermético de guiones aquí */}
          <div className="mb-4">
            <HermeticScriptViewer
              projectId={projectId}
              activeSceneId={activeScene?.id}
              activeSceneIndex={activeSceneIndex}
              onSceneChange={(index) => {
                // Solo actualizar si es diferente para evitar loops
                if (index !== activeSceneIndex) {
                  setActiveSceneIndex(index)
                  setActiveImageIndex(0)
                  setCurrentTime(0)

                  // Sincronizar con el editor de guiones si es necesario
                  if (setScriptActiveSceneIndex) {
                    setScriptActiveSceneIndex(index)
                  }
                }
              }}
              scenes={scriptScenes}
            />
          </div>

          <audio
            ref={audioRef}
            src={audioTrack?.url}
            onTimeUpdate={handleAudioTimeUpdate}
            onEnded={handleAudioEnded}
            controls={showDebugAudio}
            className={showDebugAudio ? "w-full mb-4" : "hidden"}
            muted={audioMuted}
            volume={audioVolume}
          />
          <Card className="overflow-hidden bg-[#1E1E1E] border-[#333333]">
            <CardContent className="p-0">
              <div className="relative">
                <div className="relative aspect-video">
                  {activeImage && activeImage.type === "video" ? (
                    <video
                      src={activeImage.url}
                      controls
                      className="absolute inset-0 w-full h-full object-contain"
                      onLoadedMetadata={(e) => {
                        // Actualizar la duración automáticamente si es un video
                        const video = e.currentTarget

                        if (video.duration && video.duration !== activeImage.duration) {
                          updateImageDuration(Math.round(video.duration))
                        }
                      }}
                    />
                  ) : (
                    <Image
                      src={activeImage?.url || "/placeholder.svg"}
                      alt={activeImage?.description || ""}
                      fill
                      className="object-cover"
                    />
                  )}
                  {/* Botón de información detallada */}
                </div>
                {showControls && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={prevImage}
                        disabled={activeImageIndex === 0}
                        className="h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={togglePlayPause}
                        className="h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70"
                      >
                        {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={nextImage}
                        disabled={!activeScene || activeImageIndex === activeScene.images.length - 1}
                        className="h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70"
                      >
                        <ChevronRight className="h-6 w-6" />
                      </Button>
                    </div>
                  </div>
                )}
                {/* Indicador de posición con números */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-1">
                  {activeScene.images.map((_, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-center h-5 w-5 rounded-full text-[10px] 
                      ${index === activeImageIndex ? "bg-amber-500 text-white" : "bg-white/30 text-white/80"} 
                      hover:bg-amber-400 hover:text-white cursor-pointer transition-colors`}
                      onClick={() => goToShot(index)}
                    >
                      {index + 1}
                    </div>
                  ))}
                </div>
              </div>
              {/* Líneas de tiempo separadas por capas */}
              <div className="bg-[#2A2A2A] p-2">
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-300 font-medium">Línea de tiempo</span>
                    <span className="text-gray-400">
                      {formatTime(audioCurrentTime)} / {formatTime(audioDuration)}
                    </span>
                  </div>
                  {/* Capa de audio con marcador de posición y visualización de tomas */}
                  {audioTrack && (
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center">
                          <Mic className="h-3 w-3 text-amber-500 mr-1" />
                          <span className="text-xs text-amber-500">Audio:</span>
                          <span className="text-xs text-amber-500">{audioTrack.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleAudioMute}
                            lassName="h-6 w-6 rounded-full bg-[#2A2A2A] text-gray-200 hover:bg-[#3A3A3A] p-0"
                          >
                            {audioMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                          </Button>
                          <div className="w-16">
                            <Slider
                              min={0}
                              max={1}
                              step={0.01}
                              value={[audioVolume]}
                              onValueChange={handleAudioVolumeChange}
                              className="w-full"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0 text-gray-400 hover:text-red-400"
                            onClick={() => {
                              removeAudioTrack()
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div
                        className="h-3 bg-[#444444] rounded-full overflow-hidden cursor-pointer mb-1 relative"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect()
                          const percent = ((e.clientX - rect.left) / rect.width) * 100
                          seekToPosition(percent)
                        }}
                      >
                        {/* Barra de progreso de audio */}
                        <div
                          className="h-full bg-amber-500/70 transition-all duration-100"
                          style={{ width: `${(audioCurrentTime / totalDuration) * 100}%` }}
                        ></div>

                        {/* Marcadores de todas las tomas en la barra de audio */}

                        {(() => {
                          const { shots, totalDuration: allShotsDuration } = getAllShots()
                          if (shots.length > 0 && audioDuration > 0) {
                            // Calcular la proporción entre la duración total de las tomas y la duración del audio
                            const durationRatio = allShotsDuration / audioDuration

                            return (
                              <div className="absolute inset-0 flex">
                                {shots.map((shot) => {
                                  // Calcular la posición y ancho relativos a la duración del audio
                                  const startPos = (shot.startTime / audioDuration) * 100
                                  const width = (shot.duration / audioDuration) * 100

                                  return (
                                    <div
                                      key={`audio-marker-${shot.id}`}
                                      className={`h-1 absolute top-0 ${
                                        shot.isActive ? "bg-green-500" : "bg-green-700/50"
                                      } border-r border-[#2A2A2A] cursor-pointer hover:bg-green-400 transition-colors`}
                                      style={{
                                        left: `${startPos}%`,
                                        width: `${width}%`,
                                        bottom: "0",
                                      }}
                                      title={`Toma ${shot.sceneIndex + 1}.${shot.imageIndex + 1}: ${shot.duration}s`}
                                      onClick={(e) => {
                                        e.stopPropagation() // Evitar que el clic se propague al contenedor

                                        // Obtener la información de todas las tomas
                                        const { shots, totalDuration: allShotsDuration } = getAllShots()

                                        // Calcular el tiempo acumulado hasta la escena seleccionada
                                        let accumulatedTimeToScene = 0
                                        for (let i = 0; i < shot.sceneIndex; i++) {
                                          if (internalScenes[i] && internalScenes[i].images) {
                                            accumulatedTimeToScene += internalScenes[i].images.reduce(
                                              (total, img) => total + (img.duration || 0),
                                              0,
                                            )
                                          }
                                        }

                                        // Calcular el tiempo exacto de inicio de la toma seleccionada dentro de la escena
                                        let elapsedTimeBeforeCurrentImage = 0
                                        for (let i = 0; i < shot.imageIndex; i++) {
                                          if (internalScenes[shot.sceneIndex].images[i]) {
                                            elapsedTimeBeforeCurrentImage +=
                                              internalScenes[shot.sceneIndex].images[i].duration || 0
                                          }
                                        }

                                        // Tiempo total desde el inicio del proyecto hasta la toma seleccionada
                                        const totalTimeToSelectedShot =
                                          accumulatedTimeToScene + elapsedTimeBeforeCurrentImage

                                        // Navegar a la escena y toma correspondiente
                                        goToShot(shot.sceneIndex, shot.imageIndex, true)

                                        // Establecer explícitamente el tiempo al inicio de esta toma
                                        setCurrentTime(totalTimeToSelectedShot)
                                        setShotCurrentTime(totalTimeToSelectedShot)

                                        // Sincronizar el audio directamente con el tiempo exacto
                                        if (audioRef.current && audioDuration > 0) {
                                          // Calcular la posición exacta en el audio basada en la proporción
                                          const audioPosition =
                                            (totalTimeToSelectedShot / allShotsDuration) * audioDuration

                                          // Asegurarse de que el tiempo no exceda la duración del audio
                                          const safeAudioTime = Math.min(audioPosition, audioDuration - 0.1)

                                          // Actualizar el tiempo del audio directamente
                                          audioRef.current.currentTime = safeAudioTime
                                          setAudioCurrentTime(safeAudioTime)

                                          // Si el audio está reproduciéndose, asegurarse de que continúe
                                          if (isAudioPlaying) {
                                            audioRef.current.play().catch((error) => {
                                              console.error(
                                                "Error al reproducir audio después de cambiar de toma:",
                                                error,
                                              )
                                            })
                                          }
                                        }
                                      }}
                                    ></div>
                                  )
                                })}

                                {/* Indicador de la proporción total de tomas vs audio */}
                                <div
                                  className="h-1 absolute bottom-0 bg-blue-500/30"
                                  style={{
                                    width: `${Math.min(durationRatio * 100, 100)}%`,
                                    left: "0",
                                  }}
                                  title={`Duración total de tomas: ${allShotsDuration.toFixed(1)}s / Audio: ${audioDuration.toFixed(1)}s`}
                                ></div>
                              </div>
                            )
                          }
                          return null
                        })()}

                        {/* Indicador de posición actual */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_3px_rgba(255,255,255,0.7)] z-10"
                          style={{ left: `${(audioCurrentTime / audioDuration) * 100}%` }}
                        ></div>
                      </div>
                      {/* En la sección donde se muestra el tiempo de audio, busca el div con la clase "flex justify-between text-[10px] text-gray-500" y reemplaza:

                      \`\`\`
                      <div className="flex justify-between text-[10px] text-gray-500">
                        <span>0:00</span>
                        <span>{formatTime(audioDuration)}</span>
                      </div>
                      \`\`\`

                      con:

                      \`\`\`
                      <div className="flex justify-between text-[10px] text-gray-500">
                        <span>{formatTime(audioCurrentTime)}</span>
                        <span>{formatTime(audioDuration)}</span>
                      </div>
                      \`\`\`

                      Esto asegurará que el tiempo mostrado a la izquierda refleje siempre la posición actual del playhead. */}
                      <div className="flex justify-between text-[10px] text-gray-500">
                        <span>{formatTime(audioCurrentTime)}</span>
                        <span>{formatTime(audioDuration)}</span>
                      </div>
                    </div>
                  )}
                  {audioError && (
                    <div className="mt-2 text-xs text-red-400 bg-red-900/20 p-2 rounded-md flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{audioError}</span>
                    </div>
                  )}
                  {/* Capa de video/imágenes con marcador de progreso mejorado */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center">
                        <Film className="h-3 w-3 text-blue-400 mr-1" />
                        <span className="text-xs text-blue-400">Tomas</span>
                      </div>
                      {activeImage && (
                        <div className="flex gap-2 text-xs">
                          <div className="text-gray-400 bg-[#333333] rounded px-1.5 py-0.5 flex items-center">
                            <span className="text-blue-400 mr-1">Inicio:</span>
                            {formatTime(calculateCurrentShotStartTime())}
                          </div>
                          <div className="text-gray-400 bg-[#333333] rounded px-1.5 py-0.5 flex items-center">
                            <span className="text-blue-400 mr-1">Fin:</span>
                            {formatTime(calculateCurrentShotStartTime() + activeImage.duration)}
                          </div>

                          <div className="text-gray-400 bg-[#333333] rounded px-1.5 py-0.5 flex items-center">
                            <span className="text-amber-400 mr-1">Duración total:</span>
                            {formatTime(totalDuration)}
                          </div>
                        </div>
                      )}
                    </div>
                    <div
                      className="h-4 bg-[#444444] rounded-md overflow-hidden cursor-pointer relative"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        const percent = ((e.clientX - rect.left) / rect.width) * 100

                        // Cálculo independiente para las tomas
                        const newTime = (totalDuration * percent) / 100

                        // Encontrar la imagen correspondiente a este tiempo
                        let accumulatedTime = 0
                        for (let i = 0; i < activeScene.images.length; i++) {
                          accumulatedTime += activeScene.images[i].duration
                          if (newTime <= accumulatedTime) {
                            goToShot(activeSceneIndex, i)
                            return
                          }
                        }
                      }}
                    >
                      {/* Marcadores de tomas con colores para indicar selección */}
                      {activeScene && activeScene.images && activeScene.images.length > 0 && (
                        <div className="absolute inset-0 flex">
                          {activeScene.images.map((image, index) => {
                            // Calcular la posición y ancho de cada toma
                            let startPos = 0
                            for (let i = 0; i < index; i++) {
                              startPos += (activeScene.images[i].duration / totalDuration) * 100
                            }
                            const width = (image.duration / totalDuration) * 100

                            return (
                              <div
                                key={image.id}
                                className={`h-full ${
                                  index === activeImageIndex ? "bg-blue-500" : "bg-blue-400/70"
                                } border-r border-[#2A2A2A] relative`}
                                style={{
                                  width: `${width}%`,
                                  marginLeft: index === 0 ? `${startPos}%` : "0",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  goToShot(activeSceneIndex, index)
                                }}
                              >
                                {/* Indicador numérico opcional */}
                                <span className="absolute top-0 left-1 text-[8px] text-white font-bold opacity-70">
                                  {index + 1}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                      <span>0:00</span>
                      <span>{formatTime(totalDuration)}</span>
                    </div>
                  </div>
                </div>
              </div>
              {audioTrack && (
                <div className="flex items-center justify-center mt-1 mb-2">
                  <div className="px-2 py-1 bg-amber-600/20 rounded-full text-amber-500 text-xs flex items-center">
                    <Mic className="h-3 w-3 mr-1" />
                    Audio y tomas sincronizados
                  </div>
                </div>
              )}
              {/* Cinta de película con funcionalidad de arrastrar y soltar */}
              <div className="bg-black p-2 overflow-x-auto">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  modifiers={[]}
                >
                  <SortableContext
                    items={activeScene.images.map((img) => img.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="flex gap-2">
                      {activeScene.images.map((image, index) => (
                        <SortableImage
                          key={image.id}
                          image={image}
                          index={index}
                          activeImageIndex={activeImageIndex}
                          onClick={setActiveImageIndex}
                        />
                      ))}
                      <Button
                        variant="ghost"
                        className="min-w-[100px] h-16 border-2 border-dashed border-[#444444] flex items-center justify-center text-gray-400 hover:text-white hover:border-amber-300"
                        onClick={addImageToScene}
                      >
                        <Plus className="h-6 w-6" />
                      </Button>
                    </div>
                  </SortableContext>
                </DndContext>
                <div className="mt-2 text-xs text-center text-gray-500">
                  Arrastra las imágenes para reordenar las tomas
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={prevScene}
              disabled={activeSceneIndex === 0}
              className="flex items-center gap-1 bg-[#2A2A2A] border-[#444444] text-gray-200 hover:bg-[#3A3A3A]"
            >
              <ChevronLeft className="h-4 w-4" />
              Escena anterior
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant={isPlaying ? "default" : "outline"}
                size="sm"
                onClick={togglePlayPause}
                className={`flex items-center gap-1 ${
                  isPlaying
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-[#2A2A2A] border-[#444444] text-gray-200 hover:bg-[#3A3A3A]"
                }`}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isPlaying ? "Pausar" : "Reproducir"} {audioTrack ? "audio y tomas" : "tomas"}
              </Button>
              <div className="text-sm font-medium text-gray-300">
                Escena {activeSceneIndex + 1} de {internalScenes.length}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={nextScene}
              disabled={activeSceneIndex === internalScenes.length - 1}
              className="flex items-center gap-1 bg-[#2A2A2A] border-[#444444] text-gray-200 hover:bg-[#3A3A3A]"
            >
              Siguiente escena
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {/* Botón para mostrar/ocultar el modo de depuración de audio */}
          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDebugAudio(!showDebugAudio)}
              className="text-xs bg-[#2A2A2A] border-[#444444] text-gray-400 hover:bg-[#3A3A3A]"
            >
              {showDebugAudio ? "Ocultar depuración" : "Mostrar depuración de audio"}
            </Button>
          </div>
        </div>

        <div>
          <Card className="bg-[#1E1E1E] border-[#333333]">
            <CardContent className="p-4">
              <Tabs defaultValue="details">
                <TabsList className="grid grid-cols-3 mb-4 bg-[#2A2A2A]">
                  <TabsTrigger
                    value="details"
                    className="flex items-center gap-1 data-[state=active]:bg-[#3A3A3A] text-gray-300"
                  >
                    <Film className="h-4 w-4" />
                    Detalles
                  </TabsTrigger>
                  <TabsTrigger
                    value="camera"
                    id="camera-tab-trigger"
                    className="flex items-center gap-1 data-[state=active]:bg-[#3A3A3A] text-gray-300"
                  >
                    <Camera className="h-4 w-4" />
                    Cámara
                  </TabsTrigger>
                  <TabsTrigger
                    value="production"
                    className="flex items-center gap-1 data-[state=active]:bg-[#3A3A3A] text-gray-300"
                  >
                    <Settings className="h-4 w-4" />
                    Producción
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-gray-300">Título de la escena</Label>
                    </div>
                    <Input
                      id="scene-title"
                      value={activeScene.title}
                      readOnly
                      className="bg-[#2A2A2A] border-[#444444] text-gray-200"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Descripción de la escena</Label>
                    <Textarea
                      id="scene-description"
                      value={activeScene.description}
                      readOnly
                      className="h-20 bg-[#2A2A2A] border-[#444444] text-gray-200"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-gray-300">Descripción de la imagen</Label>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={removeImage}
                        disabled={activeScene.images.length <= 1}
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      id="image-description"
                      value={activeImage ? imageDescriptions[activeImage.id] || activeImage.description || "" : ""}
                      onChange={(e) => {
                        if (!activeImage) return

                        // Actualizar el estado superficial
                        const newDescriptions = { ...imageDescriptions }
                        newDescriptions[activeImage.id] = e.target.value
                        setImageDescriptions(newDescriptions)

                        // Guardar solo esta descripción en localStorage
                        localStorage.setItem(
                          `storynema_image_description_${projectId}_${activeImage.id}`,
                          e.target.value,
                        )

                        // No actualizamos la estructura profunda de escenas para mejorar rendimiento
                      }}
                      placeholder="Añade una descripción breve (almacenada superficialmente)"
                      className="h-20 bg-[#2A2A2A] border-[#444444] text-gray-200"
                    />
                  </div>
                  <div>
                    <Label htmlFor="image-duration" className="flex items-center gap-2 text-gray-300">
                      <Mic className="h-4 w-4" />
                      Duración de la imagen (segundos)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        id="image-duration"
                        min={1}
                        max={10}
                        step={1}
                        value={[activeImage?.duration || 3]}
                        onValueChange={(value) => updateImageDuration(value[0])}
                        className="flex-1"
                      />
                      <span className="w-8 text-center text-gray-300">{activeImage?.duration || 3}s</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="show-controls" checked={showControls} onCheckedChange={setShowControls} />
                    <Label htmlFor="show-controls" className="text-gray-300">
                      Mostrar controles de reproducción
                    </Label>
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <MediaManager
                      userId={userId}
                      projectId={projectId}
                      onSelectMedia={(url) => setSelectedMediaUrl(url)}
                      onSelectMultipleMedia={handleMultipleMediaSelected}
                      onAudioUpload={(audioItem) => {
                        // Crear un elemento de audio temporal para obtener la duración
                        const audio = new Audio()

                        // Manejar errores de carga
                        audio.onerror = (e) => {
                          console.error("Error al cargar el audio:", e)
                          setAudioError(
                            "Error al cargar el archivo de audio. Puede ser un problema de permisos CORS. Intenta descargar el archivo y subirlo manualmente.",
                          )
                          toast({
                            title: "Error al cargar audio",
                            description:
                              "Problema de permisos CORS. Intenta usar el botón 'Subir pista de audio' en su lugar.",
                            variant: "destructive",
                          })
                        }

                        audio.onloadedmetadata = () => {
                          const newAudioTrack = {
                            id: `audio-${Date.now()}`,
                            url: audioItem.url,
                            duration: audio.duration,
                            name: audioItem.name,
                          }

                          setAudioTrack(newAudioTrack)
                          setAudioDuration(audio.duration)
                          setAudioError(null)

                          // Guardar en localStorage
                          try {
                            localStorage.setItem(`storynema_audio_track_${projectId}`, JSON.stringify(newAudioTrack))
                            console.log("Audio guardado correctamente")

                            if (audioRef.current) {
                              audioRef.current.src = audioItem.url
                              audioRef.current.load()

                              toast({
                                title: "Audio cargado correctamente",
                                description: `Duración: ${Math.round(audio.duration)} segundos`,
                              })
                            }
                          } catch (error) {
                            console.error("Error saving audio track to localStorage:", error)
                          }
                        }

                        // Establecer la fuente y cargar el audio
                        try {
                          audio.crossOrigin = "anonymous" // Intentar solucionar problemas CORS
                          audio.src = audioItem.url
                        } catch (error) {
                          console.error("Error al establecer la fuente de audio:", error)
                          setAudioError(
                            "Error al cargar el archivo de audio. Intenta usar el botón 'Subir pista de audio' en su lugar.",
                          )
                        }
                      }}
                      buttonLabel="Seleccionar imagen"
                      buttonIcon={<ImageIcon className="h-4 w-4 mr-2" />}
                      buttonClassName="w-full"
                      context="storyboard"
                      acceptedFileTypes="image/*,video/*"
                    />
                    <Button
                      variant="outline"
                      className="w-full flex items-center gap-2 bg-[#2A2A2A] border-[#444444] text-gray-200 hover:bg-[#3A3A3A]"
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Generar con IA
                    </Button>
                  </div>
                  <div className="mt-4">
                    <Label className="flex items-center gap-2 text-gray-300">
                      <Mic className="h-4 w-4" />
                      Pista de audio master
                    </Label>
                    <div className="mt-2 space-y-2">
                      {audioTrack ? (
                        <div className="bg-[#2A2A2A] p-3 rounded-md">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-200">{audioTrack.name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-gray-400 hover:text-red-400"
                              onClick={() => {
                                removeAudioTrack()
                                // Recalcular la duración total basada en las imágenes
                                if (activeScene && activeScene.images) {
                                  const duration = activeScene.images.reduce((total, img) => total + img.duration, 0)
                                  setTotalDuration(duration)
                                }
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">Duración: {formatTime(audioDuration)}</div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <input
                            type="file"
                            id="audio-upload"
                            accept="audio/*"
                            className="hidden"
                            onChange={handleAudioUpload}
                          />
                          <Button
                            variant="outline"
                            className="w-full flex items-center gap-2 bg-[#2A2A2A] border-[#444444] text-gray-200 hover:bg-[#3A3A3A]"
                            onClick={() => document.getElementById("audio-upload")?.click()}
                          >
                            <Upload className="h-4 w-4" />
                            Subir pista de audio
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Lastly, add a UI control to let users toggle whether audio and shots should be linked
                // Add this somewhere in the UI, perhaps in the Details tab near the audio section
                // Around line 1520-1550, after the audio controls */}
                  {/* Añadir el control de sincronización automática en la sección de detalles
                // Buscar la sección donde está el control de audio y añadir esto después: */}

                  <div className="flex items-center space-x-2 mt-4">
                    <Switch
                      id="auto-sync-audio"
                      checked={autoSyncAudioWithShots}
                      onCheckedChange={setAutoSyncAudioWithShots}
                    />
                    <Label htmlFor="auto-sync-audio" className="text-gray-300">
                      Sincronización automática de audio con tomas
                    </Label>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 ml-7">
                    Cuando está activado, al seleccionar una toma el audio se posicionará automáticamente en el tiempo
                    correspondiente
                  </div>
                </TabsContent>

                <TabsContent value="camera" className="space-y-4">
                  <Accordion type="single" collapsible defaultValue="camera-model">
                    <AccordionItem value="camera-model" className="border-[#444444]">
                      <AccordionTrigger className="text-sm font-medium text-gray-300 hover:text-white">
                        Cámara y lente
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <div>
                          <Label className="text-gray-300">Modelo de cámara</Label>
                          {editingCameraModel ? (
                            <div className="flex gap-2 mt-1">
                              <Input
                                value={tempCameraModel}
                                onChange={(e) => setTempCameraModel(e.target.value)}
                                className="bg-[#2A2A2A] border-[#444444] text-gray-200"
                                autoFocus
                              />
                              <Button
                                size="icon"
                                onClick={saveEditedCameraModel}
                                className="bg-amber-600 hover:bg-amber-700 text-white"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => setEditingCameraModel(false)}
                                className="bg-[#2A2A2A] border-[#444444] text-gray-200"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center mt-1 bg-[#2A2A2A] p-2 rounded-md">
                              <span className="text-gray-200">{activeImage?.cameraSettings.model}</span>
                              <div className="flex gap-1">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-gray-400 hover:text-white"
                                        onClick={startEditingCameraModel}
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Editar</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                <DropdownMenu>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-gray-400 hover:text-white"
                                          >
                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                      </TooltipTrigger>
                                      <TooltipContent>Opciones</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>

                                  <DropdownMenuContent className="bg-[#2A2A2A] border-[#444444] text-gray-200">
                                    <DropdownMenuItem
                                      onClick={() => addToFavoriteCameras(activeImage?.cameraSettings.model || "")}
                                      className="cursor-pointer hover:bg-[#3A3A3A]"
                                    >
                                      <Star className="h-4 w-4 mr-2 text-amber-500" />
                                      Añadir a favoritos
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-[#444444]" />
                                    <DropdownMenuItem
                                      onClick={() => setShowCameraModelInput(true)}
                                      className="cursor-pointer hover:bg-[#3A3A3A]"
                                    >
                                      <Plus className="h-4 w-4 mr-2" />
                                      Personalizar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          )}

                          {showCameraModelInput && (
                            <div className="mt-2 space-y-2">
                              <Input
                                placeholder="Modelo personalizado"
                                value={customCameraModel}
                                onChange={(e) => setCustomCameraModel(e.target.value)}
                                className="bg-[#2A2A2A] border-[#444444] text-gray-200"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={handleCustomCameraModelSave}
                                  className="bg-amber-600 hover:bg-amber-700 text-white"
                                >
                                  Guardar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setShowCameraModelInput(false)}
                                  className="bg-[#2A2A2A] border-[#444444] text-gray-200"
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          )}

                          <div className="mt-3">
                            <Label className="text-gray-300">Cámaras favoritas</Label>
                            <div className="mt-1 space-y-1">
                              {favoriteCameras.map((camera) => (
                                <div
                                  key={camera.id}
                                  className="flex justify-between items-center bg-[#2A2A2A] p-2 rounded-md"
                                >
                                  <Button
                                    variant="ghost"
                                    className="text-sm text-gray-200 hover:text-white p-0 h-auto"
                                    onClick={() => updateCameraSetting("model", camera.name)}
                                  >
                                    {camera.name}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-gray-400 hover:text-red-400"
                                    onClick={() => removeFromFavoriteCameras(camera.id)}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label className="text-gray-300">Lente</Label>
                          {editingLens ? (
                            <div className="flex gap-2 mt-1">
                              <Input
                                value={tempLens}
                                onChange={(e) => setTempLens(e.target.value)}
                                className="bg-[#2A2A2A] border-[#444444] text-gray-200"
                                autoFocus
                              />
                              <Button
                                size="icon"
                                onClick={saveEditedLens}
                                className="bg-amber-600 hover:bg-amber-700 text-white"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => setEditingLens(false)}
                                className="bg-[#2A2A2A] border-[#444444] text-gray-200"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center mt-1 bg-[#2A2A2A] p-2 rounded-md">
                              <span className="text-gray-200">{activeImage?.cameraSettings.lens}</span>
                              <div className="flex gap-1">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-gray-400 hover:text-white"
                                        onClick={startEditingLens}
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Editar</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                <DropdownMenu>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-gray-400 hover:text-white"
                                          >
                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                      </TooltipTrigger>
                                      <TooltipContent>Opciones</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>

                                  <DropdownMenuContent className="bg-[#2A2A2A] border-[#444444] text-gray-200">
                                    <DropdownMenuItem
                                      onClick={() => addToFavoriteLenses(activeImage?.cameraSettings.lens || "")}
                                      className="cursor-pointer hover:bg-[#3A3A3A]"
                                    >
                                      <Star className="h-4 w-4 mr-2 text-amber-500" />
                                      Añadir a favoritos
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-[#444444]" />
                                    <DropdownMenuItem
                                      onClick={() => setShowLensInput(true)}
                                      className="cursor-pointer hover:bg-[#3A3A3A]"
                                    >
                                      <Plus className="h-4 w-4 mr-2" />
                                      Personalizar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          )}

                          {showLensInput && (
                            <div className="mt-2 space-y-2">
                              <Input
                                placeholder="Lente personalizado"
                                value={customLens}
                                onChange={(e) => setCustomLens(e.target.value)}
                                className="bg-[#2A2A2A] border-[#444444] text-gray-200"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={handleCustomLensSave}
                                  className="bg-amber-600 hover:bg-amber-700 text-white"
                                >
                                  Guardar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setShowLensInput(false)}
                                  className="bg-[#2A2A2A] border-[#444444] text-gray-200"
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          )}

                          <div className="mt-3">
                            <Label className="text-gray-300">Lentes favoritos</Label>
                            <div className="mt-1 space-y-1">
                              {favoriteLenses.map((lens) => (
                                <div
                                  key={lens.id}
                                  className="flex justify-between items-center bg-[#2A2A2A] p-2 rounded-md"
                                >
                                  <Button
                                    variant="ghost"
                                    className="text-sm text-gray-200 hover:text-white p-0 h-auto"
                                    onClick={() => updateCameraSetting("lens", lens.name)}
                                  >
                                    {lens.name}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-gray-400 hover:text-red-400"
                                    onClick={() => removeFromFavoriteLenses(lens.id)}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </TabsContent>

                <TabsContent value="production" className="space-y-4">
                  <Accordion type="single" collapsible defaultValue="lighting">
                    <AccordionItem value="lighting" className="border-[#444444]">
                      <AccordionTrigger className="text-sm font-medium text-gray-300 hover:text-white">
                        Iluminación
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <div>
                          <Label className="text-gray-300">Esquema de iluminación</Label>
                          <Select defaultValue="three-point">
                            <SelectTrigger className="bg-[#2A2A2A] border-[#444444] text-gray-200">
                              <SelectValue placeholder="Seleccionar esquema" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#2A2A2A] border-[#444444] text-gray-200">
                              <SelectItemComponent value="three-point">Iluminación de tres puntos</SelectItemComponent>
                              <SelectItemComponent value="high-key">High Key</SelectItemComponent>
                              <SelectItemComponent value="low-key">Low Key</SelectItemComponent>
                              <SelectItemComponent value="silhouette">Silueta</SelectItemComponent>
                              <SelectItemComponent value="practical">Iluminación práctica</SelectItemComponent>
                              <SelectItemComponent value="natural">Luz natural</SelectItemComponent>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-gray-300">Notas de iluminación</Label>
                          <Textarea
                            placeholder="Describe la iluminación de la escena..."
                            className="min-h-[100px] bg-[#2A2A2A] border-[#444444] text-gray-200"
                            defaultValue={activeScene?.metadata?.lighting || ""}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-gray-300">Temperatura de color</Label>
                            <Select defaultValue="daylight">
                              <SelectTrigger className="bg-[#2A2A2A] border-[#444444] text-gray-200">
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#2A2A2A] border-[#444444] text-gray-200">
                                <SelectItemComponent value="tungsten">Tungsteno (3200K)</SelectItemComponent>
                                <SelectItemComponent value="halogen">Halógeno (3400K)</SelectItemComponent>
                                <SelectItemComponent value="fluorescent">Fluorescente (4500K)</SelectItemComponent>
                                <SelectItemComponent value="daylight">Luz día (5600K)</SelectItemComponent>
                                <SelectItemComponent value="cloudy">Nublado (6500K)</SelectItemComponent>
                                <SelectItemComponent value="shade">Sombra (7500K)</SelectItemComponent>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-gray-300">Contraste</Label>
                            <Select defaultValue="medium">
                              <SelectTrigger className="bg-[#2A2A2A] border-[#444444] text-gray-200">
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#2A2A2A] border-[#444444] text-gray-200">
                                <SelectItemComponent value="very-low">Muy bajo</SelectItemComponent>
                                <SelectItemComponent value="low">Bajo</SelectItemComponent>
                                <SelectItemComponent value="medium">Medio</SelectItemComponent>
                                <SelectItemComponent value="high">Alto</SelectItemComponent>
                                <SelectItemComponent value="very-high">Muy alto</SelectItemComponent>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="audio" className="border-[#444444]">
                      <AccordionTrigger className="text-sm font-medium text-gray-300 hover:text-white">
                        Audio
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <div>
                          <Label className="text-gray-300">Tipo de micrófono</Label>
                          <Select defaultValue="shotgun">
                            <SelectTrigger className="bg-[#2A2A2A] border-[#444444] text-gray-200">
                              <SelectValue placeholder="Seleccionar tipo" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#2A2A2A] border-[#444444] text-gray-200">
                              <SelectItemComponent value="shotgun">Shotgun</SelectItemComponent>
                              <SelectItemComponent value="lavalier">Lavalier</SelectItemComponent>
                              <SelectItemComponent value="boom">Boom</SelectItemComponent>
                              <SelectItemComponent value="wireless">Inalámbrico</SelectItemComponent>
                              <SelectItemComponent value="ambient">Micrófono ambiental</SelectItemComponent>
                              <SelectItemComponent value="studio">Micrófono de estudio</SelectItemComponent>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-gray-300">Notas de audio</Label>
                          <Textarea
                            placeholder="Describe las necesidades de audio para esta toma..."
                            className="min-h-[100px] bg-[#2A2A2A] border-[#444444] text-gray-200"
                            defaultValue={activeScene?.metadata?.audio || ""}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-gray-300">Ambiente sonoro</Label>
                            <Select defaultValue="interior-quiet">
                              <SelectTrigger className="bg-[#2A2A2A] border-[#444444] text-gray-200">
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#2A2A2A] border-[#444444] text-gray-200">
                                <SelectItemComponent value="interior-quiet">Interior silencioso</SelectItemComponent>
                                <SelectItemComponent value="interior-noisy">Interior ruidoso</SelectItemComponent>
                                <SelectItemComponent value="exterior-quiet">Exterior tranquilo</SelectItemComponent>
                                <SelectItemComponent value="exterior-noisy">Exterior ruidoso</SelectItemComponent>
                                <SelectItemComponent value="studio">Estudio controlado</SelectItemComponent>
                                <SelectItemComponent value="underwater">Subacuático</SelectItemComponent>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-gray-300">Efectos de sonido</Label>
                            <Select defaultValue="none">
                              <SelectTrigger className="bg-[#2A2A2A] border-[#444444] text-gray-200">
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#2A2A2A] border-[#444444] text-gray-200">
                                <SelectItemComponent value="none">Ninguno</SelectItemComponent>
                                <SelectItemComponent value="ambient">Ambiente</SelectItemComponent>
                                <SelectItemComponent value="foley">Foley</SelectItemComponent>
                                <SelectItemComponent value="music">Música</SelectItemComponent>
                                <SelectItemComponent value="voiceover">Voz en off</SelectItemComponent>
                                <SelectItemComponent value="sfx">Efectos especiales</SelectItemComponent>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="production-notes" className="border-[#444444]">
                      <AccordionTrigger className="text-sm font-medium text-gray-300 hover:text-white">
                        Notas de producción
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <div>
                          <Label className="text-gray-300">Locación</Label>
                          <Input
                            placeholder="Nombre de la locación"
                            className="bg-[#2A2A2A] border-[#444444] text-gray-200"
                            defaultValue="Estudio principal"
                          />
                        </div>

                        <div>
                          <Label className="text-gray-300">Notas para el director</Label>
                          <Textarea
                            placeholder="Notas importantes para el director..."
                            className="min-h-[100px] bg-[#2A2A2A] border-[#444444] text-gray-200"
                          />
                        </div>

                        <div>
                          <Label className="text-gray-300">Notas para el equipo</Label>
                          <Textarea
                            placeholder="Instrucciones para el equipo de producción..."
                            className="min-h-[100px] bg-[#2A2A2A] border-[#444444] text-gray-200"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-gray-300">Tiempo estimado de rodaje</Label>
                            <Select defaultValue="1-hour">
                              <SelectTrigger className="bg-[#2A2A2A] border-[#444444] text-gray-200">
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#2A2A2A] border-[#444444] text-gray-200">
                                <SelectItemComponent value="30-min">30 minutos</SelectItemComponent>
                                <SelectItemComponent value="1-hour">1 hora</SelectItemComponent>
                                <SelectItemComponent value="2-hours">2 horas</SelectItemComponent>
                                <SelectItemComponent value="half-day">Medio día</SelectItemComponent>
                                <SelectItemComponent value="full-day">Día completo</SelectItemComponent>
                                <SelectItemComponent value="multi-day">Varios días</SelectItemComponent>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-gray-300">Prioridad</Label>
                            <Select defaultValue="medium">
                              <SelectTrigger className="bg-[#2A2A2A] border-[#444444] text-gray-200">
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#2A2A2A] border-[#444444] text-gray-200">
                                <SelectItemComponent value="low">Baja</SelectItemComponent>
                                <SelectItemComponent value="medium">Media</SelectItemComponent>
                                <SelectItemComponent value="high">Alto</SelectItemComponent>
                                <SelectItemComponent value="critical">Crítica</SelectItemComponent>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        {/* Integrar el nuevo sistema de líneas de tiempo */}
        {/* Opción para cambiar entre sistemas (temporal durante la transición) */}
        <div className="mt-2 text-xs text-gray-500">
          <label className="flex items-center space-x-2">
            <input type="checkbox" checked={false} onChange={(e) => {}} className="rounded" />
            <span>Usar nuevo sistema de líneas de tiempo</span>
          </label>
        </div>
      </div>

      {showSceneMasterClock && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-white">Control de tiempo por escenas</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSceneMasterClock(false)}
              className="text-xs bg-[#2A2A2A] border-[#444444] text-gray-400 hover:bg-[#3A3A3A]"
            >
              Ocultar
            </Button>
          </div>
          <SceneMasterClock
            scenes={internalScenes}
            activeSceneIndex={activeSceneIndex}
            setActiveScene={(index) => {
              setActiveSceneIndex(index)
              setActiveImageIndex(0)
              if (setScriptActiveSceneIndex) {
                setScriptActiveSceneIndex(index)
              }
            }}
            isPlaying={isPlaying}
            onTogglePlayPause={togglePlayPause}
            currentTime={currentTime - calculateCurrentShotStartTime()}
            onTimeUpdate={(sceneIndex, time, accumulatedTime, totalProjectDuration) => {
              console.log("SceneMasterClock onTimeUpdate - Índice de escena recibido:", sceneIndex)

              // Si cambiamos de escena, actualizar el índice de escena activa
              if (sceneIndex !== activeSceneIndex) {
                console.log("Actualizando índice de escena activa de", activeSceneIndex, "a", sceneIndex)
                setActiveSceneIndex(sceneIndex)
                setActiveImageIndex(0)

                // IMPORTANTE: Asegurarnos de sincronizar con el editor de guiones
                if (setScriptActiveSceneIndex) {
                  console.log("Actualizando índice de escena activa en el editor de guiones a", sceneIndex)
                  setScriptActiveSceneIndex(sceneIndex)
                }
              }

              // Si tenemos el tiempo acumulado proporcionado, usarlo directamente
              const timeFromStart =
                accumulatedTime !== undefined
                  ? accumulatedTime + time
                  : (() => {
                      // Si no, calcularlo manualmente
                      let calculatedTime = 0
                      for (let i = 0; i < sceneIndex; i++) {
                        if (internalScenes[i] && internalScenes[i].images) {
                          calculatedTime += internalScenes[i].images.reduce((total, img) => total + img.duration, 0)
                        }
                      }
                      return calculatedTime + time
                    })()

              // Establecer el tiempo actual
              setCurrentTime(timeFromStart)

              // Encontrar la imagen correspondiente a este tiempo dentro de la escena
              if (internalScenes[sceneIndex] && internalScenes[sceneIndex].images) {
                let imageTime = 0
                for (let i = 0; i < internalScenes[sceneIndex].images.length; i++) {
                  imageTime += internalScenes[sceneIndex].images[i].duration
                  if (time <= imageTime) {
                    setActiveImageIndex(i)
                    break
                  }
                }
              }

              // Sincronizar con audio si es necesario
              if (audioTrack && audioRef.current && audioDuration > 0 && autoSyncAudioWithShots) {
                // Si tenemos la duración total del proyecto, usarla para un cálculo más preciso
                const effectiveTotalDuration = totalProjectDuration || totalDuration
                const audioTimeRatio = audioDuration / effectiveTotalDuration
                const newAudioTime = timeFromStart * audioTimeRatio

                console.log("Sincronizando audio - Tiempo desde inicio:", timeFromStart)
                console.log("Sincronizando audio - Duración total:", effectiveTotalDuration)
                console.log("Sincronizando audio - Proporción:", audioTimeRatio)
                console.log("Sincronizando audio - Nuevo tiempo de audio:", newAudioTime)

                audioRef.current.currentTime = Math.min(newAudioTime, audioDuration - 0.1)
                setAudioCurrentTime(audioRef.current.currentTime)
              }
            }}
          />
        </div>
      )}

      {!showSceneMasterClock && (
        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSceneMasterClock(true)}
            className="text-xs bg-[#2A2A2A] border-[#444444] text-gray-400 hover:bg-[#3A3A3A]"
          >
            Mostrar control de tiempo por escenas
          </Button>
        </div>
      )}
    </>
  )
}

// Añadir esta línea al final del archivo para mantener la exportación por defecto

// ShotsTimelineTrack component
const ShotsTimelineTrack = ({ shots, activeImageIndex, audioCurrentTime, audioDuration, goToShot, formatTime }) => {
  return (
    <div className="shots-timeline-track w-full">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>
          {formatTime(audioCurrentTime)} / {formatTime(audioDuration)}
        </span>
        <span>
          Toma {activeImageIndex + 1} de {shots.length}
        </span>
      </div>
      <div className="h-2 bg-[#444444] rounded-md overflow-hidden cursor-pointer relative">
        {shots.map((shot, index) => {
          const startPos = (shot.startTime / audioDuration) * 100
          const width = (shot.duration / audioDuration) * 100

          return (
            <div
              key={shot.id}
              className={`h-full ${shot.isActive ? "bg-blue-500" : "bg-blue-400/70"} border-r border-[#2A2A2A] absolute top-0`}
              style={{
                left: `${startPos}%`,
                width: `${width}%`,
              }}
              onClick={() => goToShot(shot.sceneIndex, shot.imageIndex)}
            ></div>
          )
        })}
      </div>
    </div>
  )
}

export default StoryboardEditor
