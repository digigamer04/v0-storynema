"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Upload, Trash2, Music } from "lucide-react"
import type { StoryboardScene, StoryboardImage, AudioTrack } from "./types"

interface DetailsTabProps {
  activeScene: StoryboardScene
  activeImage: StoryboardImage
  imageDescriptions: Record<string, string>
  showControls: boolean
  isUploading: boolean
  userId: string
  projectId: string
  audioTrack: AudioTrack | null
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
}

export function DetailsTab({
  activeScene,
  activeImage,
  imageDescriptions,
  showControls,
  isUploading,
  userId,
  projectId,
  audioTrack,
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
}: DetailsTabProps) {
  const [description, setDescription] = useState(imageDescriptions[activeImage?.id] || activeImage?.description || "")

  const [duration, setDuration] = useState(activeImage?.duration?.toString() || "3")

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value)
  }

  const handleDescriptionBlur = () => {
    onUpdateImageDescription(description)
  }

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setDuration(value)
    const numValue = Number.parseFloat(value)
    if (!isNaN(numValue) && numValue > 0) {
      onUpdateImageDuration(numValue)
    }
  }

  return (
    <div className="space-y-4 p-1">
      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          value={description}
          onChange={handleDescriptionChange}
          onBlur={handleDescriptionBlur}
          placeholder="Describe esta toma..."
          className="min-h-[100px]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="duration">Duración (segundos)</Label>
        <Input id="duration" type="number" min="0.1" step="0.1" value={duration} onChange={handleDurationChange} />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="show-controls">Mostrar controles</Label>
        <Switch id="show-controls" checked={showControls} onCheckedChange={onToggleShowControls} />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="auto-sync">Sincronizar audio con tomas</Label>
        <Switch id="auto-sync" checked={autoSyncAudioWithShots} onCheckedChange={onToggleAutoSync} />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Button variant="outline" size="sm" onClick={onUploadClick} disabled={isUploading}>
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? "Subiendo..." : "Subir imagen"}
          </Button>

          <Button variant="destructive" size="sm" onClick={onRemoveImage}>
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar imagen
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Audio</Label>
        <div className="flex items-center gap-2">
          <Input type="file" id="audio-upload" className="hidden" accept="audio/*" onChange={onAudioUpload} />
          <Button variant="outline" size="sm" onClick={() => document.getElementById("audio-upload")?.click()}>
            <Music className="h-4 w-4 mr-2" />
            {audioTrack ? "Cambiar audio" : "Añadir audio"}
          </Button>

          {audioTrack && (
            <Button variant="destructive" size="sm" onClick={onRemoveAudioTrack}>
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar audio
            </Button>
          )}
        </div>
        {audioTrack && <div className="text-sm text-gray-400 mt-1">{audioTrack.name}</div>}
      </div>
    </div>
  )
}

export default DetailsTab
