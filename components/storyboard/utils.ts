import type { CameraSettings } from "./types"

export const DEFAULT_CAMERA_SETTINGS: CameraSettings = {
  model: "",
  lens: "",
  focalLength: "",
  aperture: "",
  shutterSpeed: "",
  iso: "",
  notes: "",
}

// Las funciones relacionadas con tiempo y tomas fueron movidas a utilidades
// compartidas en `utils/`. Se mantienen aquí solo las configuraciones
// predeterminadas de cámara para evitar dependencias circulares.
