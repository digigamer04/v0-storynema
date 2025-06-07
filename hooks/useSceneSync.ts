"use client"
import { useCallback } from "react"
import type { StoryboardScene } from "@/components/storyboard/types"
import { calculateCurrentShotStartTime } from "@/utils/storyboard"

export function useSceneSync(
  scenes: StoryboardScene[],
  activeSceneIndex: number,
  activeImageIndex: number,
) {
  const getCurrentStartTime = useCallback(() => {
    return calculateCurrentShotStartTime(
      scenes,
      activeSceneIndex,
      activeImageIndex,
    )
  }, [scenes, activeSceneIndex, activeImageIndex])

  return { getCurrentStartTime }
}
