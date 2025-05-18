"use client"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { SortableImage } from "./SortableImage"
import type { StoryboardImage } from "./types"
import { ChevronDown } from "lucide-react"
import { useState } from "react"

interface FilmstripProps {
  images: StoryboardImage[]
  activeImageIndex: number
  onImageClick: (index: number) => void
  onReorderImages: (oldIndex: number, newIndex: number) => void
  onAddImage: () => void
}

export function Filmstrip({ images, activeImageIndex, onImageClick, onReorderImages, onAddImage }: FilmstripProps) {
  const [isOpen, setIsOpen] = useState(false)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex((img) => img.id === active.id)
      const newIndex = images.findIndex((img) => img.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        onReorderImages(oldIndex, newIndex)
      }
    }
  }

  const togglePanel = () => {
    setIsOpen(!isOpen)
  }

  return (
    <div className="bg-[#1E1E1E] border-t border-[#333333]">
      <button
        onClick={togglePanel}
        className="w-full flex justify-center items-center py-0 h-4 bg-[#252525] hover:bg-[#303030] cursor-pointer border-b border-[#333333] transition-colors duration-200"
      >
        <ChevronDown
          className={`h-3 w-3 text-white transition-transform duration-300 ease-in-out ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      {isOpen && (
        <div className="p-2">
          <div className="flex items-center gap-4 overflow-x-auto pb-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={images.map((img) => img.id)} strategy={horizontalListSortingStrategy}>
                {images.map((image, index) => (
                  <SortableImage
                    key={image.id}
                    id={image.id}
                    image={image}
                    index={index}
                    isActive={index === activeImageIndex}
                    onClick={() => onImageClick(index)}
                  />
                ))}
              </SortableContext>
            </DndContext>

            <Button
              variant="outline"
              size="icon"
              onClick={onAddImage}
              className="flex-shrink-0 w-24 h-24 border-dashed border-2 border-gray-500 bg-transparent hover:bg-gray-800"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Filmstrip
