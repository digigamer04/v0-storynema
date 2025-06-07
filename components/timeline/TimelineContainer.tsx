"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { formatTimeWithMilliseconds } from "@/utils/time"
import { AudioTimelineTrack } from "./AudioTimelineTrack"
import { ShotsTimelineTrack } from "./ShotsTimelineTrack"
import { TimecodeRuler } from "./TimecodeRuler"
import { MagnetismControls } from "./MagnetismControls"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Volume2,
  VolumeX,
  Keyboard,
  Download,
} from "lucide-react"
import { useTimelineGrid } from "@/lib/hooks/useTimelineGrid"
import * as TimelineGrid from "@/lib/timeline-grid"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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

  // Calculate the total duration of all shots in the active scene
  const totalShotsDuration = useMemo(() => {
    if (activeScene && activeScene.images) {
      return activeScene.images.reduce((total, img) => total + (img.duration || 0), 0)
    }
    return 0
  }, [activeScene])

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

  useEffect(() => {
    const audioElement = audioRef.current
    if (!audioElement) return

    const handleTimeUpdate = () => {
      const newAudioTime = audioElement.currentTime
      setAudioCurrentTime(newAudioTime)

      // Usar la grid de tiempo para una conversión más precisa
      if (totalShotsDuration > 0) {
        // Convertir tiempo de audio a puntos de grid
        const audioTimeInGridPoints = TimelineGrid.secondsToGridPoints(newAudioTime)
        const audioDurationInGridPoints = TimelineGrid.secondsToGridPoints(audioDuration)

        // Calcular la proporción con precisión de grid
        const ratio = TimelineGrid.secondsToGridPoints(totalShotsDuration) / audioDurationInGridPoints

        // Convertir a tiempo de toma con precisión de grid
        const mappedShotTimeInGridPoints = audioTimeInGridPoints * ratio
        const mappedShotTime = TimelineGrid.gridPointsToSeconds(mappedShotTimeInGridPoints)

        // Actualizar el tiempo actual con precisión de grid
        timelineGrid.setCurrentTime(mappedShotTime)

        // Encontrar la toma correspondiente a este tiempo con mayor precisión
        let accumulatedTime = 0
        let foundActiveShot = false

        for (let i = 0; i < activeScene.images.length; i++) {
          const shotDuration = activeScene.images[i]?.duration || 0
          const nextAccumulatedTime = accumulatedTime + shotDuration

          // Usar puntos de grid para comparación más precisa
          const accTimeInGridPoints = TimelineGrid.secondsToGridPoints(accumulatedTime)
          const nextAccTimeInGridPoints = TimelineGrid.secondsToGridPoints(nextAccumulatedTime)

          if (
            mappedShotTimeInGridPoints >= accTimeInGridPoints &&
            mappedShotTimeInGridPoints < nextAccTimeInGridPoints
          ) {
            if (i !== activeImageIndex) {
              setActiveImage(activeSceneIndex, i)
            }
            foundActiveShot = true
            break
          }

          accumulatedTime = nextAccumulatedTime
        }

        // Si no se encontró una toma activa y estamos al final, seleccionar la última
        if (
          !foundActiveShot &&
          activeScene.images.length > 0 &&
          mappedShotTime >= accumulatedTime &&
          activeImageIndex !== activeScene.images.length - 1
        ) {
          setActiveImage(activeSceneIndex, activeScene.images.length - 1)
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
  }, [])

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
    return formatTimeWithMilliseconds(seconds)
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

      edlContent += `${(index + 1).toString().padStart(3, "0")}  AX       V     C        ${startTimecode} ${endTimecode} ${startTimecode} ${endTimecode}\n`
      edlContent += `* FROM CLIP NAME: ${shot.description || `Shot ${index + 1}`}\n\n`
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

  // Modificar la función goToShot para sincronizar correctamente con el tiempo acumulado
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
        scenes[i].images.forEach((img) => {
          accumulatedTimeToScene += img.duration || 0
        })
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

    // Update the active shot time
    if (audioRef.current) {
      audioRef.current.currentTime = totalTimeToSelectedShot
      setAudioCurrentTime(totalTimeToSelectedShot)
    }
  }

  return (
    <div ref={containerRef} className="timeline-container w-full bg-[#1E1E1E] p-4 rounded-lg">
      {/* Audio element (hidden) */}
      <audio
        ref={audioRef}
        src={audioSrc}
        onTimeUpdate={() => {
          if (audioRef.current && onAudioTimeUpdate) {
            onAudioTimeUpdate(audioRef.current.currentTime)
          }
        }}
        onEnded={() => {
          setIsPlaying(false)
        }}
        muted={audioMuted}
        volume={audioVolume}
        className="hidden"
      />

      {/* Master timecode ruler */}
      <TimecodeRuler
        duration={audioDuration || totalShotsDuration}
        frameRate={timelineGrid.frameRate}
        zoomLevel={zoomLevel}
        scrollPosition={scrollPosition}
        onSeek={(time) => {
          if (audioRef.current && audioDuration > 0) {
            audioRef.current.currentTime = time
            setAudioCurrentTime(time)
          } else {
            // Si no hay audio, usar el tiempo directamente para las tomas
            timelineGrid.setCurrentTime(time)

            // Encontrar la toma correspondiente
            let accumulatedTime = 0
            for (let i = 0; i < activeScene.images.length; i++) {
              accumulatedTime += activeScene.images[i]?.duration || 0
              if (time <= accumulatedTime) {
                setActiveImage(activeSceneIndex, i)
                break
              }
            }
          }
        }}
      />

      {/* Timeline tracks */}
      <div
        ref={timelineTracksRef}
        className="timeline-tracks space-y-4 overflow-hidden"
        style={{
          transform: `scaleX(${zoomLevel})`,
          transformOrigin: "left",
          width: `${100 / zoomLevel}%`,
          marginLeft: `-${scrollPosition}px`,
        }}
        onWheel={handleScroll}
      >
        <div className="overflow-x-auto pb-2">
          {/* Audio track (if audio exists) */}
          {audioSrc && audioRef.current && (
            <AudioTimelineTrack
              audioCurrentTime={audioCurrentTime}
              audioDuration={audioDuration}
              shots={activeScene?.images || []}
              activeSceneIndex={activeSceneIndex}
              activeImageIndex={activeImageIndex}
              calculateAudioProgress={() => {
                if (!audioRef.current || audioRef.current.duration === 0) return 0
                return (audioRef.current.currentTime / audioRef.current.duration) * 100
              }}
              onSeek={(percent) => {
                handleSeek(percent)
              }}
              theme={{
                backgroundColor: "bg-[#2A2A2A]",
                activeColor: "bg-amber-500",
                inactiveColor: "bg-amber-500/50",
                playheadColor: "bg-white",
              }}
              isMagnetismEnabled={timelineGrid.isMagnetismEnabled}
              magneticPoints={timelineGrid.magneticPoints}
              totalShotsDuration={totalShotsDuration}
              audioRef={audioRef}
              audioUrl={audioSrc}
            />
          )}

          {/* Shots track */}
          <ShotsTimelineTrack
            shots={activeScene?.images || []}
            activeImageIndex={activeImageIndex}
            shotCurrentTime={shotCurrentTime}
            totalDuration={totalShotsDuration}
            audioDuration={audioDuration}
            audioCurrentTime={audioCurrentTime}
            onSeek={handleSeek}
            onShotSelect={(sceneIndex, imageIndex) => {
              // Asegurarse de que se pasan ambos parámetros correctamente
              goToShot(sceneIndex, imageIndex)
            }}
            theme={{
              backgroundColor: "bg-[#2A2A2A]",
              activeColor: "bg-blue-500",
              inactiveColor: "bg-blue-400/70",
              playheadColor: "bg-white",
            }}
            isMagnetismEnabled={timelineGrid.isMagnetismEnabled}
            magneticPoints={timelineGrid.magneticPoints}
            activeSceneIndex={activeSceneIndex}
          />
        </div>
      </div>

      {/* Timeline controls */}
      <div className="timeline-controls flex items-center justify-between mt-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setActiveScene(Math.max(0, activeSceneIndex - 1))}
            disabled={activeSceneIndex === 0}
            className="h-8 w-8 bg-[#2A2A2A] border-[#444444] text-gray-200 hover:bg-[#3A3A3A]"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-300">
            Escena {activeSceneIndex + 1}/{scenes.length}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setActiveScene(Math.min(scenes.length - 1, activeSceneIndex + 1))}
            disabled={activeSceneIndex === scenes.length - 1}
            className="h-8 w-8 bg-[#2A2A2A] border-[#444444] text-gray-200 hover:bg-[#3A3A3A]"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrevFrame}
                  className="h-8 w-8 bg-[#2A2A2A] border-[#444444] text-gray-200 hover:bg-[#3A3A3A]"
                >
                  <SkipBack className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Frame anterior (Shift+←)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isPlaying ? "default" : "outline"}
                  size="icon"
                  onClick={togglePlayPause}
                  className={`h-8 w-8 ${
                    isPlaying
                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                      : "bg-[#2A2A2A] border-[#444444] text-gray-200 hover:bg-[#3A3A3A]"
                  }`}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reproducir/Pausar (Espacio)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextFrame}
                  className="h-8 w-8 bg-[#2A2A2A] border-[#444444] text-gray-200 hover:bg-[#3A3A3A]"
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Frame siguiente (Shift+→)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-300 font-mono">
            {formatTime(audioCurrentTime)} / {formatTime(audioDuration || totalShotsDuration)}
          </span>
          <span className="text-xs text-gray-500 font-mono">{formatSmpteTime(audioCurrentTime)}</span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Magnetism Controls */}
          <MagnetismControls
            isMagnetismEnabled={timelineGrid.isMagnetismEnabled}
            toggleMagnetism={timelineGrid.toggleMagnetism}
            magnetismStrength={timelineGrid.magnetismStrengthValue}
            setMagnetismStrength={timelineGrid.setMagnetismStrength}
            magneticPointType={timelineGrid.activeMagneticPointType}
            setMagneticPointType={timelineGrid.setMagneticPointType}
            customInterval={timelineGrid.customInterval}
            setCustomInterval={timelineGrid.setCustomMagneticInterval}
          />

          {audioSrc && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleMute}
                      className="h-8 w-8 text-gray-400 hover:text-white"
                    >
                      {audioMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Silenciar/Activar audio (M)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="w-24">
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={[audioVolume]}
                  onValueChange={handleVolumeChange}
                  disabled={audioMuted}
                  className="w-full"
                />
              </div>
            </>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomOut}
                  className="h-8 w-8 text-gray-400 hover:text-white"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reducir zoom (Ctrl+-)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <span className="text-xs text-gray-400">{Math.round(zoomLevel * 100)}%</span>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomIn}
                  className="h-8 w-8 text-gray-400 hover:text-white"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Aumentar zoom (Ctrl++)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={exportEDL}
                  className="h-8 w-8 text-gray-400 hover:text-white"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Exportar EDL (Ctrl+S)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
                  className="h-8 w-8 text-gray-400 hover:text-white"
                >
                  <Keyboard className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Mostrar atajos de teclado</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Keyboard shortcuts panel */}
      {showKeyboardShortcuts && (
        <div className="mt-4 p-3 bg-[#2A2A2A] rounded-md text-gray-300 text-sm">
          <h3 className="font-medium mb-2">Atajos de teclado</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p>
                <span className="bg-[#444] px-1 rounded">Espacio</span> - Reproducir/Pausar
              </p>
              <p>
                <span className="bg-[#444] px-1 rounded">Shift+←</span> - Frame anterior
              </p>
              <p>
                <span className="bg-[#444] px-1 rounded">Shift+→</span> - Frame siguiente
              </p>
            </div>
            <div>
              <p>
                <span className="bg-[#444] px-1 rounded">M</span> - Silenciar/Activar audio
              </p>
              <p>
                <span className="bg-[#444] px-1 rounded">Ctrl++</span> - Aumentar zoom
              </p>
              <p>
                <span className="bg-[#444] px-1 rounded">Ctrl+-</span> - Reducir zoom
              </p>
              <p>
                <span className="bg-[#444] px-1 rounded">Ctrl+S</span> - Exportar EDL
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Exportar el componente como predeterminado también
export default TimelineContainer
