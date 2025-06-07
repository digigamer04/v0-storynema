"use client"
import type React from "react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Volume2, VolumeX, X } from "lucide-react"
import type { AudioTrack } from "./types"

interface AudioControlsProps {
  audioTrack: AudioTrack | null
  audioCurrentTime: number
  audioDuration: number
  audioVolume: number
  audioMuted: boolean
  audioError: boolean
  formatTime: (seconds: number) => string
  onToggleMute: () => void
  onVolumeChange: (volume: number) => void
  onRemoveAudio: () => void
  onSeek: (e: React.MouseEvent<HTMLDivElement>) => void
}

export default function AudioControls({
  audioTrack,
  audioCurrentTime,
  audioDuration,
  audioVolume,
  audioMuted,
  audioError,
  formatTime,
  onToggleMute,
  onVolumeChange,
  onRemoveAudio,
  onSeek,
}: AudioControlsProps) {
  if (!audioTrack || audioError) return null
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-400">
          {formatTime(audioCurrentTime)} / {formatTime(audioDuration)}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleMute}
            className="h-8 w-8 text-gray-400 hover:text-white"
          >
            {audioMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <div className="w-24">
            <Slider
              value={[audioVolume]}
              min={0}
              max={1}
              step={0.01}
              onValueChange={(values) => onVolumeChange(values[0])}
              disabled={audioMuted}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemoveAudio}
            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-red-500/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div
        className="relative h-2 bg-gray-700 rounded-full cursor-pointer overflow-hidden"
        onClick={onSeek}
      >
        <div
          className="absolute h-full bg-blue-500"
          style={{ width: `${(audioCurrentTime / audioDuration) * 100}%` }}
        />
      </div>
    </div>
  )
}
