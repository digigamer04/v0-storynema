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
import { subscribeToProjectScenes } from "@/lib/realtime"

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

  const [scenes, setScenes] = useState([])
  const [activeSceneIndex, setActiveSceneIndex] = useState(0)
  const [storyboardData, setStoryboardData] = useState(null)

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

  // Usar useCallback para optimizar las funciones de actualización
  const handleScenesUpdate = useCallback(
    (updatedScenes) => {
      setScenes(updatedScenes)
      try {
        // Usar un prefijo único que incluya el ID del proyecto
        const storageKey = `storynema_scenes_${params.id}`
        localStorage.setItem(storageKey, JSON.stringify(updatedScenes))
        localStorage.setItem(`storynema_last_update_source_${params.id}`, "script_editor")
        localStorage.setItem(`storynema_last_update_time_${params.id}`, Date.now().toString())
      } catch (error) {
        console.error("Error saving scenes to localStorage:", error)
      }
    },
    [params.id],
  )

  const handleStoryboardScenesUpdate = useCallback(
    (updatedScenes) => {
      setScenes(updatedScenes)
      try {
        // Usar un prefijo único que incluya el ID del proyecto
        const storageKey = `storynema_scenes_${params.id}`
        localStorage.setItem(storageKey, JSON.stringify(updatedScenes))
        localStorage.setItem(`storynema_last_update_source_${params.id}`, "storyboard")
        localStorage.setItem(`storynema_last_update_time_${params.id}`, Date.now().toString())
      } catch (error) {
        console.error("Error saving scenes from storyboard to localStorage:", error)
      }
    },
    [params.id],
  )

  const handleSetActiveSceneIndex = useCallback((index: number) => {
    setActiveSceneIndex(index)
  }, [])

  const handleStoryboardDataUpdate = useCallback(
    (data) => {
      setStoryboardData(data)
      try {
        // Usar un prefijo único que incluya el ID del proyecto
        const storageKey = `storynema_storyboard_data_${params.id}`
        localStorage.setItem(storageKey, JSON.stringify(data))
      } catch (error) {
        console.error("Error saving storyboard data to localStorage:", error)
      }
    },
    [params.id],
  )

  // Modificar el useEffect que carga los datos del proyecto para cargar también desde localStorage si es necesario
  useEffect(() => {
    if (!userId) return

    const fetchProjectData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        console.log("Fetching project data for ID:", params.id)

        // Limpiar datos de localStorage de otros proyectos
        cleanupProjectData(params.id)

        const supabase = createClientSupabaseClient()
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("*")
          .eq("id", params.id)
          .single()

        if (projectError) {
          console.error("Project not found:", projectError)
          setError("Proyecto no encontrado")
          setIsLoading(false)
          return
        }

        if (projectData.user_id !== userId) {
          console.error("User does not own this project:", userId, projectData.user_id)
          setError("No tienes permiso para ver este proyecto")
          setIsLoading(false)
          return
        }

        console.log("Project data loaded:", projectData.title)
        setProjectTitle(projectData.title)

        let loadedScenes = null
        try {
          const savedScenes = localStorage.getItem(`storynema_scenes_${params.id}`)
          if (savedScenes) {
            loadedScenes = JSON.parse(savedScenes)
            console.log("Loaded scenes from localStorage:", loadedScenes.length)
          }
        } catch (error) {
          console.error("Error loading scenes from localStorage:", error)
        }

        if (!loadedScenes) {
          console.log("Fetching scenes for project:", params.id)
          const { data: scenesData, error: scenesError } = await supabase
            .from("scenes")
            .select("*")
            .eq("project_id", params.id)
            .order("order_index", { ascending: false })

          if (scenesError) {
            console.error("Error fetching scenes:", scenesError)
            setError(`Error al cargar las escenas: ${scenesError.message}`)
            setIsLoading(false)
            return
          }

          loadedScenes = scenesData
        }

        if (loadedScenes && loadedScenes.length > 0) {
          console.log("Using loaded scenes:", loadedScenes.length)
          setScenes(loadedScenes)
        } else {
          console.log("No scenes found, using temporary scene")

          const tempScene = {
            id: `temp-${Date.now()}`,
            title: "ESCENA 1 - NUEVA ESCENA",
            content: "",
            project_id: params.id,
            order_index: 0,
            is_temporary: true,
          }

          setScenes([tempScene])

          toast({
            title: "Escena temporal creada",
            description: "Estás trabajando con una escena temporal. Guarda el proyecto para persistir los cambios.",
            duration: 5000,
          })
        }

        setIsLoading(false)
      } catch (error: any) {
        console.error("Error loading project data:", error)
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
  }, [params.id, userId, router])

  // Subscribe to realtime updates for scenes
  useEffect(() => {
    if (!userId) return
    const unsubscribe = subscribeToProjectScenes(params.id, ({ eventType, scene }) => {
      setScenes((prev) => {
        if (eventType === "DELETE") {
          return prev.filter((s) => s.id !== scene.id)
        }
        const index = prev.findIndex((s) => s.id === scene.id)
        if (index === -1) {
          return [...prev, scene].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
        }
        const updated = [...prev]
        updated[index] = { ...updated[index], ...scene }
        return updated
      })
    })
    return () => {
      unsubscribe()
    }
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
      const supabase = createClientSupabaseClient()

      // Iterate through the scenes and update them in the database
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i]

        // Asegurarse de que order_index siempre tenga un valor válido
        const orderIndex = typeof scene.order_index === "number" ? scene.order_index : i

        // Si la escena es temporal, crear una nueva escena en la base de datos
        if (scene.is_temporary || scene.id.startsWith("temp-")) {
          console.log("Creating new scene from temporary scene:", scene.title, "with order_index:", orderIndex)

          const { data: newScene, error: newSceneError } = await supabase
            .from("scenes")
            .insert({
              project_id: params.id, // Asegurar que se use el ID del proyecto actual
              title: scene.title || "Nueva Escena",
              content: scene.content || "",
              order_index: orderIndex, // Usar el índice calculado
            })
            .select()
            .single()

          if (newSceneError) {
            console.error("Error creating scene:", newSceneError)
            toast({
              title: "Error al crear escena",
              description: newSceneError.message,
              variant: "destructive",
            })
            return
          }

          console.log("New scene created with ID:", newScene.id)

          // Update the local state with the new scene ID
          setScenes(scenes.map((s, idx) => (idx === i ? newScene : s)))
        } else {
          // Validate that scene.id is a valid UUID for non-temporary scenes
          if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(scene.id)) {
            console.error("Invalid scene ID:", scene.id)
            toast({
              title: "Error",
              description: `ID de escena inválido: ${scene.id}. Por favor, contacta al soporte.`,
              variant: "destructive",
            })
            return
          }

          // If the scene is not temporary, update the existing scene in the database
          console.log("Updating existing scene:", scene.id, "with order_index:", orderIndex)

          const { data: updatedScene, error: updateSceneError } = await supabase
            .from("scenes")
            .update({
              title: scene.title || "Escena sin título",
              content: scene.content || "",
              order_index: orderIndex, // Usar el índice calculado
            })
            .eq("id", scene.id)
            .select()
            .single()

          if (updateSceneError) {
            console.error("Error updating scene:", updateSceneError)
            toast({
              title: "Error al actualizar escena",
              description: updateSceneError.message,
              variant: "destructive",
            })
            return
          }
        }
      }

      // Actualizar el localStorage con los datos más recientes
      localStorage.setItem(`storynema_scenes_${params.id}`, JSON.stringify(scenes))
      localStorage.setItem(`storynema_last_update_time_${params.id}`, Date.now().toString())

      toast({
        title: "Proyecto guardado",
        description: "Los cambios han sido guardados exitosamente.",
      })
    } catch (error: any) {
      console.error("Error saving project:", error)
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
                  setScenes={handleScenesUpdate}
                  activeSceneIndex={activeSceneIndex}
                  setActiveSceneIndex={handleSetActiveSceneIndex}
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
                  setScenes={setScenes}
                  onScenesUpdate={handleScenesUpdate}
                  activeSceneIndex={activeSceneIndex}
                  setActiveSceneIndex={setActiveSceneIndex}
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
