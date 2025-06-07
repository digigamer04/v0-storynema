"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { ArrowDownToLine, ArrowUpToLine, Clock, Film, Mic } from "lucide-react"
import { useTimelineGrid } from "@/lib/hooks/useTimelineGrid"
import * as TimelineGrid from "@/lib/timeline-grid"
import MasterClock from "./MasterClock"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import SceneMasterClock from "./SceneMasterClock"

interface TimelineContainerProps {
  scenes: any[]
  activeSceneIndex: number
  activeImageIndex: number
  setActiveScene: (index: number) => void
  setActiveImage: (sceneIndex: number, imageIndex: number) => void
  audioSrc?: string
  onAudioTimeUpdate?: (time: number) => void
  projectId: string
}

// Define the Scene type if not already defined elsewhere
interface Scene {
  id: string
  name: string
  images: {
    id: string
    url: string
    duration: number
    description?: string
  }[]
  duration?: number
}

export function TimelineContainer({
  scenes,
  activeSceneIndex,
  activeImageIndex,
  setActiveScene,
  setActiveImage,
  audioSrc,
  onAudioTimeUpdate,
  projectId,
}: TimelineContainerProps) {
  // Usar nuestro hook de grid de tiempo con magnetismo
  const timelineGrid = useTimelineGrid({
    precision: TimelineGrid.GRID_PRECISION,
    frameRate: TimelineGrid.FRAME_RATES.FILM,
    snapToGrid: true,
    magnetismEnabled: false, // Desactivado por defecto
    magnetismStrength: TimelineGrid.MAGNETISM_STRENGTHS.MEDIUM,
    magneticPointType: TimelineGrid.MAGNETIC_POINTS.SECOND,
  })

  const [isPlaying, setIsPlaying] = useState(false)
  const [audioVolume, setAudioVolume] = useState(1)
  const [audioMuted, setAudioMuted] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [audioTrack, setAudioTrack] = useState(!!audioSrc)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const timelineTracksRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const activeScene = scenes[activeSceneIndex]
  const activeShot = activeScene?.images?.[activeImageIndex]
  const [audioDuration, setAudioDuration] = useState(0)
  const [audioCurrentTime, setAudioCurrentTime] = useState(0)
  const [shotCurrentTime, setShotCurrentTime] = useState(0)
  const [showMasterClock, setShowMasterClock] = useState(true)
  const [masterClockPosition, setMasterClockPosition] = useState<"top" | "bottom">("top")
  const [showSceneMasterClock, setShowSceneMasterClock] = useState(true)

  // Calculate the total duration of all shots in the active scene
  const totalShotsDuration = useMemo(() => {
    if (activeScene && activeScene.images) {
      return activeScene.images.reduce((total, img) => total + (img.duration || 0), 0)
    }
    return 0
  }, [activeScene])

  // Calcular la duración total de todas las escenas
  const calculateTotalProjectDuration = useCallback(() => {
    return scenes.reduce((total, scene) => {
      if (!scene || !scene.images) return total
      return total + scene.images.reduce((sum, img) => sum + (img.duration || 0), 0)
    }, 0)
  }, [scenes])

  // Generar datos de forma de onda simulados (en una aplicación real, estos vendrían del análisis del archivo de audio)
  useEffect(() => {
    if (audioRef.current && audioSrc) {
      // Simular datos de forma de onda
      const generateWaveformData = (duration: number) => {
        const numSamples = 100 // Ajusta esto para más o menos detalle
        const waveform = []
        for (let i = 0; i < numSamples; i++) {
          const sample = Math.sin((i / numSamples) * Math.PI * 2) // Una simple onda sinusoidal
          waveform.push(sample)
        }
        return waveform
      }

      const waveformData = generateWaveformData(audioRef.current.duration)
      // Aquí podrías guardar waveformData en el estado o usarlo directamente
    }
  }, [audioSrc])

  const handleTimeUpdate = () => {
    const audioElement = audioRef.current
    if (!audioElement) return

    const newAudioTime = audioElement.currentTime
    setAudioCurrentTime(newAudioTime)
    const ratio = totalShotsDuration / audioDuration
    // Sincronizar el tiempo de las tomas con el tiempo de audio
    if (totalShotsDuration > 0) {
      const mappedShotTime = newAudioTime * ratio
      timelineGrid.setCurrentTime(mappedShotTime)

      // Encontrar la toma correspondiente a este tiempo
      let accumulatedTime = 0
      for (let i = 0; i < activeScene.images.length; i++) {
        accumulatedTime += activeScene.images[i]?.duration || 0
        if (mappedShotTime <= accumulatedTime) {
          if (i !== activeImageIndex) {
            setActiveImage(activeSceneIndex, i)
          }
          break
        }
      }
    }

    // Notificar al componente padre
    if (onAudioTimeUpdate) {
      onAudioTimeUpdate(newAudioTime)
    }
  }

  const handleLoadedMetadata = () => {
    setAudioDuration(Number(audioRef.current.duration.toFixed(3)))
  }

  const handlePlay = () => {
    setIsPlaying(true)
  }

  const handlePause = () => {
    setIsPlaying(false)
  }

  useEffect(() => {
    const audioElement = audioRef.current
    if (!audioElement) return

    const handleTimeUpdate = () => {
      const newAudioTime = audioElement.currentTime
      setAudioCurrentTime(newAudioTime)
      const ratio = totalShotsDuration / audioDuration
      // Sincronizar el tiempo de las tomas con el tiempo de audio
      if (totalShotsDuration > 0) {
        const mappedShotTime = newAudioTime * ratio
        timelineGrid.setCurrentTime(mappedShotTime)

        // Encontrar la toma correspondiente a este tiempo
        let accumulatedTime = 0
        for (let i = 0; i < activeScene.images.length; i++) {
          accumulatedTime += activeScene.images[i]?.duration || 0
          if (mappedShotTime <= accumulatedTime) {
            if (i !== activeImageIndex) {
              setActiveImage(activeSceneIndex, i)
            }
            break
          }
        }
      }

      // Notificar al componente padre
      if (onAudioTimeUpdate) {
        onAudioTimeUpdate(newAudioTime)
      }
    }

    const handleLoadedMetadata = () => {
      setAudioDuration(Number(audioElement.duration.toFixed(3)))
    }

    const handlePlay = () => {
      setIsPlaying(true)
    }

    const handlePause = () => {
      setIsPlaying(false)
    }

    audioElement.addEventListener("timeupdate", handleTimeUpdate)
    audioElement.addEventListener("loadedmetadata", handleLoadedMetadata)
    audioElement.addEventListener("play", handlePlay)
    audioElement.addEventListener("pause", handlePause)

    return () => {
      audioElement.removeEventListener("timeupdate", handleTimeUpdate)
      audioElement.removeEventListener("loadedmetadata", handleLoadedMetadata)
      audioElement.removeEventListener("play", handlePlay)
      audioElement.removeEventListener("pause", handlePause)
    }
  }, [
    audioRef,
    onAudioTimeUpdate,
    activeScene,
    activeSceneIndex,
    activeImageIndex,
    setActiveImage,
    totalShotsDuration,
    timelineGrid,
    audioDuration,
  ])

  // Manejar la búsqueda en la línea de tiempo con magnetismo
  const handleSeek = useCallback(
    (percent: number) => {
      if (!audioRef.current || !audioDuration) return

      const tAudio = (percent / 100) * audioDuration
      audioRef.current.currentTime = tAudio
    },
    [audioRef, audioDuration],
  )

  // Manejar el cambio de volumen
  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0]
    setAudioVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
  }, [])

  // Alternar silencio
  const toggleMute = useCallback(() => {
    setAudioMuted(!audioMuted)
    if (audioRef.current) {
      audioRef.current.muted = !audioMuted
    }
  }, [audioMuted])

  // Manejar zoom
  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev * 1.2, 5))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev / 1.2, 0.5))
  }, [zoomLevel])

  // Manejar scroll horizontal
  const handleScroll = useCallback(
    (e: React.WheelEvent) => {
      if (e.shiftKey && timelineTracksRef.current) {
        e.preventDefault()
        const newScrollPosition = scrollPosition + e.deltaY
        setScrollPosition(Math.max(0, newScrollPosition))
      }
    },
    [scrollPosition],
  )

  // Avanzar un frame
  const handleNextFrame = useCallback(() => {
    if (!audioRef.current) return

    // Calcular el tiempo de un frame
    const frameTime = 1 / timelineGrid.frameRate

    // Avanzar un frame en el tiempo de audio
    const newAudioTime = Math.min(audioRef.current.duration, audioCurrentTime + frameTime)
    audioRef.current.currentTime = newAudioTime
    setAudioCurrentTime(newAudioTime)
  }, [audioCurrentTime, timelineGrid.frameRate])

  // Retroceder un frame
  const handlePrevFrame = useCallback(() => {
    if (!audioRef.current) return

    // Calcular el tiempo de un frame
    const frameTime = 1 / timelineGrid.frameRate

    // Retroceder un frame en el tiempo de audio
    const newAudioTime = Math.max(0, audioCurrentTime - frameTime)
    audioRef.current.currentTime = newAudioTime
    setAudioCurrentTime(newAudioTime)
  }, [audioCurrentTime, timelineGrid.frameRate])

  // Reproducir/pausar
  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch((error) => {
        console.error("Error al reproducir audio:", error)
      })
    }
  }, [isPlaying])

  // Formatear tiempo (mm:ss.ms)
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`
  }, [])

  // Formatear tiempo SMPTE (hh:mm:ss:ff)
  const formatSmpteTime = useCallback(
    (seconds: number) => {
      return timelineGrid.secondsToSmpte(seconds)
    },
    [timelineGrid],
  )

  // Exportar la línea de tiempo como EDL
  const exportEDL = useCallback(() => {
    if (!activeScene || !activeScene.images || !audioSrc) return

    let edlContent = "TITLE: Storynema Timeline\n"
    edlContent += "FCM: NON-DROP FRAME\n\n"

    let accumulatedTime = 0

    activeScene.images.forEach((shot, index) => {
      const startTimecode = timelineGrid.secondsToSmpte(accumulatedTime)
      accumulatedTime += shot.duration
      const endTimecode = timelineGrid.secondsToSmpte(accumulatedTime)

      edlContent += `${(index + 1).toString().padStart(3, "0")}  AX       V     C        ${startTimecode} ${endTimecode} ${startTimecode} ${endTimecode}
`
      edlContent += `* FROM CLIP NAME: ${shot.description || `Shot ${index + 1}`}

`
    })

    // Crear un blob y descargar
    const blob = new Blob([edlContent], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "storynema_timeline.edl"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [activeScene, audioSrc, timelineGrid])

  // Manejar atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Evitar conflictos con inputs de texto
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key) {
        case " ": // Espacio para reproducir/pausar
          e.preventDefault()
          togglePlayPause()
          break
        case "ArrowRight":
          if (e.shiftKey) {
            // Shift + Derecha para avanzar un frame
            e.preventDefault()
            handleNextFrame()
          }
          break
        case "ArrowLeft":
          if (e.shiftKey) {
            // Shift + Izquierda para retroceder un frame
            e.preventDefault()
            handlePrevFrame()
          }
          break
        case "m":
          // M para silenciar/activar audio
          toggleMute()
          break
        case "+":
        case "=":
          // + para aumentar zoom
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            handleZoomIn()
          }
          break
        case "-":
          // - para reducir zoom
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            handleZoomOut()
          }
          break
        case "s":
          // Ctrl/Cmd + S para exportar
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            exportEDL()
          }
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [togglePlayPause, handleNextFrame, handlePrevFrame, toggleMute, handleZoomIn, handleZoomOut, exportEDL])

  // Actualizar la función goToShot para usar la duración total del proyecto
  const goToShot = (sceneIndex: number, imageIndex: number) => {
    // Se permiten pasar solo el índice de imagen cuando se quiere navegar dentro de la escena actual
    if (imageIndex === undefined) {
      imageIndex = sceneIndex
      sceneIndex = activeSceneIndex
    }

    // Verificar que los índices son válidos
    if (
      sceneIndex < 0 ||
      sceneIndex >= scenes.length ||
      !scenes[sceneIndex].images ||
      imageIndex < 0 ||
      imageIndex >= scenes[sceneIndex].images.length
    )
      return

    // Si cambiamos de escena, actualizar también el índice de escena activa
    if (sceneIndex !== activeSceneIndex) {
      setActiveScene(sceneIndex)
    }

    // Establece la toma activa
    setActiveImage(sceneIndex, imageIndex)

    // Calcular el tiempo acumulado hasta la escena seleccionada
    let accumulatedTimeToScene = 0
    for (let i = 0; i < sceneIndex; i++) {
      if (scenes[i] && scenes[i].images) {
        accumulatedTimeToScene += scenes[i].images.reduce((total, img) => total + (img.duration || 0), 0)
      }
    }

    // Calcular el tiempo exacto de inicio de la toma seleccionada dentro de la escena
    let elapsedTimeBeforeCurrentImage = 0
    for (let i = 0; i < imageIndex; i++) {
      if (scenes[sceneIndex].images[i]) {
        elapsedTimeBeforeCurrentImage += scenes[sceneIndex].images[i].duration || 0
      }
    }

    // Tiempo total desde el inicio del proyecto hasta la toma seleccionada
    const totalTimeToSelectedShot = accumulatedTimeToScene + elapsedTimeBeforeCurrentImage

    // Calcular la duración total del proyecto
    const totalProjectDuration = calculateTotalProjectDuration()

    // Sincronizar con audio
    if (audioRef.current && audioDuration > 0) {
      const audioTimeRatio = audioDuration / totalProjectDuration
      const newAudioTime = totalTimeToSelectedShot * audioTimeRatio

      console.log("goToShot - Tiempo acumulado hasta la escena:", accumulatedTimeToScene)
      console.log("goToShot - Tiempo acumulado hasta la toma:", totalTimeToSelectedShot)
      console.log("goToShot - Duración total del proyecto:", totalProjectDuration)
      console.log("goToShot - Proporción tiempo audio/tomas:", audioTimeRatio)
      console.log("goToShot - Nuevo tiempo de audio calculado:", newAudioTime)

      audioRef.current.currentTime = Math.min(newAudioTime, audioDuration - 0.1)
      setAudioCurrentTime(audioRef.current.currentTime)
    }
  }

  // Manejar la actualización de tiempo desde SceneMasterClock
  const handleSceneMasterClockTimeUpdate = (
    sceneIndex: number,
    time: number,
    accumulatedTime?: number,
    totalProjectDuration?: number,
  ) => {
    // Actualizar el índice de escena activa
    if (sceneIndex !== activeSceneIndex) {
      setActiveScene(sceneIndex)
      setActiveImage(sceneIndex, 0) // Ir a la primera toma de la escena
    }

    // Si tenemos el tiempo acumulado y la duración total, usarlos para sincronizar el audio
    if (accumulatedTime !== undefined && totalProjectDuration !== undefined && audioRef.current && audioDuration > 0) {
      // Usar la duración total del proyecto para calcular la proporción correcta
      const audioTimeRatio = audioDuration / totalProjectDuration
      const newAudioTime = accumulatedTime * audioTimeRatio

      console.log("SceneMasterClock - Tiempo acumulado:", accumulatedTime)
      console.log("SceneMasterClock - Duración total:", totalProjectDuration)
      console.log("SceneMasterClock - Proporción tiempo audio/tomas:", audioTimeRatio)
      console.log("SceneMasterClock - Nuevo tiempo de audio calculado:", newAudioTime)

      // Actualizar la posición del audio
      audioRef.current.currentTime = Math.min(newAudioTime, audioDuration - 0.1)
      setAudioCurrentTime(audioRef.current.currentTime)
    }
  }

  const toggleMasterClockPosition = () => {
    setMasterClockPosition(masterClockPosition === "top" ? "bottom" : "top")
  }

  return (
    <div className="space-y-4">
      {/* Audio element (hidden) */}
      <audio ref={audioRef} src={audioSrc} className="hidden" />

      {/* Scene Master Clock */}
      {showSceneMasterClock && (
        <div className="mb-4">
          <SceneMasterClock
            scenes={scenes}
            activeSceneIndex={activeSceneIndex}
            setActiveScene={setActiveScene} // Asegurarse de que esta función exista y se pase correctamente
            isPlaying={isPlaying}
            onTogglePlayPause={togglePlayPause}
            currentTime={shotCurrentTime}
            onTimeUpdate={handleSceneMasterClockTimeUpdate}
          />
        </div>
      )}

      {/* Master Clock (top position) */}
      {showMasterClock && masterClockPosition === "top" && (
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <MasterClock
              scenes={scenes}
              activeSceneIndex={activeSceneIndex}
              activeImageIndex={activeImageIndex}
              audioSrc={audioSrc}
              audioDuration={audioDuration}
              audioCurrentTime={audioCurrentTime}
              isPlaying={isPlaying}
              onSeek={handleSeek}
              onShotSelect={goToShot}
              onTogglePlayPause={togglePlayPause}
            />
          </div>
          <div className="ml-2 flex flex-col gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMasterClockPosition}
              className="h-8 w-8 text-gray-400 hover:text-white"
            >
              <ArrowDownToLine className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMasterClock(false)}
              className="h-8 w-8 text-gray-400 hover:text-white"
            >
              <Clock className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Timeline Container */}
      <Card className="bg-[#1E1E1E] border-[#333333]">
        <CardContent className="p-4">
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="grid grid-cols-2 mb-4 bg-[#2A2A2A]">
              <TabsTrigger value="timeline" className="flex items-center gap-1">
                <Film className="h-4 w-4" />
                Línea de tiempo
              </TabsTrigger>
              <TabsTrigger value="audio" className="flex items-center gap-1">
                <Mic className="h-4 w-4" />
                Audio
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timeline">
              {/* <TimelineContainer
               scenes={scenes}
               activeSceneIndex={activeSceneIndex}
               activeImageIndex={activeImageIndex}
               setActiveScene={setActiveScene}
               setActiveImage={setActiveImage}
               audioSrc={audioSrc}
               onAudioTimeUpdate={setAudioCurrentTime}
               projectId={projectId}
             /> */}
            </TabsContent>

            <TabsContent value="audio">
              <div className="p-4 bg-[#2A2A2A] rounded-md">
                <h3 className="text-lg font-semibold text-white mb-4">Control de audio</h3>
                {audioSrc ? (
                  <div className="space-y-4">
                    <div className="bg-[#1E1E1E] p-3 rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-300">Pista de audio actual</span>
                        <span className="text-gray-400 text-sm">
                          {Math.floor(audioCurrentTime / 60)}:
                          {Math.floor(audioCurrentTime % 60)
                            .toString()
                            .padStart(2, "0")}{" "}
                          /{Math.floor(audioDuration / 60)}:
                          {Math.floor(audioDuration % 60)
                            .toString()
                            .padStart(2, "0")}
                        </span>
                      </div>

                      <div
                        className="h-3 bg-[#444444] rounded-full overflow-hidden cursor-pointer mb-2"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect()
                          const clickPosition = e.clientX - rect.left
                          const percent = clickPosition / rect.width
                          handleSeek(percent * audioDuration)
                        }}
                      >
                        <div
                          className="h-full bg-amber-500"
                          style={{ width: `${(audioCurrentTime / audioDuration) * 100}%` }}
                        ></div>
                      </div>

                      <div className="flex justify-center">
                        <Button
                          variant={isPlaying ? "default" : "outline"}
                          onClick={togglePlayPause}
                          className={`${isPlaying ? "bg-amber-600 text-white" : "bg-[#2A2A2A] text-gray-300"}`}
                        >
                          {isPlaying ? "Pausar" : "Reproducir"}
                        </Button>
                      </div>
                    </div>

                    <div className="text-sm text-gray-400">
                      <p>
                        El audio está sincronizado con la línea de tiempo de tomas. Puedes usar el Master Clock para una
                        sincronización más precisa.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <p>No hay pista de audio cargada</p>
                    <Button variant="outline" className="mt-4 bg-[#2A2A2A] border-[#444444] text-gray-300">
                      Cargar audio
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Master Clock (bottom position) */}
      {showMasterClock && masterClockPosition === "bottom" && (
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <MasterClock
              scenes={scenes}
              activeSceneIndex={activeSceneIndex}
              activeImageIndex={activeImageIndex}
              audioSrc={audioSrc}
              audioDuration={audioDuration}
              audioCurrentTime={audioCurrentTime}
              isPlaying={isPlaying}
              onSeek={handleSeek}
              onShotSelect={goToShot}
              onTogglePlayPause={togglePlayPause}
            />
          </div>
          <div className="ml-2 flex flex-col gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMasterClockPosition}
              className="h-8 w-8 text-gray-400 hover:text-white"
            >
              <ArrowUpToLine className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMasterClock(false)}
              className="h-8 w-8 text-gray-400 hover:text-white"
            >
              <Clock className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Show Master Clock button (when hidden) */}
      {!showMasterClock && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMasterClock(true)}
            className="flex items-center gap-1 bg-[#2A2A2A] border-[#444444] text-gray-300"
          >
            <Clock className="h-4 w-4" />
            Mostrar Master Clock
          </Button>
        </div>
      )}
    </div>
  )
}

export default TimelineContainer
