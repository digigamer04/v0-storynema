"use client"
import type React from "react"

type Scene = { id: string; title: string }

interface SceneListProps {
  scenes: Scene[]
  activeSceneId: string
  onSelect: (id: string) => void
}

export default function SceneList({ scenes, activeSceneId, onSelect }: SceneListProps) {
  return (
    <div className="space-y-2">
      {scenes.map((scene) => (
        <button
          key={scene.id}
          onClick={() => onSelect(scene.id)}
          className={`block w-full text-left px-2 py-1 rounded ${
            scene.id === activeSceneId ? "bg-primary/20" : "hover:bg-gray-700"
          }`}
        >
          {scene.title}
        </button>
      ))}
    </div>
  )
}
