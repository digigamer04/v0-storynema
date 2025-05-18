"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import * as TimelineGrid from "@/lib/timeline-grid"

export interface TimelineGridOptions {
  precision?: number
  frameRate?: number
  snapToGrid?: boolean
  magnetismEnabled?: boolean
  magnetismStrength?: number
  magneticPointType?: string
  customMagneticInterval?: number
}

export function useTimelineGrid(options: TimelineGridOptions = {}) {
  const {
    precision = TimelineGrid.GRID_PRECISION,
    frameRate = TimelineGrid.FRAME_RATES.FILM,
    snapToGrid = true,
    magnetismEnabled = false,
    magnetismStrength = TimelineGrid.MAGNETISM_STRENGTHS.MEDIUM,
    magneticPointType = TimelineGrid.MAGNETIC_POINTS.SECOND,
    customMagneticInterval = 0.5,
  } = options

  // Estado para el tiempo actual en puntos de grid
  const [currentGridPoint, setCurrentGridPoint] = useState<number>(0)

  // Estado para la duración total en puntos de grid
  const [totalGridPoints, setTotalGridPoints] = useState<number>(0)

  // Estado para la configuración de magnetismo
  const [isMagnetismEnabled, setIsMagnetismEnabled] = useState<boolean>(magnetismEnabled)
  const [magnetismStrengthValue, setMagnetismStrengthValue] = useState<number>(magnetismStrength)
  const [activeMagneticPointType, setActiveMagneticPointType] = useState<string>(magneticPointType)
  const [customInterval, setCustomInterval] = useState<number>(customMagneticInterval)

  // Estado para los puntos magnéticos
  const [magneticPoints, setMagneticPoints] = useState<number[]>([])

  // Referencia para el intervalo de actualización
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Actualizar puntos magnéticos cuando cambian las configuraciones
  useEffect(() => {
    if (isMagnetismEnabled) {
      const totalDuration = TimelineGrid.gridPointsToSeconds(totalGridPoints)
      const points = TimelineGrid.generateMagneticPoints(
        activeMagneticPointType,
        totalDuration,
        frameRate,
        activeMagneticPointType === TimelineGrid.MAGNETIC_POINTS.CUSTOM ? customInterval : undefined,
      )
      setMagneticPoints(points)
    } else {
      setMagneticPoints([])
    }
  }, [isMagnetismEnabled, activeMagneticPointType, totalGridPoints, frameRate, customInterval])

  // Función para establecer el tiempo actual en segundos con magnetismo
  const setCurrentTime = useCallback(
    (timeInSeconds: number) => {
      let adjustedTime = timeInSeconds

      // Aplicar magnetismo si está habilitado
      if (isMagnetismEnabled && magneticPoints.length > 0) {
        adjustedTime = TimelineGrid.applyMagnetism(timeInSeconds, magneticPoints, magnetismStrengthValue)
      }

      // Aplicar snap to grid si está habilitado
      if (snapToGrid) {
        adjustedTime = TimelineGrid.snapToGrid(adjustedTime)
      }

      const gridPoints = TimelineGrid.secondsToGridPoints(adjustedTime)
      setCurrentGridPoint(gridPoints)

      return adjustedTime
    },
    [isMagnetismEnabled, magneticPoints, magnetismStrengthValue, snapToGrid],
  )

  // Función para establecer la duración total en segundos
  const setTotalDuration = useCallback((durationInSeconds: number) => {
    const gridPoints = TimelineGrid.secondsToGridPoints(durationInSeconds)
    setTotalGridPoints(gridPoints)
  }, [])

  // Obtener el tiempo actual en segundos
  const getCurrentTime = useCallback(() => {
    return TimelineGrid.gridPointsToSeconds(currentGridPoint)
  }, [currentGridPoint])

  // Obtener la duración total en segundos
  const getTotalDuration = useCallback(() => {
    return TimelineGrid.gridPointsToSeconds(totalGridPoints)
  }, [totalGridPoints])

  // Calcular el porcentaje de progreso
  const calculateProgress = useCallback(() => {
    return TimelineGrid.calculateGridPercentage(currentGridPoint, totalGridPoints)
  }, [currentGridPoint, totalGridPoints])

  // Buscar un punto específico en la línea de tiempo basado en un porcentaje
  const seekToPercentage = useCallback(
    (percentage: number) => {
      const newGridPoint = TimelineGrid.percentageToGridPoint(percentage, totalGridPoints)
      let newTime = TimelineGrid.gridPointsToSeconds(newGridPoint)

      // Aplicar magnetismo si está habilitado
      if (isMagnetismEnabled && magneticPoints.length > 0) {
        newTime = TimelineGrid.applyMagnetism(newTime, magneticPoints, magnetismStrengthValue)

        // Actualizar el punto de grid con el tiempo ajustado
        const adjustedGridPoint = TimelineGrid.secondsToGridPoints(newTime)
        setCurrentGridPoint(adjustedGridPoint)
      } else {
        setCurrentGridPoint(newGridPoint)
      }

      return newTime
    },
    [totalGridPoints, isMagnetismEnabled, magneticPoints, magnetismStrengthValue],
  )

  // Sincronizar tiempos entre dos duraciones diferentes (ej. audio y video)
  const syncTime = useCallback((sourceTime: number, sourceDuration: number, targetDuration: number) => {
    return TimelineGrid.syncTimeBasedOnGrid(sourceTime, sourceDuration, targetDuration)
  }, [])

  // Avanzar un frame
  const advanceFrame = useCallback(() => {
    const frameInGridPoints = TimelineGrid.framesToGridPoints(1, frameRate)
    setCurrentGridPoint((prev) => Math.min(prev + frameInGridPoints, totalGridPoints))
  }, [frameRate, totalGridPoints])

  // Retroceder un frame
  const retreatFrame = useCallback(() => {
    const frameInGridPoints = TimelineGrid.framesToGridPoints(1, frameRate)
    setCurrentGridPoint((prev) => Math.max(prev - frameInGridPoints, 0))
  }, [frameRate])

  // Iniciar reproducción con actualización basada en grid
  const startPlayback = useCallback(
    (onUpdate?: (time: number) => void) => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
      }

      // Actualizar cada 1/precision segundos para mantener sincronía con la grid
      const updateInterval = 1000 / precision

      updateIntervalRef.current = setInterval(() => {
        setCurrentGridPoint((prev) => {
          const next = prev + 1 // Avanzar un punto en la grid
          if (next >= totalGridPoints) {
            if (updateIntervalRef.current) {
              clearInterval(updateIntervalRef.current)
            }
            return totalGridPoints
          }

          const currentTime = TimelineGrid.gridPointsToSeconds(next)
          if (onUpdate) {
            onUpdate(currentTime)
          }

          return next
        })
      }, updateInterval)

      return () => {
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current)
        }
      }
    },
    [precision, totalGridPoints],
  )

  // Detener reproducción
  const stopPlayback = useCallback(() => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current)
      updateIntervalRef.current = null
    }
  }, [])

  // Limpiar intervalo al desmontar
  useEffect(() => {
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
      }
    }
  }, [])

  // Convertir tiempo SMPTE a segundos
  const smpteToSeconds = useCallback(
    (smpte: string) => {
      const gridPoints = TimelineGrid.smpteToGridPoints(smpte, frameRate)
      return TimelineGrid.gridPointsToSeconds(gridPoints)
    },
    [frameRate],
  )

  // Convertir segundos a tiempo SMPTE
  const secondsToSmpte = useCallback(
    (seconds: number) => {
      const gridPoints = TimelineGrid.secondsToGridPoints(seconds)
      return TimelineGrid.gridPointsToSmpte(gridPoints, frameRate)
    },
    [frameRate],
  )

  // Aplicar magnetismo a un clip (inicio y fin)
  const applyMagnetismToClip = useCallback(
    (startTime: number, endTime: number) => {
      if (!isMagnetismEnabled || magneticPoints.length === 0) {
        return { startTime, endTime }
      }

      return TimelineGrid.applyMagnetismToClip(startTime, endTime, magneticPoints, magnetismStrengthValue)
    },
    [isMagnetismEnabled, magneticPoints, magnetismStrengthValue],
  )

  // Verificar si un tiempo está cerca de un punto magnético
  const isNearMagneticPoint = useCallback(
    (time: number, threshold = 0.1) => {
      if (!isMagnetismEnabled || magneticPoints.length === 0) {
        return false
      }

      return TimelineGrid.isNearMagneticPoint(time, magneticPoints, threshold)
    },
    [isMagnetismEnabled, magneticPoints],
  )

  // Funciones para controlar la configuración de magnetismo
  const toggleMagnetism = useCallback(() => {
    setIsMagnetismEnabled((prev) => !prev)
  }, [])

  const setMagnetismStrength = useCallback((strength: number) => {
    setMagnetismStrengthValue(strength)
  }, [])

  const setMagneticPointType = useCallback((type: string) => {
    setActiveMagneticPointType(type)
  }, [])

  const setCustomMagneticInterval = useCallback((interval: number) => {
    setCustomInterval(interval)
  }, [])

  return {
    // Estado
    currentGridPoint,
    totalGridPoints,
    isMagnetismEnabled,
    magnetismStrengthValue,
    activeMagneticPointType,
    customInterval,
    magneticPoints,

    // Setters
    setCurrentTime,
    setTotalDuration,
    setCurrentGridPoint,
    setTotalGridPoints,

    // Getters
    getCurrentTime,
    getTotalDuration,

    // Cálculos
    calculateProgress,
    seekToPercentage,
    syncTime,

    // Control de frames
    advanceFrame,
    retreatFrame,

    // Control de reproducción
    startPlayback,
    stopPlayback,

    // Conversiones de formato
    smpteToSeconds,
    secondsToSmpte,

    // Funciones de magnetismo
    toggleMagnetism,
    setMagnetismStrength,
    setMagneticPointType,
    setCustomMagneticInterval,
    applyMagnetismToClip,
    isNearMagneticPoint,
  }
}
