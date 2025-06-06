"use client"

import { useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause, SkipBack, SkipForward } from "lucide-react"
import type { StoryboardImage } from "./types"

interface StoryboardViewerProps {
  activeImage: StoryboardImage
  isPlaying: boolean
  showControls: boolean
  activeSceneImages: StoryboardImage[]
  activeImageIndex: number
  onTogglePlayPause: () => void
  onNextImage: () => void
  onPrevImage: () => void
  onGoToShotByIndex: (index: number) => void
  onUpdateImageDuration: (duration: number) => void
}

export function StoryboardViewer({
  activeImage,
  isPlaying,
  showControls,
  activeSceneImages,
  activeImageIndex,
  onTogglePlayPause,
  onNextImage,
  onPrevImage,
  onGoToShotByIndex,
  onUpdateImageDuration,
}: StoryboardViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  const playVideo = async (videoElement: HTMLVideoElement) => {
    try {
      if (videoElement && videoElement.paused) {
        await videoElement.play()
      }
    } catch (error) {
      console.error("Error playing video:", error)
      // Manejar el error apropiadamente
    }
  }

  useEffect(() => {
    if (videoRef.current && activeImage.url.endsWith(".mp4")) {
      if (isPlaying) {
        playVideo(videoRef.current)
      } else {
        videoRef.current.pause()
      }
    }
  }, [isPlaying, activeImage.url])

  const handleVideoMetadata = () => {
    if (videoRef.current && videoRef.current.duration) {
      onUpdateImageDuration(videoRef.current.duration)
    }
  }

  const renderMedia = () => {
    if (activeImage.url.endsWith(".mp4")) {
      return (
        <video
          ref={videoRef}
          src={activeImage.url}
          className="w-full h-full object-contain"
          onLoadedMetadata={handleVideoMetadata}
          controls={false}
          loop
        />
      )
    } else {
      return (
        <img
          src={activeImage.url || "/placeholder.svg"}
          alt={activeImage.description || "Storyboard image"}
          className="w-full h-full object-contain"
        />
      )
    }
  }

  return (
    <div className="relative w-full" style={{ height: "60vh" }}>
      <div className="absolute inset-0 flex items-start justify-center bg-black pt-2">{renderMedia()}</div>

      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex justify-center items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onPrevImage}
              disabled={activeImageIndex === 0}
              className="text-white hover:bg-white/20"
            >
              <SkipBack className="h-6 w-6" />
            </Button>

            <Button variant="ghost" size="icon" onClick={onTogglePlayPause} className="text-white hover:bg-white/20">
              {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onNextImage}
              disabled={activeImageIndex === activeSceneImages.length - 1}
              className="text-white hover:bg-white/20"
            >
              <SkipForward className="h-6 w-6" />
            </Button>
          </div>

          <div className="flex justify-center mt-2">
            {activeSceneImages.map((_, index) => (
              <button
                key={index}
                onClick={() => onGoToShotByIndex(index)}
                className={`w-2 h-2 mx-1 rounded-full ${index === activeImageIndex ? "bg-white" : "bg-white/40"}`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default StoryboardViewer
