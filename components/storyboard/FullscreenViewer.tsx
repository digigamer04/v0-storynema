"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize,
  Minimize,
  Info,
  Camera,
  Clock,
  Film,
  Settings,
} from "lucide-react"
import type { StoryboardImage, StoryboardScene, CameraSettings } from "./types"
import { formatTime } from "./utils"

interface FullscreenViewerProps {
  isOpen: boolean
  onClose: () => void
  activeScene: StoryboardScene
  activeImage: StoryboardImage
  activeSceneIndex: number
  activeImageIndex: number
  isPlaying: boolean
  onTogglePlayPause: () => void
  onNextImage: () => void
  onPrevImage: () => void
  onGoToShot: (sceneIndex: number, imageIndex: number) => void
  scenes: StoryboardScene[]
}

export function FullscreenViewer({
  isOpen,
  onClose,
  activeScene,
  activeImage,
  activeSceneIndex,
  activeImageIndex,
  isPlaying,
  onTogglePlayPause,
  onNextImage,
  onPrevImage,
  onGoToShot,
  scenes,
}: FullscreenViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const mouseIdleTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Manejar la entrada y salida del modo pantalla completa
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return

    if (!document.fullscreenElement) {
      containerRef.current
        .requestFullscreen()
        .then(() => {
          setIsFullscreen(true)
        })
        .catch((err) => {
          console.error(`Error al intentar mostrar pantalla completa:`, err)
        })
    } else {
      document
        .exitFullscreen()
        .then(() => {
          setIsFullscreen(false)
        })
        .catch((err) => {
          console.error(`Error al intentar salir de pantalla completa:`, err)
        })
    }
  }, [])

  // Manejar la reproducción de video
  useEffect(() => {
    if (videoRef.current && activeImage.url.endsWith(".mp4")) {
      if (isPlaying) {
        videoRef.current.play().catch((err) => {
          console.error("Error al reproducir video:", err)
        })
      } else {
        videoRef.current.pause()
      }
    }
  }, [isPlaying, activeImage.url])

  // Mostrar/ocultar controles automáticamente
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }

    setShowControls(true)

    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false)
    }, 3000) // Ocultar controles después de 3 segundos de inactividad
  }, [])

  // Detectar movimiento del mouse
  const handleMouseMove = useCallback(() => {
    resetControlsTimeout()

    // Reiniciar el timeout de inactividad del mouse
    if (mouseIdleTimeoutRef.current) {
      clearTimeout(mouseIdleTimeoutRef.current)
    }

    mouseIdleTimeoutRef.current = setTimeout(() => {
      setShowControls(false)
    }, 3000)
  }, [resetControlsTimeout])

  // Limpiar timeouts al desmontar
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      if (mouseIdleTimeoutRef.current) {
        clearTimeout(mouseIdleTimeoutRef.current)
      }
    }
  }, [])

  // Manejar eventos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case "Escape":
          if (!showDetailsModal) {
            onClose()
          }
          break
        case " ": // Espacio
          e.preventDefault()
          onTogglePlayPause()
          break
        case "ArrowRight":
          onNextImage()
          break
        case "ArrowLeft":
          onPrevImage()
          break
        case "f":
          toggleFullscreen()
          break
        case "i":
          setShowDetailsModal((prev) => !prev)
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose, onTogglePlayPause, onNextImage, onPrevImage, toggleFullscreen, showDetailsModal])

  // Manejar cambios en el estado de pantalla completa
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  // Salir de pantalla completa al cerrar el visor
  useEffect(() => {
    if (!isOpen && document.fullscreenElement) {
      document.exitFullscreen().catch((err) => {
        console.error("Error al salir de pantalla completa:", err)
      })
    }
  }, [isOpen])

  if (!isOpen || !activeImage) return null

  // Renderizar el contenido multimedia (imagen o video)
  const renderMedia = () => {
    if (activeImage.url.endsWith(".mp4")) {
      return (
        <video ref={videoRef} src={activeImage.url} className="w-full h-full object-contain" controls={false} loop />
      )
    } else {
      return (
        <img
          src={activeImage.url || "/placeholder.svg"}
          alt={activeImage.description || "Imagen de storyboard"}
          className="w-full h-full object-contain"
        />
      )
    }
  }

  // Formatear la configuración de cámara para mostrarla
  const formatCameraInfo = (settings?: CameraSettings) => {
    if (!settings) return "No hay información de cámara"

    const parts = []
    if (settings.model) parts.push(settings.model)
    if (settings.lens) parts.push(settings.lens)
    if (settings.focalLength) parts.push(settings.focalLength)
    if (settings.aperture) parts.push(settings.aperture)

    return parts.join(" | ")
  }

  const formatExposureInfo = (settings?: CameraSettings) => {
    if (!settings) return ""

    const parts = []
    if (settings.shutterSpeed) parts.push(`${settings.shutterSpeed}`)
    if (settings.iso) parts.push(`ISO ${settings.iso}`)

    return parts.join(" | ")
  }

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 bg-black flex flex-col ${isOpen ? "block" : "hidden"}`}
      onMouseMove={handleMouseMove}
    >
      {/* Área principal de visualización */}
      <div className="flex-grow relative">
        {renderMedia()}

        {/* Botón de cerrar (siempre visible) */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 bg-black/50 text-white hover:bg-black/70 z-10"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Barra de información y controles */}
      <div className={`bg-black/80 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}>
        {/* Información básica */}
        <div className="p-3 border-t border-gray-800 text-white">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Camera className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-gray-300">{formatCameraInfo(activeImage.cameraSettings)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-gray-300">{formatExposureInfo(activeImage.cameraSettings)}</span>
            </div>
          </div>

          <div className="mt-2 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Film className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">{activeScene.title || `Escena ${activeSceneIndex + 1}`}</span>
              <span className="text-xs text-gray-400">
                Toma {activeImageIndex + 1}/{activeScene.images.length}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-gray-300">{formatTime(activeImage.duration || 3)}s</span>
            </div>
          </div>

          {activeImage.description && (
            <div className="mt-2 text-sm text-gray-300 line-clamp-1">{activeImage.description}</div>
          )}
        </div>

        {/* Controles de reproducción */}
        <div className="p-3 flex justify-between items-center border-t border-gray-800">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={onPrevImage} className="text-white hover:bg-gray-800">
              <SkipBack className="h-5 w-5" />
            </Button>

            <Button variant="ghost" size="icon" onClick={onTogglePlayPause} className="text-white hover:bg-gray-800">
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </Button>

            <Button variant="ghost" size="icon" onClick={onNextImage} className="text-white hover:bg-gray-800">
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDetailsModal(true)}
              className="text-white hover:bg-gray-800"
            >
              <Info className="h-5 w-5" />
            </Button>

            <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-white hover:bg-gray-800">
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de detalles */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="bg-[#1E1E1E] border-[#333333] text-white max-w-3xl">
          <div className="grid grid-cols-3 gap-4">
            {/* Vista previa */}
            <div className="col-span-1 bg-black rounded-md overflow-hidden h-48 flex items-center justify-center">
              <img
                src={activeImage.url || "/placeholder.svg"}
                alt="Vista previa"
                className="max-h-full max-w-full object-contain"
              />
            </div>

            {/* Detalles */}
            <div className="col-span-2 space-y-4">
              <h3 className="text-xl font-bold text-amber-500">
                {activeScene.title || `Escena ${activeSceneIndex + 1}`} - Toma {activeImageIndex + 1}
              </h3>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#2A2A2A] p-2 rounded-md">
                    <h4 className="text-sm font-medium text-gray-400">Cámara</h4>
                    <p className="text-sm">{activeImage.cameraSettings?.model || "No especificado"}</p>
                  </div>

                  <div className="bg-[#2A2A2A] p-2 rounded-md">
                    <h4 className="text-sm font-medium text-gray-400">Lente</h4>
                    <p className="text-sm">{activeImage.cameraSettings?.lens || "No especificado"}</p>
                  </div>

                  <div className="bg-[#2A2A2A] p-2 rounded-md">
                    <h4 className="text-sm font-medium text-gray-400">Distancia focal</h4>
                    <p className="text-sm">{activeImage.cameraSettings?.focalLength || "No especificado"}</p>
                  </div>

                  <div className="bg-[#2A2A2A] p-2 rounded-md">
                    <h4 className="text-sm font-medium text-gray-400">Apertura</h4>
                    <p className="text-sm">{activeImage.cameraSettings?.aperture || "No especificado"}</p>
                  </div>

                  <div className="bg-[#2A2A2A] p-2 rounded-md">
                    <h4 className="text-sm font-medium text-gray-400">Velocidad de obturación</h4>
                    <p className="text-sm">{activeImage.cameraSettings?.shutterSpeed || "No especificado"}</p>
                  </div>

                  <div className="bg-[#2A2A2A] p-2 rounded-md">
                    <h4 className="text-sm font-medium text-gray-400">ISO</h4>
                    <p className="text-sm">{activeImage.cameraSettings?.iso || "No especificado"}</p>
                  </div>
                </div>

                <div className="bg-[#2A2A2A] p-2 rounded-md">
                  <h4 className="text-sm font-medium text-gray-400">Duración</h4>
                  <p className="text-sm">{formatTime(activeImage.duration || 3)} segundos</p>
                </div>

                <div className="bg-[#2A2A2A] p-2 rounded-md">
                  <h4 className="text-sm font-medium text-gray-400">Descripción</h4>
                  <p className="text-sm">{activeImage.description || "Sin descripción"}</p>
                </div>

                {activeImage.cameraSettings?.notes && (
                  <div className="bg-[#2A2A2A] p-2 rounded-md">
                    <h4 className="text-sm font-medium text-gray-400">Notas de cámara</h4>
                    <p className="text-sm">{activeImage.cameraSettings.notes}</p>
                  </div>
                )}

                {activeScene.notes && (
                  <div className="bg-[#2A2A2A] p-2 rounded-md">
                    <h4 className="text-sm font-medium text-gray-400">Notas de escena</h4>
                    <p className="text-sm">{activeScene.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setShowDetailsModal(false)}
              className="bg-[#2A2A2A] text-white border-[#444444] hover:bg-[#333333]"
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default FullscreenViewer
