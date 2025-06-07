"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { X, Play, Pause, SkipBack, SkipForward, Info, Camera, Clock, Film, Settings } from "lucide-react"
import type { StoryboardImage, StoryboardScene, CameraSettings } from "./types"
import { formatTime } from "./utils"

// Importar el sistema de gestión de descripciones
import { getDescriptionWithFallback, DescriptionType } from "@/lib/description-manager"

interface AmplifiedViewerProps {
  isOpen: boolean
  onClose: () => void
  activeScene: StoryboardScene
  activeImage: StoryboardImage
  activeSceneIndex: number
  activeImageIndex: number
  isPlaying: boolean
  projectId: string
  onTogglePlayPause: () => void
  onNextImage: () => void
  onPrevImage: () => void
  onGoToShot: (sceneIndex: number, imageIndex: number) => void
  scenes: StoryboardScene[]
}

export function AmplifiedViewer({
  isOpen,
  onClose,
  activeScene,
  activeImage,
  activeSceneIndex,
  activeImageIndex,
  isPlaying,
  projectId,
  onTogglePlayPause,
  onNextImage,
  onPrevImage,
  onGoToShot,
  scenes,
}: AmplifiedViewerProps) {
  const [showControls, setShowControls] = useState(true)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const mouseIdleTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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
        case "i":
          setShowDetailsModal((prev) => !prev)
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose, onTogglePlayPause, onNextImage, onPrevImage, showDetailsModal])

  if (!isOpen || !activeImage) return null

  // Renderizar el contenido multimedia (imagen o video)
  const renderMedia = () => {
    if (!activeImage || !activeImage.url) {
      console.error("No hay imagen activa o URL disponible", activeImage)
      return <div className="text-white text-center">No hay imagen disponible</div>
    }

    if (activeImage.url.endsWith(".mp4")) {
      return (
        <video
          ref={videoRef}
          src={activeImage.url}
          className="max-w-full max-h-full object-contain"
          controls={false}
          loop
        />
      )
    } else {
      return (
        <img
          src={activeImage.url || "/placeholder.svg"}
          alt={getImageDescription(activeImage) || "Imagen de storyboard"}
          className="max-w-full max-h-full object-contain"
          onError={(e) => {
            console.error("Error al cargar la imagen:", e)
            e.currentTarget.src = "/placeholder.svg"
          }}
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

  // Modificar la función para obtener la descripción
  const getImageDescription = (image: StoryboardImage) => {
    return getDescriptionWithFallback(projectId, DescriptionType.IMAGE, image.id, image.description || "")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md" onClick={onClose}>
      {/* Contenedor principal que evita que los clics internos cierren el visor */}
      <div
        ref={containerRef}
        className="relative bg-black rounded-lg shadow-2xl max-w-[95vw] max-h-[95vh] w-auto h-auto overflow-hidden"
        style={{ minWidth: "85vw", minHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
        onMouseMove={handleMouseMove}
      >
        {/* Área principal de visualización */}
        <div className="flex-grow relative h-full w-full" style={{ height: "calc(85vh - 120px)" }}>
          <div className="absolute inset-0 flex items-center justify-center bg-black">{renderMedia()}</div>

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
        <div
          className={`absolute bottom-0 left-0 right-0 bg-black/80 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}
        >
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

            {/* Mostrar la descripción de la imagen */}
            <div className="mt-2 text-sm text-gray-300 line-clamp-1">{getImageDescription(activeImage)}</div>
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
            </div>
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
                  <p className="text-sm">{getImageDescription(activeImage) || "Sin descripción"}</p>
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

export default AmplifiedViewer
