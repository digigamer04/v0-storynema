import type { StoryboardScene } from "@/components/storyboard/types"

// Función para guardar escenas del storyboard en localStorage
export function saveStoryboardScenes(projectId: string, scenes: StoryboardScene[]) {
  try {
    localStorage.setItem(`storyboard-scenes-${projectId}`, JSON.stringify(scenes))
    localStorage.setItem(`storyboard-last-save-${projectId}`, Date.now().toString())
    return true
  } catch (error) {
    console.error("Error saving storyboard scenes:", error)
    return false
  }
}

// Función para cargar escenas del storyboard desde localStorage
export function loadStoryboardScenes(projectId: string): StoryboardScene[] | null {
  try {
    const savedScenes = localStorage.getItem(`storyboard-scenes-${projectId}`)
    if (savedScenes) {
      return JSON.parse(savedScenes)
    }
    return null
  } catch (error) {
    console.error("Error loading storyboard scenes:", error)
    return null
  }
}

// Función para convertir escenas de script a formato de storyboard
export function convertScriptScenesToStoryboard(scriptScenes: any[]): StoryboardScene[] {
  return scriptScenes.map((scene, index) => ({
    id: scene.id || `scene-${index}`,
    title: scene.title || `Escena ${index + 1}`,
    description: scene.content || "",
    images: scene.images || [],
    order: index,
    location: scene.location || "",
    time: scene.time || "",
    notes: "",
  }))
}

// Función para sincronizar cambios entre storyboard y script
export function syncStoryboardToScript(storyboardScenes: StoryboardScene[], scriptScenes: any[]) {
  return scriptScenes.map((scriptScene) => {
    const storyboardScene = storyboardScenes.find((s) => s.id === scriptScene.id)
    if (storyboardScene) {
      return {
        ...scriptScene,
        title: storyboardScene.title,
        // Solo actualizar content si description tiene contenido
        content: storyboardScene.description ? storyboardScene.description : scriptScene.content,
        images: storyboardScene.images,
      }
    }
    return scriptScene
  })
}

// Función para calcular la duración total del storyboard
export function calculateTotalDuration(scenes: StoryboardScene[]): number {
  return scenes.reduce((total, scene) => {
    return (
      total +
      scene.images.reduce((sceneTotal, image) => {
        return sceneTotal + (image.duration || 3)
      }, 0)
    )
  }, 0)
}

// Función para formatear tiempo en formato mm:ss
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
}

// Función para formatear tiempo en formato SMPTE (hh:mm:ss:ff)
export function formatSMPTE(seconds: number, frameRate = 24): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const frames = Math.floor((seconds % 1) * frameRate)

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}:${frames.toString().padStart(2, "0")}`
}
