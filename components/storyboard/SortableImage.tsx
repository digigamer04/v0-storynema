"use client"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { StoryboardImage } from "./types"

interface SortableImageProps {
  image: StoryboardImage
  index: number
  id: string
  isActive: boolean
  onClick: () => void
}

export function SortableImage({ image, index, id, isActive, onClick }: SortableImageProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative flex-shrink-0 w-24 h-24 rounded overflow-hidden cursor-pointer border-2 ${
        isActive ? "border-primary" : "border-transparent"
      }`}
      onClick={onClick}
    >
      {image.url.endsWith(".mp4") ? (
        <video src={image.url} className="w-full h-full object-cover" />
      ) : (
        <img
          src={image.url || "/placeholder.svg"}
          alt={image.description || `Image ${index + 1}`}
          className="w-full h-full object-cover"
        />
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-1">
        {index + 1}
      </div>
    </div>
  )
}

export default SortableImage
