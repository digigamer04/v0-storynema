"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Sparkles, RefreshCw, ArrowLeft, Save, AlertCircle } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase"
import {
  generateScript,
  regenerateScript,
  changeScriptTone,
  type ScriptGenerationParams,
  type GeneratedScript,
  type ToneOption,
  type GenreOption,
  type FormatOption,
} from "@/lib/ai-service"

interface ScriptGeneratorProps {
  onCancel?: () => void
  onScriptCreated?: (scenes: { title: string; content: string }[]) => void
  onGeneration?: (title: string, description: string) => void
}

export default function ScriptGenerator({ onCancel, onScriptCreated, onGeneration }: ScriptGeneratorProps) {
  const router = useRouter()

  // Estados para el formulario
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [genre, setGenre] = useState<GenreOption | "">("")
  const [format, setFormat] = useState<FormatOption | "">("")
  const [tone, setTone] = useState<ToneOption | "">("")
  const [numScenes, setNumScenes] = useState<number | "">("")
  const [characters, setCharacters] = useState("")
  const [additionalNotes, setAdditionalNotes] = useState("")

  // Estados para el proceso de generación
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedScript, setGeneratedScript] = useState<GeneratedScript | null>(null)
  const [currentParams, setCurrentParams] = useState<ScriptGenerationParams | null>(null)
  const [step, setStep] = useState<"form" | "preview">("form")
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)

  // Verificar autenticación al cargar el componente
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClientSupabaseClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session && session.user) {
          setUserId(session.user.id)
          setIsAuthenticated(true)
          console.log("Usuario autenticado:", session.user.id)
        } else {
          setIsAuthenticated(false)
          console.log("Usuario no autenticado")
        }
      } catch (error) {
        console.error("Error al verificar autenticación:", error)
        setIsAuthenticated(false)
      }
    }

    checkAuth()
  }, [])

  // Función para generar el guion
  const handleGenerateScript = async () => {
    if (!description.trim()) {
      toast({
        title: "Error",
        description: "La descripción es obligatoria",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      // Crear los parámetros para la generación
      const params: ScriptGenerationParams = {
        title: title.trim() || undefined,
        description: description.trim(),
        genre: (genre as GenreOption) || undefined,
        format: (format as FormatOption) || undefined,
        tone: (tone as ToneOption) || undefined,
        numScenes: typeof numScenes === "number" ? numScenes : undefined,
        characters: characters.trim() || undefined,
        additionalNotes: additionalNotes.trim() || undefined,
      }

      // Guardar los parámetros actuales para posibles regeneraciones
      setCurrentParams(params)

      // Generar el guion
      const script = await generateScript(params)
      setGeneratedScript(script)
      setStep("preview")

      toast({
        title: "Guion generado",
        description: "El guion se ha generado correctamente",
      })
    } catch (error) {
      console.error("Error generating script:", error)
      setError("Error al generar el guion. Verifica tu conexión a internet o inténtalo de nuevo más tarde.")
      toast({
        title: "Error",
        description: "Error al generar el guion. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Función para regenerar el guion
  const handleRegenerateScript = async () => {
    if (!currentParams) return

    setIsGenerating(true)

    try {
      const script = await regenerateScript(currentParams)
      setGeneratedScript(script)

      toast({
        title: "Guion regenerado",
        description: "Se ha generado una nueva versión del guion",
      })
    } catch (error) {
      console.error("Error regenerating script:", error)
      toast({
        title: "Error",
        description: "Error al regenerar el guion. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Función para cambiar el tono del guion
  const handleChangeTone = async (newTone: ToneOption) => {
    if (!currentParams) return

    setIsGenerating(true)

    try {
      // Actualizar el tono en los parámetros actuales
      const updatedParams = { ...currentParams, tone: newTone }
      setCurrentParams(updatedParams)

      // Generar el guion con el nuevo tono
      const script = await changeScriptTone(currentParams, newTone)
      setGeneratedScript(script)

      toast({
        title: "Tono cambiado",
        description: `El guion ahora tiene un tono ${newTone}`,
      })
    } catch (error) {
      console.error("Error changing tone:", error)
      toast({
        title: "Error",
        description: "Error al cambiar el tono del guion. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Función para crear el guion (aceptar y procesar)
  const handleCreateScript = async () => {
    if (!generatedScript) return

    if (!isAuthenticated || !userId) {
      toast({
        title: "Error de autenticación",
        description: "Debes iniciar sesión para crear un proyecto",
        variant: "destructive",
      })
      router.push("/auth")
      return
    }

    setIsGenerating(true)

    try {
      // Crear cliente de Supabase directamente
      const supabase = createClientSupabaseClient()

      // PASO 1: Crear el proyecto directamente con Supabase
      const projectData = {
        title: title || "Proyecto sin título",
        description: description,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      console.log("Creando proyecto directamente con Supabase...", projectData)

      // Insertar el proyecto
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert([projectData])
        .select()
        .single()

      if (projectError) {
        console.error("Error al crear proyecto:", projectError)
        throw new Error(`Error al crear el proyecto: ${projectError.message}`)
      }

      if (!project) {
        throw new Error("No se pudo crear el proyecto")
      }

      const projectId = project.id
      console.log("Proyecto creado con ID:", projectId)

      // PASO 2: Crear las escenas una por una directamente con Supabase
      // IMPORTANTE: Invertimos el array de escenas para asegurar que se creen en el orden correcto
      // Esto es necesario porque la IA a veces genera las escenas en orden inverso
      const scenesToCreate = [...generatedScript.scenes].reverse()
      console.log(`Creando ${scenesToCreate.length} escenas en orden inverso para mantener la secuencia correcta`)
      console.log(`Orden de escenas después de invertir: ${scenesToCreate.map((s) => s.title).join(" -> ")}`)

      for (let i = 0; i < scenesToCreate.length; i++) {
        const scene = scenesToCreate[i]
        // El índice de orden debe ser inverso al índice del array invertido
        // para que la primera escena tenga el índice más bajo
        const orderIndex = scenesToCreate.length - 1 - i

        // Extraer metadatos adicionales de la escena (ubicación, tiempo)
        const locationMatch = scene.title.match(
          /(INTERIOR|EXTERIOR)\.\s*(.*?)\s*-\s*(DÍA|NOCHE|TARDE|AMANECER|ATARDECER)/i,
        )

        const sceneData = {
          project_id: projectId,
          title: scene.title,
          content: scene.content,
          order_index: orderIndex, // Usamos el índice invertido para mantener el orden correcto
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        console.log(`Creando escena con order_index ${orderIndex}: ${scene.title}`)

        // Insertar la escena directamente
        const { data: sceneData2, error: sceneError } = await supabase
          .from("scenes")
          .insert([sceneData])
          .select()
          .single()

        if (sceneError) {
          console.error(`Error al crear escena ${i + 1}:`, sceneError)
          // Continuamos con las demás escenas incluso si una falla
          continue
        }

        // Si tenemos metadatos y la escena se creó correctamente, los guardamos en la tabla scene_metadata
        if (locationMatch && sceneData2) {
          const metadataData = {
            scene_id: sceneData2.id,
            camera: locationMatch[1].toLowerCase() === "interior" ? "Interior" : "Exterior",
            lighting: locationMatch[3].toLowerCase().includes("día") ? "Natural" : "Artificial",
            location: locationMatch[2].trim(),
            duration: "00:02:00", // Duración predeterminada de 2 minutos
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          const { error: metadataError } = await supabase.from("scene_metadata").insert([metadataData])

          if (metadataError) {
            console.error(`Error al crear metadatos para escena ${i + 1}:`, metadataError)
            // Continuamos aunque falle la creación de metadatos
          }
        }
      }

      // Verificar el orden final de las escenas
      const { data: finalScenes } = await supabase
        .from("scenes")
        .select("title, order_index")
        .eq("project_id", projectId)
        .order("order_index", { ascending: true })

      console.log(
        "Orden final de escenas en la base de datos:",
        finalScenes?.map((s) => `${s.order_index}: ${s.title}`).join(" -> "),
      )

      toast({
        title: "Proyecto creado",
        description: `Se ha creado el proyecto "${project.title}" con ${generatedScript.scenes.length} escenas`,
      })

      // Asegurarnos de que la redirección funcione correctamente
      console.log("Redirigiendo a:", `/projects/${projectId}`)

      // Forzar la redirección con un pequeño retraso para asegurar que todo se ha guardado
      setTimeout(() => {
        router.push(`/projects/${projectId}`)
      }, 500)

      // También intentamos la redirección inmediata
      router.push(`/projects/${projectId}`)

      // Si hay un callback, también lo llamamos
      if (onScriptCreated) {
        onScriptCreated(generatedScript.scenes)
      }
    } catch (error: any) {
      console.error("Error creating project and scenes:", error)
      toast({
        title: "Error",
        description: error.message || "Error al crear el proyecto y las escenas",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Renderizar el formulario de generación
  if (step === "form") {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Generar guion con IA
          </CardTitle>
          <CardDescription>Describe tu idea y la IA generará un guion completo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Título (opcional)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título de tu proyecto"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-red-500">
                Descripción (obligatorio)
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe la historia que quieres crear..."
                className="min-h-[100px]"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="genre">Género</Label>
                <Select value={genre} onValueChange={(value) => setGenre(value as GenreOption)}>
                  <SelectTrigger id="genre">
                    <SelectValue placeholder="Seleccionar género" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="drama">Drama</SelectItem>
                    <SelectItem value="comedia">Comedia</SelectItem>
                    <SelectItem value="thriller">Thriller</SelectItem>
                    <SelectItem value="ciencia ficción">Ciencia Ficción</SelectItem>
                    <SelectItem value="romance">Romance</SelectItem>
                    <SelectItem value="terror">Terror</SelectItem>
                    <SelectItem value="acción">Acción</SelectItem>
                    <SelectItem value="documental">Documental</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="format">Formato</Label>
                <Select value={format} onValueChange={(value) => setFormat(value as FormatOption)}>
                  <SelectTrigger id="format">
                    <SelectValue placeholder="Seleccionar formato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="largometraje">Largometraje</SelectItem>
                    <SelectItem value="cortometraje">Cortometraje</SelectItem>
                    <SelectItem value="serie">Serie</SelectItem>
                    <SelectItem value="webserie">Webserie</SelectItem>
                    <SelectItem value="comercial">Comercial</SelectItem>
                    <SelectItem value="videoclip">Videoclip</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tone">Tono</Label>
                <Select value={tone} onValueChange={(value) => setTone(value as ToneOption)}>
                  <SelectTrigger id="tone">
                    <SelectValue placeholder="Seleccionar tono" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dramático">Dramático</SelectItem>
                    <SelectItem value="cómico">Cómico</SelectItem>
                    <SelectItem value="suspense">Suspense</SelectItem>
                    <SelectItem value="romántico">Romántico</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="oscuro">Oscuro</SelectItem>
                    <SelectItem value="inspirador">Inspirador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="numScenes">Número de escenas (aproximado)</Label>
              <Input
                id="numScenes"
                type="number"
                min="1"
                max="20"
                value={numScenes === "" ? "" : numScenes}
                onChange={(e) => {
                  const value = e.target.value === "" ? "" : Number.parseInt(e.target.value)
                  setNumScenes(value)
                }}
                placeholder="Ej: 5"
              />
            </div>

            <div>
              <Label htmlFor="characters">Personajes principales (opcional)</Label>
              <Textarea
                id="characters"
                value={characters}
                onChange={(e) => setCharacters(e.target.value)}
                placeholder="Describe los personajes principales, separados por comas..."
                className="min-h-[80px]"
              />
            </div>

            <div>
              <Label htmlFor="additionalNotes">Notas adicionales (opcional)</Label>
              <Textarea
                id="additionalNotes"
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Cualquier otra información relevante..."
                className="min-h-[80px]"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleGenerateScript}
            disabled={isGenerating || !description.trim()}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generar guion
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // Renderizar la vista previa del guion generado
  return (
    <Card className="w-full max-w-5xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          Guion generado
        </CardTitle>
        <CardDescription>Revisa el guion generado por la IA</CardDescription>
        {!isAuthenticated && (
          <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800 flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Necesitas iniciar sesión</p>
              <p>Debes iniciar sesión para poder guardar este guion como proyecto.</p>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Controles para cambiar el tono */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Label className="w-full">Cambiar tono a:</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleChangeTone("dramático")}
              disabled={isGenerating}
              className={tone === "dramático" ? "bg-amber-100 border-amber-500" : ""}
            >
              Dramático
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleChangeTone("cómico")}
              disabled={isGenerating}
              className={tone === "cómico" ? "bg-amber-100 border-amber-500" : ""}
            >
              Cómico
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleChangeTone("suspense")}
              disabled={isGenerating}
              className={tone === "suspense" ? "bg-amber-100 border-amber-500" : ""}
            >
              Suspense
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleChangeTone("romántico")}
              disabled={isGenerating}
              className={tone === "romántico" ? "bg-amber-100 border-amber-500" : ""}
            >
              Romántico
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleChangeTone("oscuro")}
              disabled={isGenerating}
              className={tone === "oscuro" ? "bg-amber-100 border-amber-500" : ""}
            >
              Oscuro
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleChangeTone("inspirador")}
              disabled={isGenerating}
              className={tone === "inspirador" ? "bg-amber-100 border-amber-500" : ""}
            >
              Inspirador
            </Button>
          </div>

          {/* Vista previa del guion */}
          <div className="border rounded-md p-4 bg-gray-50 dark:bg-gray-900 max-h-[60vh] overflow-y-auto">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500 mb-4" />
                <p className="text-gray-500">Generando guion...</p>
              </div>
            ) : (
              <div className="font-mono whitespace-pre-wrap">
                {generatedScript?.scenes.map((scene, index) => (
                  <div key={index} className="mb-6">
                    <h3 className="font-bold text-amber-600 mb-2">{scene.title}</h3>
                    <div className="whitespace-pre-line">{scene.content}</div>
                    {index < (generatedScript?.scenes.length || 0) - 1 && (
                      <hr className="my-4 border-gray-300 dark:border-gray-700" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button variant="outline" onClick={handleRegenerateScript} disabled={isGenerating}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Volver a generar
          </Button>
        </div>
        <Button
          onClick={handleCreateScript}
          disabled={isGenerating || !generatedScript || !isAuthenticated}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creando proyecto...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Crear guion
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
