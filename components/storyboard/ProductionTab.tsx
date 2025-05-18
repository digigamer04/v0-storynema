"use client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { StoryboardScene } from "./types"

interface ProductionTabProps {
  activeScene: StoryboardScene
  onUpdateSceneMetadata: (field: string, value: string) => void
}

export function ProductionTab({ activeScene, onUpdateSceneMetadata }: ProductionTabProps) {
  const handleChange = (field: string, value: string) => {
    onUpdateSceneMetadata(field, value)
  }

  return (
    <div className="space-y-4 p-1">
      <div className="space-y-2">
        <Label htmlFor="scene-title">Título de la escena</Label>
        <Input
          id="scene-title"
          value={activeScene.title || ""}
          onChange={(e) => handleChange("title", e.target.value)}
          placeholder="Título de la escena"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="scene-description">Descripción de la escena</Label>
        <Textarea
          id="scene-description"
          value={activeScene.description || ""}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Descripción de la escena..."
          className="min-h-[100px]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="scene-location">Localización</Label>
        <Input
          id="scene-location"
          value={activeScene.location || ""}
          onChange={(e) => handleChange("location", e.target.value)}
          placeholder="Localización de la escena"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="scene-time">Tiempo</Label>
        <Input
          id="scene-time"
          value={activeScene.time || ""}
          onChange={(e) => handleChange("time", e.target.value)}
          placeholder="ej. Día, Noche, Amanecer"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="scene-notes">Notas de producción</Label>
        <Textarea
          id="scene-notes"
          value={activeScene.notes || ""}
          onChange={(e) => handleChange("notes", e.target.value)}
          placeholder="Notas adicionales para la producción..."
          className="min-h-[100px]"
        />
      </div>
    </div>
  )
}

export default ProductionTab
