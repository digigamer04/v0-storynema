"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import * as TimelineGrid from "@/lib/timeline-grid"

interface TimecodeRulerProps {
  duration: number
  frameRate: number
  widthPx?: number
  zoomLevel?: number
  scrollPosition?: number
  onSeek?: (time: number) => void
}

export function TimecodeRuler({
  duration,
  frameRate = 24,
  widthPx = 1000,
  zoomLevel = 1,
  scrollPosition = 0,
  onSeek,
}: TimecodeRulerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(widthPx)

  // Actualizar el ancho del contenedor cuando cambie
  useEffect(() => {
    if (containerRef.current) {
      const updateWidth = () => {
        setContainerWidth(containerRef.current?.clientWidth || widthPx)
      }

      updateWidth()
      window.addEventListener("resize", updateWidth)
      return () => window.removeEventListener("resize", updateWidth)
    }
  }, [widthPx])

  // Calcular el número de marcas a mostrar basado en la duración y el zoom
  const calculateMarks = () => {
    if (duration <= 0) return []

    const effectiveWidth = containerWidth * zoomLevel
    const pixelsPerSecond = effectiveWidth / duration

    // Determinar el intervalo de las marcas basado en el zoom
    let interval = 1 // 1 segundo por defecto
    if (pixelsPerSecond < 20) interval = 10
    else if (pixelsPerSecond < 50) interval = 5
    else if (pixelsPerSecond < 100) interval = 2

    const marks = []
    const totalSeconds = Math.ceil(duration)

    for (let i = 0; i <= totalSeconds; i += interval) {
      if (i > duration) break

      const position = (i / duration) * 100
      const isFullMark = i % (interval * 5) === 0 || i === 0

      marks.push({
        time: i,
        position,
        isFullMark,
        label: isFullMark ? TimelineGrid.secondsToSmpte(i, frameRate) : "",
      })
    }

    return marks
  }

  const marks = calculateMarks()

  // Manejar clic en la regla para buscar
  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const clickPosition = e.clientX - rect.left
    const percent = (clickPosition / rect.width) * 100
    const time = (percent / 100) * duration

    onSeek(time)
  }

  return (
    <div
      ref={containerRef}
      className="relative h-6 bg-[#1A1A1A] border-b border-[#333333] cursor-pointer"
      onClick={handleRulerClick}
      style={{
        transform: `scaleX(${zoomLevel})`,
        transformOrigin: "left",
        marginLeft: `-${scrollPosition}px`,
      }}
    >
      {marks.map((mark, index) => (
        <div
          key={`mark-${index}`}
          className="absolute top-0 h-full flex flex-col items-center"
          style={{ left: `${mark.position}%` }}
        >
          <div className={`w-px ${mark.isFullMark ? "h-3 bg-gray-400" : "h-2 bg-gray-600"}`} />
          {mark.label && <span className="text-[10px] text-gray-400 mt-auto mb-1">{mark.label}</span>}
        </div>
      ))}
    </div>
  )
}
