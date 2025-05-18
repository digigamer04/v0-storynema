"use client"

import { useState, useCallback } from "react"

export interface TimelineConfigProps {
  initialZoom?: number
  initialTrackHeight?: number
  showLabels?: boolean
  theme?: {
    activeColor?: string
    inactiveColor?: string
    playheadColor?: string
    backgroundColor?: string
    rulerColor?: string
  }
}

export function useTimelineConfig({
  initialZoom = 1,
  initialTrackHeight = 40,
  showLabels = true,
  theme = {
    activeColor: "bg-blue-500",
    inactiveColor: "bg-blue-400/70",
    playheadColor: "bg-white",
    backgroundColor: "bg-[#444444]",
    rulerColor: "bg-gray-700",
  },
}: TimelineConfigProps = {}) {
  const [zoomLevel, setZoomLevel] = useState(initialZoom)
  const [trackHeight, setTrackHeight] = useState(initialTrackHeight)
  const [displayLabels, setDisplayLabels] = useState(showLabels)
  const [themeConfig, setThemeConfig] = useState(theme)

  const zoom = useCallback((factor: number) => {
    setZoomLevel((prev) => Math.max(0.1, Math.min(10, prev * factor)))
  }, [])

  const zoomIn = useCallback(() => {
    zoom(1.2)
  }, [zoom])

  const zoomOut = useCallback(() => {
    zoom(0.8)
  }, [zoom])

  const resetZoom = useCallback(() => {
    setZoomLevel(initialZoom)
  }, [initialZoom])

  const updateTrackHeight = useCallback((height: number) => {
    setTrackHeight(Math.max(20, Math.min(100, height)))
  }, [])

  const toggleLabels = useCallback(() => {
    setDisplayLabels((prev) => !prev)
  }, [])

  const updateTheme = useCallback((newTheme: Partial<typeof theme>) => {
    setThemeConfig((prev) => ({ ...prev, ...newTheme }))
  }, [])

  return {
    zoomLevel,
    trackHeight,
    displayLabels,
    theme: themeConfig,

    zoom,
    zoomIn,
    zoomOut,
    resetZoom,
    updateTrackHeight,
    toggleLabels,
    updateTheme,
  }
}
