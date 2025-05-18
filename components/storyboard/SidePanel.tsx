"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"

import type React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { CameraTab } from "./CameraTab"
import { ProductionTab } from "./ProductionTab"
import type {
  StoryboardScene,
  StoryboardImage,
  AudioTrack,
  CameraSettings,
  FavoriteCamera,
  FavoriteLens,
} from "./types"
// Asegúrate de que estos imports existen al inicio del archivo
import { Trash, Upload, X, ImageIcon, Mic, Wand2, Clock, ChevronLeft, ChevronRight } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import MediaManager from "@/components/media-manager"

interface SidePanelProps {
  activeScene: StoryboardScene
  activeImage: StoryboardImage
  imageDescriptions: Record<string, string>
  showControls: boolean
  isUploading: boolean
  userId: string
  projectId: string
  audioTrack: AudioTrack | null
  favoriteCameras: FavoriteCamera[]
  favoriteLenses: FavoriteLens[]
  autoSyncAudioWithShots: boolean
  onUpdateImageDescription: (description: string) => void
  onUpdateImageDuration: (duration: number) => void
  onRemoveImage: () => void
  onUploadClick: () => void
  onMediaSelect: (url: string) => void
  onAudioUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveAudioTrack: () => void
  onToggleShowControls: (show: boolean) => void
  onToggleAutoSync: (autoSync: boolean) => void
  onUpdateCameraSetting: (setting: keyof CameraSettings, value: string) => void
  onAddFavoriteCamera: (camera: string) => void
  onRemoveFavoriteCamera: (id: string) => void
  onAddFavoriteLens: (lens: string) => void
  onRemoveFavoriteLens: (id: string) => void
  onUpdateSceneMetadata: (field: string, value: string) => void
  formatTime?: (seconds: number) => string // Añadir esta propiedad opcional
  onUpdateSceneDescription?: (description: string) => void
}

export function SidePanel({
  activeScene,
  activeImage,
  imageDescriptions,
  showControls,
  isUploading,
  userId,
  projectId,
  audioTrack,
  favoriteCameras,
  favoriteLenses,
  autoSyncAudioWithShots,
  onUpdateImageDescription,
  onUpdateImageDuration,
  onRemoveImage,
  onUploadClick,
  onMediaSelect,
  onAudioUpload,
  onRemoveAudioTrack,
  onToggleShowControls,
  onToggleAutoSync,
  onUpdateCameraSetting,
  onAddFavoriteCamera,
  onRemoveFavoriteCamera,
  onAddFavoriteLens,
  onRemoveFavoriteLens,
  onUpdateSceneMetadata,
  onUpdateSceneDescription,
  formatTime,
}: SidePanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="flex h-full relative">
      <div
        className={`transition-all duration-300 ease-in-out flex flex-col h-full ${
          isExpanded ? "w-96 opacity-100" : "w-0 opacity-0 overflow-hidden"
        }`}
      >
        <Card className="h-full shadow-lg">
          <CardContent className="p-0 h-full">
            <Tabs defaultValue="details" className="h-full flex flex-col">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="details">Detalles</TabsTrigger>
                <TabsTrigger value="camera">Cámara</TabsTrigger>
                <TabsTrigger value="production">Producción</TabsTrigger>
              </TabsList>

              <style jsx global>{`
                .tabs-content-scroll::-webkit-scrollbar {
                  width: 0px;
                  background: transparent;
                }
                
                .tabs-content-scroll {
                  scrollbar-width: none;
                  -ms-overflow-style: none;
                }
              `}</style>

              <TabsContent value="details" className="p-4 overflow-y-auto flex-grow tabs-content-scroll">
                <div className="space-y-4">
                  {/* Información de la escena */}
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
                    <div className="h-20 bg-[#2A2A2A] border border-[#444444] text-gray-200 rounded-md p-2 overflow-auto text-sm">
                      {activeScene?.description || (
                        <span className="text-gray-500 italic">No hay descripción disponible</span>
                      )}
                    </div>
                  </div>

                  {/* Descripción de la imagen */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-gray-300">Descripción de la imagen</Label>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={onRemoveImage}
                        disabled={activeScene.images.length <= 1}
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      id="image-description"
                      value={activeImage ? imageDescriptions[activeImage.id] || activeImage.description || "" : ""}
                      onChange={(e) => onUpdateImageDescription(e.target.value)}
                      placeholder="Añade una descripción breve"
                      className="h-20 bg-[#2A2A2A] border-[#444444] text-gray-200"
                    />
                  </div>

                  {/* Duración de la imagen */}
                  <div>
                    <Label htmlFor="image-duration" className="flex items-center gap-2 text-gray-300">
                      <Clock className="h-4 w-4" />
                      Duración de la imagen (segundos)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        id="image-duration"
                        min={1}
                        max={10}
                        step={1}
                        value={[activeImage?.duration || 3]}
                        onValueChange={(value) => onUpdateImageDuration(value[0])}
                        className="flex-1"
                      />
                      <span className="w-8 text-center text-gray-300">{activeImage?.duration || 3}s</span>
                    </div>
                  </div>

                  {/* Mostrar controles de reproducción */}
                  <div className="flex items-center space-x-2">
                    <Switch id="show-controls" checked={showControls} onCheckedChange={onToggleShowControls} />
                    <Label htmlFor="show-controls" className="text-gray-300">
                      Mostrar controles de reproducción
                    </Label>
                  </div>

                  {/* Selector de medios */}
                  <div className="flex flex-col gap-2">
                    <MediaManager
                      userId={userId}
                      projectId={projectId}
                      onSelectMedia={onMediaSelect}
                      onMultipleSelect={(urls) => {
                        console.log("Múltiples archivos seleccionados:", urls)
                      }}
                      buttonLabel="Seleccionar imagen"
                      buttonVariant="outline"
                      buttonClassName="w-full flex items-center gap-2 bg-[#2A2A2A] border-[#444444] text-gray-200 hover:bg-[#3A3A3A]"
                      buttonIcon={<ImageIcon className="h-4 w-4" />}
                    />

                    <Button
                      variant="outline"
                      className="w-full flex items-center gap-2 bg-[#2A2A2A] border-[#444444] text-gray-200 hover:bg-[#3A3A3A]"
                    >
                      <Wand2 className="h-4 w-4" />
                      Generar con IA
                    </Button>
                  </div>

                  {/* Pista de audio master */}
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
                              onClick={onRemoveAudioTrack}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            Duración:{" "}
                            {formatTime
                              ? formatTime(audioTrack.duration)
                              : `${Math.floor(audioTrack.duration / 60)}:${Math.floor(audioTrack.duration % 60)
                                  .toString()
                                  .padStart(2, "0")}`}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <input
                            type="file"
                            id="audio-upload"
                            accept="audio/*"
                            className="hidden"
                            onChange={onAudioUpload}
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

                  {/* Sincronización automática de audio con tomas */}
                  <div className="flex items-center space-x-2 mt-4">
                    <Switch id="auto-sync-audio" checked={autoSyncAudioWithShots} onCheckedChange={onToggleAutoSync} />
                    <Label htmlFor="auto-sync-audio" className="text-gray-300">
                      Sincronización automática de audio con tomas
                    </Label>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 ml-7">
                    Cuando está activado, al seleccionar una toma el audio se posicionará automáticamente en el tiempo
                    correspondiente
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="camera" className="p-4 overflow-y-auto flex-grow tabs-content-scroll">
                <CameraTab
                  activeImage={activeImage}
                  favoriteCameras={favoriteCameras}
                  favoriteLenses={favoriteLenses}
                  onUpdateCameraSetting={onUpdateCameraSetting}
                  onAddFavoriteCamera={onAddFavoriteCamera}
                  onRemoveFavoriteCamera={onRemoveFavoriteCamera}
                  onAddFavoriteLens={onAddFavoriteLens}
                  onRemoveFavoriteLens={onRemoveFavoriteLens}
                />
              </TabsContent>

              <TabsContent value="production" className="p-4 overflow-y-auto flex-grow tabs-content-scroll">
                <ProductionTab activeScene={activeScene} onUpdateSceneMetadata={onUpdateSceneMetadata} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Botón para expandir/colapsar */}
      <Button
        variant="secondary"
        size="sm"
        className="fixed right-0 top-1/2 -translate-y-1/2 h-24 w-4 rounded-l-sm rounded-r-none flex items-center justify-center shadow-md bg-gray-800 hover:bg-gray-700 z-50 p-0"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>
    </div>
  )
}

export default SidePanel
