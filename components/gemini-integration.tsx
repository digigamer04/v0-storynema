"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sparkles, Wand2, BookOpen, MessageSquare, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "@/components/ui/use-toast"

interface GeminiIntegrationProps {
  setGeneratedContent?: (content: string) => void
}

export default function GeminiIntegration({ setGeneratedContent }: GeminiIntegrationProps) {
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContentState, setGeneratedContentState] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [contentType, setContentType] = useState("scene")
  const [improveAspect, setImproveAspect] = useState("dialogue")
  const [analyzeType, setAnalyzeType] = useState("character")
  const [contentToImprove, setContentToImprove] = useState("")
  const [contentToAnalyze, setContentToAnalyze] = useState("")
  const [analzeType, setAnalzeType] = useState("character")
  const [activeScene, setActiveScene] = useState<{ content: string } | null>(null)

  // Mejorar los prompts del asistente de IA para que use el texto existente como contexto

  // Modificar la función generateContent para que solo afecte a la escena activa
  const generateContent = async () => {
    setIsGenerating(true)
    setError(null)
    setGeneratedContentState("")

    try {
      // Obtener el contenido completo del guion
      const fullScript = localStorage.getItem("storynema_script_scenes")
      let scriptContext = ""

      if (fullScript) {
        try {
          const scenes = JSON.parse(fullScript)
          scriptContext = scenes
            .map(
              (scene: any) => `${scene.title}

${scene.content}`,
            )
            .join("\n\n")
        } catch (e) {
          console.error("Error parsing script:", e)
        }
      }

      // Construir el prompt completo basado en el tipo de contenido
      let fullPrompt = ""

      switch (contentType) {
        case "scene":
          fullPrompt = `Basándote en el siguiente guion completo para entender el contexto:

${scriptContext}

Genera una escena completa de guion cinematográfico que continúe naturalmente con: ${prompt}. 
Incluye descripciones de escena, acciones y diálogos en formato profesional de guion.
La escena debe tener una duración aproximada de 1-2 minutos en pantalla.
Usa un tono consistente con el resto del guion.`
          break
        case "dialogue":
          fullPrompt = `Basándote en el siguiente guion completo para entender el contexto:

${scriptContext}

Genera un diálogo cinematográfico entre personajes que continúe con: ${prompt}. 
Asegúrate de que suene natural, mantenga la coherencia con los personajes existentes y tenga tensión dramática.
El diálogo debe ser conciso y tener una duración aproximada de 30-45 segundos en pantalla.
Usa el formato estándar de guion para diálogos (PERSONAJE centrado en mayúsculas, seguido del diálogo).`
          break
        case "description":
          fullPrompt = `Basándote en el siguiente guion completo para entender el contexto:

${scriptContext}

Genera una descripción detallada de escena para un guion cinematográfico que complemente: ${prompt}. 
Incluye detalles visuales, atmósfera y elementos importantes que enriquezcan la narrativa actual.
La descripción debe ser visual y cinematográfica, con una duración aproximada de 15-30 segundos en pantalla.
Usa un lenguaje descriptivo y evocador que ayude al director a visualizar la escena.`
          break
        case "character":
          fullPrompt = `Basándote en el siguiente guion completo para entender el contexto:

${scriptContext}

Crea un perfil completo de personaje para un guion cinematográfico que se integre con la historia actual: ${prompt}. 
Incluye antecedentes, motivaciones, conflictos internos y arco de transformación que sean coherentes con la narrativa existente.
Añade también algunas líneas de diálogo características que muestren la personalidad del personaje.
El personaje debe encajar naturalmente en el mundo y tono establecidos en el guion.`
          break
      }

      // Llamada a la API de Gemini
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: fullPrompt }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al conectar con la API de Gemini")
      }

      const data = await response.json()

      if (!data.text) {
        throw new Error("La respuesta de la API no contiene texto generado")
      }

      setGeneratedContentState(data.text)
      // No enviar el contenido generado al editor de guion automáticamente
      // Solo se enviará cuando el usuario haga clic en "Insertar en el guion"

      toast({
        title: "Contenido generado correctamente",
        description: "Puedes insertarlo en el guion haciendo clic en el botón correspondiente.",
      })
    } catch (err) {
      console.error("Error:", err)
      setError(err instanceof Error ? err.message : "Error desconocido al generar contenido")

      toast({
        title: "Error al generar contenido",
        description: err instanceof Error ? err.message : "Error desconocido al generar contenido",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // También mejorar la función improveContent
  const improveContent = async () => {
    setIsGenerating(true)
    setError(null)
    setGeneratedContentState("")

    try {
      // Construir el prompt para mejorar contenido con más contexto
      const fullPrompt = `Mejora el siguiente fragmento de guion cinematográfico, enfocándote específicamente en ${
        improveAspect === "dialogue"
          ? "los diálogos, haciéndolos más naturales, dinámicos y reveladores de los personajes"
          : improveAspect === "descriptions"
            ? "las descripciones, haciéndolas más vívidas, cinematográficas y evocadoras"
            : improveAspect === "pacing"
              ? "el ritmo narrativo, mejorando la fluidez, tensión y estructura de la escena"
              : "la tensión dramática, intensificando los conflictos, subtexto y stakes emocionales"
      }:

${contentToImprove}

Proporciona una versión mejorada manteniendo la esencia pero elevando la calidad. Asegúrate de que el resultado siga el formato profesional de guion cinematográfico y sea coherente con el estilo y tono del texto original.`

      // Llamada a la API de Gemini
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: fullPrompt }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al conectar con la API de Gemini")
      }

      setGeneratedContentState(data.text)
      if (setGeneratedContent) {
        setGeneratedContent(data.text)
      }
    } catch (err) {
      console.error("Error:", err)
      setError(err instanceof Error ? err.message : "Error desconocido al mejorar contenido")
    } finally {
      setIsGenerating(false)
    }
  }

  // Y mejorar la función analyzeContent
  const analyzeContent = async () => {
    setIsGenerating(true)
    setError(null)
    setGeneratedContentState("")

    try {
      // Construir el prompt para analizar contenido con más profundidad
      const fullPrompt = `Analiza el siguiente fragmento de guion cinematográfico, enfocándote en ${
        analyzeType === "character"
          ? "el desarrollo de personajes, incluyendo arcos, motivaciones, conflictos internos y externos, y cómo se revelan a través de acciones y diálogos"
          : analyzeType === "structure"
            ? "la estructura narrativa, evaluando el planteamiento, nudo y desenlace, puntos de giro, y cómo contribuyen al ritmo y la progresión de la historia"
            : analyzeType === "pacing"
              ? "el ritmo y tempo, analizando la alternancia entre momentos de tensión y calma, la duración de las escenas, y cómo afecta a la experiencia del espectador"
              : "los temas y subtexto, identificando los mensajes implícitos, simbolismos, motivos recurrentes y capas de significado que enriquecen la narrativa"
      }:

${contentToAnalyze}

Proporciona un análisis detallado con fortalezas, debilidades y sugerencias de mejora específicas que un guionista profesional podría implementar. Incluye ejemplos concretos del texto para ilustrar tus puntos.`

      // Llamada a la API de Gemini
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: fullPrompt }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al conectar con la API de Gemini")
      }

      setGeneratedContentState(data.text)
      if (setGeneratedContent) {
        setGeneratedContent(data.text)
      }
    } catch (err) {
      console.error("Error:", err)
      setError(err instanceof Error ? err.message : "Error desconocido al analizar contenido")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card className="bg-[#1E1E1E] border-[#333333]">
      <CardHeader className="border-b border-[#333333]">
        <CardTitle className="flex items-center gap-2 text-white">
          <Sparkles className="h-5 w-5 text-amber-500" />
          Google Gemini 2.0 Flash
        </CardTitle>
        <CardDescription className="text-gray-400">
          Utiliza el modelo experimental Gemini 2.0 Flash para generar y mejorar tu guion
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <Tabs defaultValue="generate">
          <TabsList className="grid grid-cols-3 mb-4 bg-[#2A2A2A]">
            <TabsTrigger value="generate" className="flex items-center gap-1 data-[state=active]:bg-[#3A3A3A]">
              <Wand2 className="h-4 w-4" />
              Generar
            </TabsTrigger>
            <TabsTrigger value="improve" className="flex items-center gap-1 data-[state=active]:bg-[#3A3A3A]">
              <BookOpen className="h-4 w-4" />
              Mejorar
            </TabsTrigger>
            <TabsTrigger value="analyze" className="flex items-center gap-1 data-[state=active]:bg-[#3A3A3A]">
              <MessageSquare className="h-4 w-4" />
              Analizar
            </TabsTrigger>
          </TabsList>

          {error && (
            <Alert variant="destructive" className="mb-4 bg-[#3A1A1A] border-red-900 text-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error al conectar con la API de Gemini</AlertTitle>
              <AlertDescription>
                {error}
                <p className="mt-2 text-xs">
                  Si el problema persiste, verifica que la clave de API de Gemini esté configurada correctamente en las
                  variables de entorno.
                </p>
              </AlertDescription>
            </Alert>
          )}

          <TabsContent value="generate" className="space-y-4">
            <div>
              <Label className="text-gray-300">Tipo de contenido</Label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger className="bg-[#2A2A2A] border-[#444444] text-gray-200">
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent className="bg-[#2A2A2A] border-[#444444] text-gray-200">
                  <SelectItem value="scene">Escena completa</SelectItem>
                  <SelectItem value="dialogue">Diálogo</SelectItem>
                  <SelectItem value="description">Descripción</SelectItem>
                  <SelectItem value="character">Personaje</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-300">Instrucciones</Label>
              <Textarea
                placeholder="Describe lo que quieres generar..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[100px] bg-[#2A2A2A] border-[#444444] text-gray-200 placeholder:text-gray-500"
              />
            </div>

            <Button
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
              onClick={generateContent}
              disabled={isGenerating || !prompt.trim()}
            >
              {isGenerating ? "Generando..." : "Generar con Gemini 2.0 Flash"}
            </Button>

            {generatedContentState && (
              <div className="mt-4">
                <Label className="text-gray-300">Contenido generado</Label>
                <div className="p-4 border rounded-md bg-[#252525] border-[#444444] font-mono whitespace-pre-wrap text-gray-200">
                  {generatedContentState}
                </div>
                <div className="flex justify-end mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#444444] text-gray-300 hover:bg-[#3A3A3A]"
                    onClick={() => {
                      if (setGeneratedContent) {
                        setGeneratedContent(generatedContentState)
                      }
                    }}
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    Insertar en el guion
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="improve" className="space-y-4">
            <div>
              <Label className="text-gray-300">Aspecto a mejorar</Label>
              <Select value={improveAspect} onValueChange={setImproveAspect}>
                <SelectTrigger className="bg-[#2A2A2A] border-[#444444] text-gray-200">
                  <SelectValue placeholder="Seleccionar aspecto" />
                </SelectTrigger>
                <SelectContent className="bg-[#2A2A2A] border-[#444444] text-gray-200">
                  <SelectItem value="dialogue">Diálogos</SelectItem>
                  <SelectItem value="descriptions">Descripciones</SelectItem>
                  <SelectItem value="pacing">Ritmo</SelectItem>
                  <SelectItem value="tension">Tensión dramática</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-300">Contenido a mejorar</Label>
              <Textarea
                placeholder="Pega el contenido que quieres mejorar..."
                value={contentToImprove}
                onChange={(e) => setContentToImprove(e.target.value)}
                className="min-h-[150px] bg-[#2A2A2A] border-[#444444] text-gray-200 placeholder:text-gray-500"
              />
            </div>

            <Button
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
              onClick={improveContent}
              disabled={isGenerating || !contentToImprove.trim()}
            >
              {isGenerating ? "Procesando..." : "Mejorar con Gemini 2.0 Flash"}
            </Button>

            {generatedContentState && (
              <div className="mt-4">
                <Label className="text-gray-300">Contenido mejorado</Label>
                <div className="p-4 border rounded-md bg-[#252525] border-[#444444] font-mono whitespace-pre-wrap text-gray-200">
                  {generatedContentState}
                </div>
                <div className="flex justify-end mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#444444] text-gray-300 hover:bg-[#3A3A3A]"
                    onClick={() => {
                      if (setGeneratedContent) {
                        setGeneratedContent(generatedContentState)
                      }
                    }}
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    Insertar en el guion
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="analyze" className="space-y-4">
            <div>
              <Label className="text-gray-300">Tipo de análisis</Label>
              <Select value={analyzeType} onValueChange={setAnalzeType}>
                <SelectTrigger className="bg-[#2A2A2A] border-[#444444] text-gray-200">
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent className="bg-[#2A2A2A] border-[#444444] text-gray-200">
                  <SelectItem value="character">Desarrollo de personajes</SelectItem>
                  <SelectItem value="structure">Estructura narrativa</SelectItem>
                  <SelectItem value="pacing">Ritmo y tempo</SelectItem>
                  <SelectItem value="theme">Temas y subtexto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-300">Contenido a analizar</Label>
              <Textarea
                placeholder="Pega el contenido que quieres analizar..."
                value={contentToAnalyze}
                onChange={(e) => setContentToAnalyze(e.target.value)}
                className="min-h-[150px] bg-[#2A2A2A] border-[#444444] text-gray-200 placeholder:text-gray-500"
              />
            </div>

            <Button
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
              onClick={analyzeContent}
              disabled={isGenerating || !contentToAnalyze.trim()}
            >
              {isGenerating ? "Analizando..." : "Analizar con Gemini 2.0 Flash"}
            </Button>

            {generatedContentState && (
              <div className="mt-4">
                <Label className="text-gray-300">Análisis</Label>
                <div className="p-4 border rounded-md bg-[#252525] border-[#444444] font-mono whitespace-pre-wrap text-gray-200">
                  {generatedContentState}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
