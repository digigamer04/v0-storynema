// Configuración global para el storyboard

export const STORYBOARD_CONFIG = {
  defaultDuration: 3, // Duración predeterminada para nuevas imágenes (segundos)
  maxDuration: 30, // Duración máxima permitida para una imagen (segundos)
  defaultImageUrl: "/blank-comic-panel.png", // Imagen predeterminada
  autoSaveInterval: 30000, // Intervalo de autoguardado (ms)
  thumbnailSize: {
    width: 150,
    height: 100,
  },
  supportedImageFormats: [".jpg", ".jpeg", ".png", ".webp", ".gif"],
  supportedVideoFormats: [".mp4", ".webm", ".mov"],
  supportedAudioFormats: [".mp3", ".wav", ".ogg", ".m4a"],
}

// Configuración de cámara predeterminada
export const DEFAULT_CAMERA_SETTINGS = {
  model: "Sony FX6",
  lens: "24-70mm f/2.8",
  focalLength: "50mm",
  aperture: "f/4.0",
  shutterSpeed: "1/50",
  iso: "800",
  notes: "",
}

// Configuración de visualización
export const DISPLAY_CONFIG = {
  timelineHeight: 100,
  filmstripHeight: 120,
  showTimecodes: true,
  showThumbnails: true,
  showDurations: true,
  darkMode: true,
}
