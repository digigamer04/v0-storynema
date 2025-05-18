"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, X } from "lucide-react"
import type { StoryboardImage, CameraSettings, FavoriteCamera, FavoriteLens } from "./types"
import { DEFAULT_CAMERA_SETTINGS } from "./utils"

interface CameraTabProps {
  activeImage: StoryboardImage
  favoriteCameras: FavoriteCamera[]
  favoriteLenses: FavoriteLens[]
  onUpdateCameraSetting: (setting: keyof CameraSettings, value: string) => void
  onAddFavoriteCamera: (camera: string) => void
  onRemoveFavoriteCamera: (id: string) => void
  onAddFavoriteLens: (lens: string) => void
  onRemoveFavoriteLens: (id: string) => void
}

export function CameraTab({
  activeImage,
  favoriteCameras,
  favoriteLenses,
  onUpdateCameraSetting,
  onAddFavoriteCamera,
  onRemoveFavoriteCamera,
  onAddFavoriteLens,
  onRemoveFavoriteLens,
}: CameraTabProps) {
  const cameraSettings = activeImage?.cameraSettings || DEFAULT_CAMERA_SETTINGS

  const [tempCameraModel, setTempCameraModel] = useState("")
  const [tempLens, setTempLens] = useState("")
  const [editingCameraModel, setEditingCameraModel] = useState(false)
  const [editingLens, setEditingLens] = useState(false)

  const handleSettingChange = (setting: keyof CameraSettings, value: string) => {
    onUpdateCameraSetting(setting, value)
  }

  const handleAddFavoriteCamera = () => {
    if (tempCameraModel.trim()) {
      onAddFavoriteCamera(tempCameraModel.trim())
      setTempCameraModel("")
      setEditingCameraModel(false)
    }
  }

  const handleAddFavoriteLens = () => {
    if (tempLens.trim()) {
      onAddFavoriteLens(tempLens.trim())
      setTempLens("")
      setEditingLens(false)
    }
  }

  return (
    <div className="space-y-4 p-1">
      <div className="space-y-2">
        <Label htmlFor="camera-model">Cámara</Label>
        <div className="flex gap-2">
          <Input
            id="camera-model"
            value={cameraSettings.model || ""}
            onChange={(e) => handleSettingChange("model", e.target.value)}
            placeholder="Modelo de cámara"
          />
          <Button variant="outline" size="icon" onClick={() => setEditingCameraModel(!editingCameraModel)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {editingCameraModel && (
        <div className="space-y-2 pl-4 border-l-2 border-gray-300">
          <Label htmlFor="new-camera">Añadir cámara a favoritos</Label>
          <div className="flex gap-2">
            <Input
              id="new-camera"
              value={tempCameraModel}
              onChange={(e) => setTempCameraModel(e.target.value)}
              placeholder="Nuevo modelo de cámara"
            />
            <Button variant="outline" size="sm" onClick={handleAddFavoriteCamera}>
              Añadir
            </Button>
          </div>
        </div>
      )}

      {favoriteCameras.length > 0 && (
        <div className="space-y-2">
          <Label>Cámaras favoritas</Label>
          <div className="flex flex-wrap gap-2">
            {favoriteCameras.map((camera) => (
              <Button
                key={camera.id}
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
                onClick={() => handleSettingChange("model", camera.model)}
              >
                {camera.model}
                <X
                  className="h-3 w-3 ml-1 hover:text-red-500"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemoveFavoriteCamera(camera.id)
                  }}
                />
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="lens">Lente</Label>
        <div className="flex gap-2">
          <Input
            id="lens"
            value={cameraSettings.lens || ""}
            onChange={(e) => handleSettingChange("lens", e.target.value)}
            placeholder="Modelo de lente"
          />
          <Button variant="outline" size="icon" onClick={() => setEditingLens(!editingLens)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {editingLens && (
        <div className="space-y-2 pl-4 border-l-2 border-gray-300">
          <Label htmlFor="new-lens">Añadir lente a favoritos</Label>
          <div className="flex gap-2">
            <Input
              id="new-lens"
              value={tempLens}
              onChange={(e) => setTempLens(e.target.value)}
              placeholder="Nuevo modelo de lente"
            />
            <Button variant="outline" size="sm" onClick={handleAddFavoriteLens}>
              Añadir
            </Button>
          </div>
        </div>
      )}

      {favoriteLenses.length > 0 && (
        <div className="space-y-2">
          <Label>Lentes favoritos</Label>
          <div className="flex flex-wrap gap-2">
            {favoriteLenses.map((lens) => (
              <Button
                key={lens.id}
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
                onClick={() => handleSettingChange("lens", lens.name)}
              >
                {lens.name}
                <X
                  className="h-3 w-3 ml-1 hover:text-red-500"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemoveFavoriteLens(lens.id)
                  }}
                />
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="focal-length">Distancia focal</Label>
        <Input
          id="focal-length"
          value={cameraSettings.focalLength || ""}
          onChange={(e) => handleSettingChange("focalLength", e.target.value)}
          placeholder="ej. 50mm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="aperture">Apertura</Label>
        <Input
          id="aperture"
          value={cameraSettings.aperture || ""}
          onChange={(e) => handleSettingChange("aperture", e.target.value)}
          placeholder="ej. f/2.8"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="shutter-speed">Velocidad de obturación</Label>
        <Input
          id="shutter-speed"
          value={cameraSettings.shutterSpeed || ""}
          onChange={(e) => handleSettingChange("shutterSpeed", e.target.value)}
          placeholder="ej. 1/125"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="iso">ISO</Label>
        <Input
          id="iso"
          value={cameraSettings.iso || ""}
          onChange={(e) => handleSettingChange("iso", e.target.value)}
          placeholder="ej. 400"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="camera-notes">Notas técnicas</Label>
        <Textarea
          id="camera-notes"
          value={cameraSettings.notes || ""}
          onChange={(e) => handleSettingChange("notes", e.target.value)}
          placeholder="Notas adicionales sobre la configuración de la cámara..."
        />
      </div>
    </div>
  )
}

export default CameraTab
