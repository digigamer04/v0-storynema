/**
 * Formatea un tiempo en segundos a un formato legible "mm:ss"
 * @param seconds - Tiempo en segundos a formatear
 * @returns String formateado como "mm:ss"
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) {
    return "00:00"
  }

  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)

  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

/**
 * Formatea un tiempo en segundos a un formato más detallado "mm:ss.ms"
 * @param seconds - Tiempo en segundos a formatear
 * @returns String formateado como "mm:ss.ms"
 */
export function formatTimeWithMilliseconds(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) {
    return "00:00.00"
  }

  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)

  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`
}

/**
 * Convierte un string de tiempo "mm:ss" a segundos
 * @param timeString - String en formato "mm:ss"
 * @returns Tiempo en segundos
 */
export function parseTimeString(timeString: string): number {
  const parts = timeString.split(":")
  if (parts.length !== 2) {
    return 0
  }

  const mins = Number.parseInt(parts[0], 10)
  const secs = Number.parseInt(parts[1], 10)

  if (isNaN(mins) || isNaN(secs)) {
    return 0
  }

  return mins * 60 + secs
}
