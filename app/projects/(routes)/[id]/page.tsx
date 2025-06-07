"use client"

import { useCallback, useState, useEffect, useRef } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Download, Save, Share2, Sparkles } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import ScriptEditor from "@/components/script-editor"
import StoryboardContainer from "@/components/storyboard-container"
import ProjectSettings from "@/components/project-settings"
import GeminiIntegration from "@/components/gemini-integration"
import { toast } from "@/components/ui/use-toast"
import { createClientSupabaseClient } from "@/lib/supabase"
import { cleanupProjectData } from "@/lib/project-isolation"
import { saveScenes as saveScenesToLocalStorage } from "@/lib/state-manager" // Importar para backup local

export default function ProjectPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [projectTitle, setProjectTitle] = useState("")
  const [showGemini, setShowGemini] = useState(false)
  const [activeTab, setActiveTab] = useState("script")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [generatedContent, setGeneratedContent] = useState("")
  const [aiSuggestions, setAiSuggestions] = useState([
    "Añadir una descripción del entorno para la primera escena.",
    "Crear un personaje principal para la historia.",
    "Establecer el conflicto inicial de la trama.",
  ])

  // Estados principales - FUENTE ÚNICA DE VERDAD
  const [scenes, setScenes] = useState([])
  const [activeSceneIndex, setActiveSceneIndex] = useState(0)
  const [storyboardData, setStoryboardData] = useState(null) // Mantener si es usado por StoryboardContainer

  // Referencia para el intervalo de generación de sugerencias
  const suggestionsIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Verificar autenticación
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClientSupabaseClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          console.error("No active session found")
          router.push("/auth")
          return
        }

        setUserId(session.user.id)
      } catch (error) {
        console.error("Error checking authentication:", error)
        router.push("/auth")
      }
    }

    checkAuth()
  }, [router])

  // Función principal para manejar cambios de escenas (llamada por ScriptEditor y StoryboardContainer)
  const handleScenesChange = useCallback(
    (updatedScenes) => {
      console.info("ProjectPage", "Actualizando escenas (fuente única de verdad)", {
        scenesCount: updatedScenes.length,
        projectId: params.id,
      })

      // Asegurar order_index correcto y actualizar el estado principal
      const scenesWithCorrectOrder = updatedScenes.map((scene, index) => ({
        ...scene,
        order_index: index,
      }))
      setScenes(scenesWithCorrectOrder)

      // Guardar en localStorage como backup (usando el state manager)
      saveScenesToLocalStorage(params.id, scenesWithCorrectOrder)
    },
    [params.id],
  )

  // Función para manejar cambios de índice activo (llamada por ScriptEditor y StoryboardContainer)
  const handleActiveSceneIndexChange = useCallback(
    (newIndex) => {
      console.info("ProjectPage", "Cambiando índice activo", {
        oldIndex: activeSceneIndex,
        newIndex,
        projectId: params.id,
      })
      setActiveSceneIndex(newIndex)
    },
    [activeSceneIndex, params.id],
  )

  // Modificar el useEffect que carga los datos del proyecto para cargar también desde localStorage si es necesario
  useEffect(() => {
    if (!userId) return

    const fetchProjectData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        console.info("ProjectPage", "Cargando datos del proyecto", { projectId: params.id, userId })

        // Limpiar datos de localStorage de otros proyectos
        cleanupProjectData(params.id)

        const supabase = createClientSupabaseClient()
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("*")
          .eq("id", params.id)
          .single()

        if (projectError) {
          console.error("ProjectPage", "Proyecto no encontrado", { error: projectError.message })
          setError("Proyecto no encontrado")
          setIsLoading(false)
          return
        }

        if (projectData.user_id !== userId) {
          console.error("ProjectPage", "Sin permisos para el proyecto", { userId, projectUserId: projectData.user_id })
          setError("No tienes permiso para ver este proyecto")
          setIsLoading(false)
          return
        }

        console.info("ProjectPage", "Proyecto cargado", { title: projectData.title })
        setProjectTitle(projectData.title)

        // Intentar cargar desde localStorage primero
        let loadedScenes = null
        try {
          const savedScenes = localStorage.getItem(`storynema_scenes_${params.id}`)
          if (savedScenes) {
            loadedScenes = JSON.parse(savedScenes)
            console.info("ProjectPage", "Escenas cargadas desde localStorage", { count: loadedScenes.length })
          }
        } catch (error) {
          console.warn("ProjectPage", "Error cargando desde localStorage", { error: error.message })
        }

        // Si no hay en localStorage, cargar desde Supabase
        if (!loadedScenes || loadedScenes.length === 0) {
          console.info("ProjectPage", "Cargando escenas desde Supabase")
          const { data: scenesData, error: scenesError } = await supabase
            .from("scenes")
            .select("*")
            .eq("project_id", params.id)
            .order("order_index", { ascending: true }) // Asegurar orden ascendente

          if (scenesError) {
            console.error("ProjectPage", "Error cargando escenas", { error: scenesError.message })
            setError(`Error al cargar las escenas: ${scenesError.message}`)
            setIsLoading(false)
            return
          }

          loadedScenes = scenesData || []
          console.info("ProjectPage", "Escenas cargadas desde Supabase", { count: loadedScenes.length })
        }

        // Asegurar que las escenas tengan order_index correcto y establecerlas
        const scenesToSet = loadedScenes.map((scene, index) => ({
          ...scene,
          order_index: index,
        }))

        if (scenesToSet.length > 0) {
          setScenes(scenesToSet)
          setActiveSceneIndex(0) // Siempre empezar con la primera escena
          console.info("ProjectPage", "Escenas establecidas", {
            count: scenesToSet.length,
            firstSceneTitle: scenesToSet[0]?.title,
          })
        } else {
          // Crear escena temporal si no hay ninguna
          const tempScene = {
            id: `temp-${Date.now()}`,
            title: "ESCENA 1 - NUEVA ESCENA",
            content: "",
            project_id: params.id,
            order_index: 0,
            is_temporary: true,
          }

          setScenes([tempScene])
          setActiveSceneIndex(0)

          console.info("ProjectPage", "Escena temporal creada")
          toast({
            title: "Escena temporal creada",
            description: "Estás trabajando con una escena temporal. Guarda el proyecto para persistir los cambios.",
            duration: 5000,
          })
        }

        setIsLoading(false)
      } catch (error) {
        console.error("ProjectPage", "Error cargando proyecto", { error: error.message }, error)
        setError(`Error al cargar los datos del proyecto: ${error.message}`)
        setIsLoading(false)

        toast({
          title: "Error al cargar el proyecto",
          description: error.message,
          variant: "destructive",
        })
      }
    }

    fetchProjectData()
  }, [params.id, userId])

  // Función para generar sugerencias de IA basadas en el guion actual
  const generateAiSuggestions = useCallback(() => {
    if (!scenes || scenes.length === 0) return

    const currentScene = scenes[activeSceneIndex]

    if (currentScene) {
      const content = currentScene.content?.toLowerCase() || ""
      const newSuggestions = []

      if (content.includes("personaje") || content.includes("protagonista")) {
        newSuggestions.push("Desarrollar más el perfil del personaje principal.")
      }

      if (content.includes("escena") || content.includes("lugar")) {
        newSuggestions.push("Añadir más detalles sobre el ambiente de la escena.")
      }

      if (content.includes("diálogo") || content.includes("habla")) {
        newSuggestions.push("Expandir el diálogo para mostrar mejor la personalidad.")
      }

      if (newSuggestions.length < 3) {
        newSuggestions.push("Añadir un giro inesperado a la trama actual.")
        newSuggestions.push("Desarrollar más el conflicto principal de la escena.")
        newSuggestions.push("Incluir una descripción del estado emocional del protagonista.")
      }

      setAiSuggestions(newSuggestions.slice(0, 3))
    }
  }, [scenes, activeSceneIndex])

  useEffect(() => {
    if (scenes.length > 0) {
      generateAiSuggestions()
    }

    suggestionsIntervalRef.current = setInterval(generateAiSuggestions, 120000)

    return () => {
      if (suggestionsIntervalRef.current) {
        clearInterval(suggestionsIntervalRef.current)
      }
    }
  }, [generateAiSuggestions, scenes])

  // Función para aplicar una sugerencia de IA
  const applySuggestion = useCallback((suggestion: string) => {
    const generatedText = `

// Sugerencia aplicada: ${suggestion}

`
    setGeneratedContent(generatedText)
  }, [])

  // Modify the handleTabChange function to prevent unnecessary re-renders
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value)
  }, [])

  // Function to save the project
  const saveProject = async () => {
    try {
      console.info("ProjectPage", "Iniciando guardado de proyecto", { scenesCount: scenes.length })
      const supabase = createClientSupabaseClient()

      // Iterar a través de las escenas y actualizarlas en la base de datos
      // Las escenas en el estado `scenes` ya están ordenadas por `order_index`
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i]
        const orderIndex = i // El order_index es simplemente su posición en el array actual

        // Si la escena es temporal, crear una nueva escena en la base de datos
        if (scene.is_temporary || scene.id.startsWith("temp-")) {
          console.info("ProjectPage", "Creando escena desde temporal", {
            title: scene.title,
            orderIndex,
          })

          const { data: newScene, error: newSceneError } = await supabase
            .from("scenes")
            .insert({
              project_id: params.id,
              title: scene.title || "Nueva Escena",
              content: scene.content || "",
              order_index: orderIndex,
            })
            .select()
            .single()

          if (newSceneError) {
            console.error("ProjectPage", "Error creando escena", { error: newSceneError.message })
            toast({
              title: "Error al crear escena",
              description: newSceneError.message,
              variant: "destructive",
            })
            return // Detener el guardado si hay un error
          }

          // Actualizar el estado local con el nuevo ID de la escena persistida
          // Esto es crucial para que las futuras operaciones no traten esta escena como temporal
          setScenes((prevScenes) => prevScenes.map((s, idx) => (idx === i ? { ...newScene, is_temporary: false } : s)))

          console.info("ProjectPage", "Escena creada con ID", { newId: newScene.id })
        } else {
          // Validar ID de escena existente
          if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(scene.id)) {
            console.error("ProjectPage", "ID de escena inválido", { sceneId: scene.id })
            toast({
              title: "Error",
              description: `ID de escena inválido: ${scene.id}. Por favor, contacta al soporte.`,
              variant: "destructive",
            })
            return // Detener el guardado
          }

          // Actualizar escena existente
          console.info("ProjectPage", "Actualizando escena existente", {
            sceneId: scene.id,
            orderIndex,
          })

          const { error: updateSceneError } = await supabase
            .from("scenes")
            .update({
              title: scene.title || "Escena sin título",
              content: scene.content || "",
              order_index: orderIndex,
            })
            .eq("id", scene.id)

          if (updateSceneError) {
            console.error("ProjectPage", "Error actualizando escena", { error: updateSceneError.message })
            toast({
              title: "Error al actualizar escena",
              description: updateSceneError.message,
              variant: "destructive",
            })
            return // Detener el guardado
          }
        }
      }

      // Después de guardar en la base de datos, actualizar el localStorage
      // con el estado actual de `scenes` (que ya incluye los IDs persistidos)
      saveScenesToLocalStorage(params.id, scenes)

      console.info("ProjectPage", "Proyecto guardado exitosamente")
      toast({
        title: "Proyecto guardado",
        description: "Los cambios han sido guardados exitosamente.",
      })
    } catch (error) {
      console.error("ProjectPage", "Error guardando proyecto", { error: error.message }, error)
      toast({
        title: "Error al guardar el proyecto",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  // Agregar esta función después de la declaración de saveProject
  const cleanupProjectDataLocal = useCallback(() => {
    // Limpiar solo los datos relacionados con este proyecto específico
    try {
      localStorage.removeItem(`storynema_scenes_${params.id}`)
      localStorage.removeItem(`storynema_storyboard_data_${params.id}`)
      localStorage.removeItem(`storynema_last_update_source_${params.id}`)
      localStorage.removeItem(`storynema_last_update_time_${params.id}`)
    } catch (error) {
      console.error("Error cleaning up project data:", error)
    }
  }, [params.id])

  // Agregar este useEffect para limpiar los datos al desmontar el componente
  useEffect(() => {
    return () => {
      // Solo limpiar si hemos guardado los datos en la base de datos
      const lastUpdateTime = localStorage.getItem(`storynema_last_update_time_${params.id}`)
      if (lastUpdateTime) {
        const timeSinceLastUpdate = Date.now() - Number.parseInt(lastUpdateTime)
        // Si han pasado más de 5 minutos desde la última actualización, limpiar los datos
        if (timeSinceLastUpdate > 5 * 60 * 1000) {
          cleanupProjectDataLocal()
        }
      }
    }
  }, [cleanupProjectDataLocal, params.id])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" disabled>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="h-8 w-48 bg-gray-200 animate-pulse rounded"></div>
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
            </div>
          </div>
          <div className="h-12 w-full bg-gray-200 animate-pulse rounded"></div>
          <div className="h-64 w-full bg-gray-200 animate-pulse rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Error</h1>
          </div>
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p>{error}</p>
            <div className="mt-4">
              <Link href="/">
                <Button>Volver al inicio</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden">
      <div className="flex flex-col gap-2 flex-grow py-0.5 px-2 md:py-1 md:px-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">{projectTitle}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showGemini ? "default" : "outline"}
              size="sm"
              className="flex items-center gap-1 h-7 text-xs py-0"
              onClick={() => setShowGemini(!showGemini)}
            >
              <Sparkles className="h-4 w-4" />
              {showGemini ? "Ocultar IA" : "Mostrar IA"}
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-1 h-7 text-xs py-0">
              <Share2 className="h-4 w-4" />
              Compartir
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-1 h-7 text-xs py-0">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button size="sm" className="flex items-center gap-1 h-7 text-xs py-0" onClick={saveProject}>
              <Save className="h-4 w-4" />
              Guardar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 flex-grow overflow-hidden">
          {showGemini && <GeminiIntegration setGeneratedContent={setGeneratedContent} />}

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="script">Guión</TabsTrigger>
              <TabsTrigger value="storyboard">Storyboard</TabsTrigger>
              <TabsTrigger value="settings">Configuración</TabsTrigger>
            </TabsList>
            <div className="flex-grow overflow-auto">
              <div className={activeTab === "script" ? "h-full" : "hidden"}>
                <ScriptEditor
                  projectId={params.id}
                  scenes={scenes}
                  onScenesChange={handleScenesChange}
                  activeSceneIndex={activeSceneIndex}
                  onActiveSceneIndexChange={handleActiveSceneIndexChange}
                  generatedContent={generatedContent}
                  setGeneratedContent={setGeneratedContent}
                  aiSuggestions={aiSuggestions}
                  onApplySuggestion={applySuggestion}
                />
              </div>
              <div className={activeTab === "storyboard" ? "h-full" : "hidden"}>
                <StoryboardContainer
                  projectId={params.id}
                  userId={userId || "anonymous"}
                  scenes={scenes}
                  setScenes={handleScenesChange} // StoryboardContainer también usa handleScenesChange
                  onScenesUpdate={handleScenesChange} // Asegurar que ambos props apunten a la misma función
                  activeSceneIndex={activeSceneIndex}
                  setActiveSceneIndex={handleActiveSceneIndexChange}
                />
              </div>
              <div className={activeTab === "settings" ? "h-full" : "hidden"}>
                <ProjectSettings projectId={params.id} projectTitle={projectTitle} setProjectTitle={setProjectTitle} />
              </div>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
