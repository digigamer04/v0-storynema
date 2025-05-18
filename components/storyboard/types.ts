export interface StoryboardEditorProps {
  projectId: string
  userId: string
  scenes?: any[]
  onScenesUpdate?: (scenes: StoryboardScene[]) => void
  activeSceneIndex?: number
  setActiveSceneIndex?: (index: number) => void
}

export interface StoryboardImage {
  id: string
  url: string
  description?: string
  duration?: number
  cameraSettings?: CameraSettings
}

export interface StoryboardScene {
  id: string
  title: string
  description?: string
  images: StoryboardImage[]
  order: number
  location?: string
  time?: string
  notes?: string
}

export interface CameraSettings {
  model?: string
  lens?: string
  focalLength?: string
  aperture?: string
  shutterSpeed?: string
  iso?: string
  notes?: string
}

export interface FavoriteCamera {
  id: string
  model: string
}

export interface FavoriteLens {
  id: string
  name: string
}

export interface AudioTrack {
  id: string
  url: string
  name: string
  duration?: number
}

export interface Shot {
  sceneIndex: number
  imageIndex: number
  startTime: number
  duration: number
  image: StoryboardImage
}
