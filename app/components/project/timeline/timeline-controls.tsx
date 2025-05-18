"use client"

import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface TimelineControlsProps {
  projectId: string
  sceneIds: string[]
  onReorder?: () => void
}

export function TimelineControls({ projectId, sceneIds, onReorder }: TimelineControlsProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [operation, setOperation] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  const handleInvertOrder = async () => {
    if (!sceneIds.length) {
      toast({
        title: "No hay escenas para invertir",
        description: "Añade escenas al proyecto primero",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setOperation("invertir")
    setDebugInfo(null)

    try {
      const startTime = Date.now()
      console.log("Enviando solicitud para invertir escenas:", {
        projectId,
        sceneCount: sceneIds.length,
        timestamp: new Date().toISOString(),
      })

      // Usar la función centralizada para flip
      const response = await fetch("/api/scenes/flip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          sceneIds,
        }),
      })

      const endTime = Date.now()
      const responseTime = endTime - startTime

      // Extraer el texto de la respuesta incluso si no es JSON válido
      const responseText = await response.text()
      let result

      try {
        result = JSON.parse(responseText)
      } catch (parseError) {
        console.error("Error al parsear respuesta JSON:", parseError)
        result = {
          error: "Error al parsear respuesta JSON",
          rawResponse: responseText.substring(0, 500), // Primeros 500 caracteres
        }
      }

      // Guardar información de depuración
      setDebugInfo({
        status: response.status,
        statusText: response.statusText,
        responseTime: `${responseTime}ms`,
        headers: Object.fromEntries(response.headers.entries()),
        result,
      })

      console.log("Respuesta de inversión:", {
        status: response.status,
        time: responseTime,
        result,
      })

      if (!response.ok) {
        throw new Error(result.error || "Error al invertir escenas")
      }

      toast({
        title: "Orden invertido",
        description: `Se han invertido ${sceneIds.length} escenas en ${responseTime}ms`,
      })

      // Forzar actualización de la UI
      if (onReorder) {
        onReorder()
      }
      router.refresh()
    } catch (error) {
      console.error("Error al invertir escenas:", error)

      // Mostrar toast de error con más información
      toast({
        title: "Error al invertir escenas",
        description: error instanceof Error ? error.message : "Ocurrió un error inesperado",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setOperation(null)
    }
  }

  // Botón para mostrar/ocultar información de depuración
  const toggleDebugInfo = () => {
    if (debugInfo) {
      setDebugInfo(null)
    } else {
      setDebugInfo({ message: "No hay información de depuración disponible aún" })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleInvertOrder} disabled={isLoading || !sceneIds.length}>
          {isLoading && operation === "invertir" ? "Invirtiendo..." : "Invertir orden"}
        </Button>

        {/* Botón de depuración (solo visible en desarrollo) */}
        {process.env.NODE_ENV !== "production" && (
          <Button variant="ghost" size="sm" onClick={toggleDebugInfo}>
            {debugInfo ? "Ocultar debug" : "Mostrar debug"}
          </Button>
        )}
      </div>

      {/* Información de depuración */}
      {debugInfo && (
        <div className="bg-slate-100 p-4 rounded-md text-xs font-mono overflow-auto max-h-60">
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
