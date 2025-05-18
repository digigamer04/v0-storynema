"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Magnet } from "lucide-react"
import * as TimelineGrid from "@/lib/timeline-grid"

interface MagnetismControlsProps {
  isMagnetismEnabled: boolean
  toggleMagnetism: () => void
  magnetismStrength: number
  setMagnetismStrength: (strength: number) => void
  magneticPointType: string
  setMagneticPointType: (type: string) => void
  customInterval: number
  setCustomInterval: (interval: number) => void
}

export function MagnetismControls({
  isMagnetismEnabled,
  toggleMagnetism,
  magnetismStrength,
  setMagnetismStrength,
  magneticPointType,
  setMagneticPointType,
  customInterval,
  setCustomInterval,
}: MagnetismControlsProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Convertir la fuerza de magnetismo a un valor de 0-100 para el slider
  const strengthToSliderValue = (strength: number) => Math.round(strength * 100)
  const sliderValueToStrength = (value: number) => value / 100

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={isMagnetismEnabled ? "default" : "outline"}
          size="icon"
          className={`h-8 w-8 ${
            isMagnetismEnabled
              ? "bg-amber-600 hover:bg-amber-700 text-white"
              : "bg-[#2A2A2A] border-[#444444] text-gray-200 hover:bg-[#3A3A3A]"
          }`}
          onClick={() => toggleMagnetism()}
          title="Magnetismo Universal"
        >
          <Magnet className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-[#1E1E1E] border-[#333333] text-gray-200">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Magnetismo Universal</h4>
            <Switch checked={isMagnetismEnabled} onCheckedChange={toggleMagnetism} />
          </div>

          <div className="space-y-2">
            <Label>Fuerza de atracción</Label>
            <div className="flex items-center gap-2">
              <Slider
                min={0}
                max={100}
                step={1}
                value={[strengthToSliderValue(magnetismStrength)]}
                onValueChange={(values) => setMagnetismStrength(sliderValueToStrength(values[0]))}
                disabled={!isMagnetismEnabled}
                className="flex-1"
              />
              <span className="w-10 text-center text-sm">{strengthToSliderValue(magnetismStrength)}%</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Puntos de atracción</Label>
            <Select value={magneticPointType} onValueChange={setMagneticPointType} disabled={!isMagnetismEnabled}>
              <SelectTrigger className="bg-[#2A2A2A] border-[#444444] text-gray-200">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent className="bg-[#2A2A2A] border-[#444444] text-gray-200">
                <SelectItem value={TimelineGrid.MAGNETIC_POINTS.FRAME}>Frames</SelectItem>
                <SelectItem value={TimelineGrid.MAGNETIC_POINTS.SECOND}>Segundos</SelectItem>
                <SelectItem value={TimelineGrid.MAGNETIC_POINTS.HALF_SECOND}>Medios segundos</SelectItem>
                <SelectItem value={TimelineGrid.MAGNETIC_POINTS.QUARTER_SECOND}>Cuartos de segundo</SelectItem>
                <SelectItem value={TimelineGrid.MAGNETIC_POINTS.TENTH_SECOND}>Décimos de segundo</SelectItem>
                <SelectItem value={TimelineGrid.MAGNETIC_POINTS.CUSTOM}>Intervalo personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {magneticPointType === TimelineGrid.MAGNETIC_POINTS.CUSTOM && (
            <div className="space-y-2">
              <Label>Intervalo personalizado (segundos)</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={customInterval}
                onChange={(e) => setCustomInterval(Number.parseFloat(e.target.value) || 0.5)}
                disabled={!isMagnetismEnabled}
                className="bg-[#2A2A2A] border-[#444444] text-gray-200"
              />
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="bg-[#2A2A2A] border-[#444444] text-gray-200 hover:bg-[#3A3A3A]"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
