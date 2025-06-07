/**
 * Sistema de grid de tiempo para cálculos precisos en la línea de tiempo
 * Proporciona una precisión de 1/120 segundos entre puntos
 */

// Constantes de configuración
export const GRID_PRECISION = 120 // 120 puntos por segundo (1/120 seg entre puntos)
export const FRAME_RATES = {
  FILM: 24,
  PAL: 25,
  NTSC: 30,
  HD: 60,
}

// Configuración de magnetismo
export const MAGNETISM_STRENGTHS = {
  NONE: 0,
  WEAK: 0.01, // 1% de atracción (muy sutil)
  MEDIUM: 0.05, // 5% de atracción
  STRONG: 0.1, // 10% de atracción
  VERY_STRONG: 0.2, // 20% de atracción
}

// Tipos de puntos de atracción magnética
export const MAGNETIC_POINTS = {
  FRAME: "frame", // Atraer a los frames (24, 25, 30 fps)
  SECOND: "second", // Atraer a los segundos
  HALF_SECOND: "half_second", // Atraer a los medios segundos
  QUARTER_SECOND: "quarter_second", // Atraer a los cuartos de segundo
  TENTH_SECOND: "tenth_second", // Atraer a los décimos de segundo
  CUSTOM: "custom", // Atraer a puntos personalizados
}

/**
 * Convierte tiempo en segundos a puntos en la grid
 * @param seconds Tiempo en segundos (puede incluir decimales)
 * @returns Número de puntos en la grid (entero)
 */
export function secondsToGridPoints(seconds: number): number {
  return Math.round(seconds * GRID_PRECISION)
}

/**
 * Convierte puntos de la grid a tiempo en segundos
 * @param points Número de puntos en la grid
 * @returns Tiempo en segundos (con precisión decimal)
 */
export function gridPointsToSeconds(points: number): number {
  return points / GRID_PRECISION
}

/**
 * Convierte frames a puntos en la grid
 * @param frames Número de frames
 * @param frameRate Velocidad de frames (por defecto 24fps)
 * @returns Número de puntos en la grid
 */
export function framesToGridPoints(frames: number, frameRate = FRAME_RATES.FILM): number {
  const seconds = frames / frameRate
  return secondsToGridPoints(seconds)
}

/**
 * Convierte puntos de la grid a frames
 * @param points Número de puntos en la grid
 * @param frameRate Velocidad de frames (por defecto 24fps)
 * @returns Número de frames (redondeado al frame más cercano)
 */
export function gridPointsToFrames(points: number, frameRate = FRAME_RATES.FILM): number {
  const seconds = gridPointsToSeconds(points)
  return Math.round(seconds * frameRate)
}

/**
 * Convierte tiempo en formato SMPTE (HH:MM:SS:FF) a puntos en la grid
 * @param smpte Tiempo en formato SMPTE
 * @param frameRate Velocidad de frames (por defecto 24fps)
 * @returns Número de puntos en la grid
 */
export function smpteToGridPoints(smpte: string, frameRate = FRAME_RATES.FILM): number {
  const parts = smpte.split(":")
  if (parts.length !== 4) {
    throw new Error("Formato SMPTE inválido. Debe ser HH:MM:SS:FF")
  }

  const hours = Number.parseInt(parts[0], 10)
  const minutes = Number.parseInt(parts[1], 10)
  const seconds = Number.parseInt(parts[2], 10)
  const frames = Number.parseInt(parts[3], 10)

  const totalSeconds = hours * 3600 + minutes * 60 + seconds + frames / frameRate
  return secondsToGridPoints(totalSeconds)
}

/**
 * Convierte puntos de la grid a tiempo en formato SMPTE (HH:MM:SS:FF)
 * @param points Número de puntos en la grid
 * @param frameRate Velocidad de frames (por defecto 24fps)
 * @returns Tiempo en formato SMPTE
 */
export function gridPointsToSmpte(points: number, frameRate = FRAME_RATES.FILM): string {
  const totalSeconds = gridPointsToSeconds(points)

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)
  const frames = Math.round((totalSeconds - Math.floor(totalSeconds)) * frameRate)

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}:${frames.toString().padStart(2, "0")}`
}

/**
 * Calcula la duración en puntos de grid entre dos tiempos
 * @param startSeconds Tiempo de inicio en segundos
 * @param endSeconds Tiempo de fin en segundos
 * @returns Duración en puntos de grid
 */
export function calculateDurationInGridPoints(startSeconds: number, endSeconds: number): number {
  const startPoints = secondsToGridPoints(startSeconds)
  const endPoints = secondsToGridPoints(endSeconds)
  return endPoints - startPoints
}

/**
 * Ajusta un tiempo a la grid más cercana
 * @param seconds Tiempo en segundos
 * @returns Tiempo ajustado a la grid más cercana
 */
export function snapToGrid(seconds: number): number {
  const points = secondsToGridPoints(seconds)
  return gridPointsToSeconds(points)
}

/**
 * Calcula la posición porcentual en una línea de tiempo basada en la grid
 * @param currentGridPoint Punto actual en la grid
 * @param totalGridPoints Total de puntos en la grid
 * @returns Porcentaje (0-100)
 */
export function calculateGridPercentage(currentGridPoint: number, totalGridPoints: number): number {
  if (totalGridPoints === 0) return 0
  return (currentGridPoint / totalGridPoints) * 100
}

/**
 * Convierte un porcentaje de la línea de tiempo a un punto en la grid
 * @param percentage Porcentaje (0-100)
 * @param totalGridPoints Total de puntos en la grid
 * @returns Punto en la grid
 */
export function percentageToGridPoint(percentage: number, totalGridPoints: number): number {
  return Math.round((percentage / 100) * totalGridPoints)
}

/**
 * Sincroniza dos tiempos diferentes basados en la grid
 * Útil para sincronizar audio con video
 * @param sourceTime Tiempo fuente en segundos
 * @param sourceDuration Duración total de la fuente en segundos
 * @param targetDuration Duración total del objetivo en segundos
 * @returns Tiempo sincronizado para el objetivo en segundos
 */
export function syncTimeBasedOnGrid(sourceTime: number, sourceDuration: number, targetDuration: number): number {
  if (sourceDuration === 0 || targetDuration === 0) return 0

  const sourcePoints = secondsToGridPoints(sourceTime)
  const sourceTotalPoints = secondsToGridPoints(sourceDuration)
  const percentage = (sourcePoints / sourceTotalPoints) * 100

  const targetTotalPoints = secondsToGridPoints(targetDuration)
  const targetPoints = percentageToGridPoint(percentage, targetTotalPoints)

  return gridPointsToSeconds(targetPoints)
}

/**
 * Genera puntos magnéticos basados en el tipo de punto y la duración total
 * @param magneticPointType Tipo de punto magnético
 * @param totalDuration Duración total en segundos
 * @param frameRate Velocidad de frames (para puntos de tipo FRAME)
 * @param customInterval Intervalo personalizado en segundos (para puntos de tipo CUSTOM)
 * @returns Array de puntos magnéticos en segundos
 */
export function generateMagneticPoints(
  magneticPointType: string,
  totalDuration: number,
  frameRate = FRAME_RATES.FILM,
  customInterval?: number,
): number[] {
  const points: number[] = []

  switch (magneticPointType) {
    case MAGNETIC_POINTS.FRAME:
      // Generar puntos para cada frame
      const frameDuration = 1 / frameRate
      for (let time = 0; time <= totalDuration; time += frameDuration) {
        points.push(snapToGrid(time))
      }
      break

    case MAGNETIC_POINTS.SECOND:
      // Generar puntos para cada segundo
      for (let time = 0; time <= totalDuration; time += 1) {
        points.push(time)
      }
      break

    case MAGNETIC_POINTS.HALF_SECOND:
      // Generar puntos para cada medio segundo
      for (let time = 0; time <= totalDuration; time += 0.5) {
        points.push(time)
      }
      break

    case MAGNETIC_POINTS.QUARTER_SECOND:
      // Generar puntos para cada cuarto de segundo
      for (let time = 0; time <= totalDuration; time += 0.25) {
        points.push(time)
      }
      break

    case MAGNETIC_POINTS.TENTH_SECOND:
      // Generar puntos para cada décimo de segundo
      for (let time = 0; time <= totalDuration; time += 0.1) {
        points.push(snapToGrid(time))
      }
      break

    case MAGNETIC_POINTS.CUSTOM:
      // Generar puntos con intervalo personalizado
      if (customInterval && customInterval > 0) {
        for (let time = 0; time <= totalDuration; time += customInterval) {
          points.push(snapToGrid(time))
        }
      }
      break

    default:
      // Por defecto, no generar puntos magnéticos
      break
  }

  return points
}

/**
 * Aplica magnetismo a un tiempo dado, atrayéndolo al punto magnético más cercano
 * @param time Tiempo en segundos
 * @param magneticPoints Array de puntos magnéticos en segundos
 * @param strength Fuerza de atracción (0-1)
 * @param threshold Umbral de distancia para aplicar magnetismo (en segundos)
 * @returns Tiempo ajustado con magnetismo
 */
export function applyMagnetism(
  time: number,
  magneticPoints: number[],
  strength = MAGNETISM_STRENGTHS.MEDIUM,
  threshold = 0.1,
): number {
  if (magneticPoints.length === 0 || strength === 0) {
    return time
  }

  // Encontrar el punto magnético más cercano
  let closestPoint = magneticPoints[0]
  let minDistance = Math.abs(time - closestPoint)

  for (const point of magneticPoints) {
    const distance = Math.abs(time - point)
    if (distance < minDistance) {
      minDistance = distance
      closestPoint = point
    }
  }

  // Aplicar magnetismo solo si está dentro del umbral
  if (minDistance <= threshold) {
    // Calcular el tiempo ajustado con la fuerza de atracción
    return time + (closestPoint - time) * strength
  }

  return time
}

/**
 * Aplica magnetismo a un punto de inicio y fin de un clip
 * @param startTime Tiempo de inicio en segundos
 * @param endTime Tiempo de fin en segundos
 * @param magneticPoints Array de puntos magnéticos en segundos
 * @param strength Fuerza de atracción (0-1)
 * @param threshold Umbral de distancia para aplicar magnetismo (en segundos)
 * @returns Objeto con tiempos de inicio y fin ajustados
 */
export function applyMagnetismToClip(
  startTime: number,
  endTime: number,
  magneticPoints: number[],
  strength = MAGNETISM_STRENGTHS.MEDIUM,
  threshold = 0.1,
): { startTime: number; endTime: number } {
  const adjustedStartTime = applyMagnetism(startTime, magneticPoints, strength, threshold)
  const adjustedEndTime = applyMagnetism(endTime, magneticPoints, strength, threshold)

  return {
    startTime: adjustedStartTime,
    endTime: adjustedEndTime,
  }
}

/**
 * Verifica si un tiempo está cerca de un punto magnético
 * @param time Tiempo en segundos
 * @param magneticPoints Array de puntos magnéticos en segundos
 * @param threshold Umbral de distancia (en segundos)
 * @returns Verdadero si está cerca de un punto magnético
 */
export function isNearMagneticPoint(time: number, magneticPoints: number[], threshold = 0.1): boolean {
  for (const point of magneticPoints) {
    if (Math.abs(time - point) <= threshold) {
      return true
    }
  }

  return false
}

/**
 * Calcula el tiempo exacto de inicio de una toma en la grid
 * @param shots Array de tomas con duración
 * @param shotIndex Índice de la toma
 * @returns Tiempo de inicio en segundos con precisión de grid
 */
export function calculateShotStartTime(shots: { duration: number }[], shotIndex: number): number {
  if (!shots || shotIndex < 0 || shotIndex >= shots.length) return 0

  let startTime = 0
  for (let i = 0; i < shotIndex; i++) {
    // Convertir a puntos de grid para mayor precisión
    const durationInGridPoints = secondsToGridPoints(shots[i].duration || 0)
    startTime += gridPointsToSeconds(durationInGridPoints)
  }

  return startTime
}

/**
 * Calcula el tiempo exacto de fin de una toma en la grid
 * @param shots Array de tomas con duración
 * @param shotIndex Índice de la toma
 * @returns Tiempo de fin en segundos con precisión de grid
 */
export function calculateShotEndTime(shots: { duration: number }[], shotIndex: number): number {
  if (!shots || shotIndex < 0 || shotIndex >= shots.length) return 0

  const startTime = calculateShotStartTime(shots, shotIndex)
  const durationInGridPoints = secondsToGridPoints(shots[shotIndex].duration || 0)

  return startTime + gridPointsToSeconds(durationInGridPoints)
}
