import type { StoryboardScene, Shot } from "@/components/storyboard/types"

export function calculateCurrentShotStartTime(
  scenes: StoryboardScene[],
  currentSceneIndex: number,
  currentImageIndex: number,
): number {
  let startTime = 0

  for (let i = 0; i < currentSceneIndex; i++) {
    const scene = scenes[i]
    if (scene && scene.images) {
      for (const image of scene.images) {
        startTime += image.duration || 3
      }
    }
  }

  const currentScene = scenes[currentSceneIndex]
  if (currentScene && currentScene.images) {
    for (let i = 0; i < currentImageIndex; i++) {
      startTime += currentScene.images[i]?.duration || 3
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
        const duration = image.duration || 3
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
  for (const shot of shots) {
    if (time >= shot.startTime && time < shot.startTime + shot.duration) {
      return shot
    }
  }
  return null
}
