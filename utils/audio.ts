export const safePlayAudio = async (
  audioElement: HTMLAudioElement | null,
): Promise<boolean> => {
  if (!audioElement) return false

  try {
    if (audioElement.readyState < 2) {
      console.log("Audio not ready yet, waiting...")
      return false
    }

    await audioElement.play()
    return true
  } catch (error) {
    console.error("Error playing audio:", error)
    return false
  }
}

export const safePauseAudio = (
  audioElement: HTMLAudioElement | null,
): boolean => {
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
