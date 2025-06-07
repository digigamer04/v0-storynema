import type { CameraSettings, StoryboardScene, Shot } from "./types"

export const DEFAULT_CAMERA_SETTINGS: CameraSettings = {
  model: "",
  lens: "",
  focalLength: "",
  aperture: "",
  shutterSpeed: "",
  iso: "",
  notes: "",
}

export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
}

export function calculateCurrentShotStartTime(
  scenes: StoryboardScene[],
  currentSceneIndex: number,
  currentImageIndex: number,
): number {
  let startTime = 0

  // Add durations of all previous scenes
  for (let i = 0; i < currentSceneIndex; i++) {
    const scene = scenes[i]
    if (scene && scene.images) {
      for (const image of scene.images) {
        startTime += image.duration || 3 // Default duration if not set
      }
    }
  }

  // Add durations of images in current scene up to current image
  const currentScene = scenes[currentSceneIndex]
  if (currentScene && currentScene.images) {
    for (let i = 0; i < currentImageIndex; i++) {
      startTime += currentScene.images[i]?.duration || 3 // Default duration if not set
    }
  }

  return startTime
}

export function getAllShots(scenes: StoryboardScene[]): Shot[] {
  const shots: Shot[] = []
  let startTime = 0

  scenes.forEach((scene, sceneIndex) => {
    if (scene.images) {
      scene.images.forEach((image, imageIndex) => {
        const duration = image.duration || 3 // Default duration
        shots.push({
          sceneIndex,
          imageIndex,
          startTime,
          duration,
          image,
        })
        startTime += duration
      })
    }
  })

  return shots
}

export function findShotAtTime(shots: Shot[], time: number): Shot | null {
  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i]
    if (time >= shot.startTime && time < shot.startTime + shot.duration) {
      return shot
    }
  }
  return null
}

// Añade esta función de utilidad para la reproducción segura de audio
export const safePlayAudio = async (audioElement: HTMLAudioElement | null): Promise<boolean> => {
  if (!audioElement) return false

  try {
    // Verificar si el audio está listo para reproducirse
    if (audioElement.readyState < 2) {
      // HAVE_CURRENT_DATA
      console.log("Audio not ready yet, waiting...")
      return false
    }

    // Intentar reproducir
    await audioElement.play()
    return true
  } catch (error) {
    console.error("Error playing audio:", error)
    return false
  }
}

// Añade esta función para pausar de forma segura
export const safePauseAudio = (audioElement: HTMLAudioElement | null): boolean => {
  if (!audioElement) return false

  try {
    if (!audioElement.paused) {
      audioElement.pause()
    }
    return true
  } catch (error) {
    console.error("Error pausing audio:", error)
    return false
  }
}
