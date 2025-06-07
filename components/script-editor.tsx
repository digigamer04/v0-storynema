"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BookOpen,
  Sparkles,
  Wand2,
  MessageSquare,
  PlusCircle,
  Trash2,
  FileText,
  Download,
  Maximize2,
  History,
  Bold,
  Italic,
  Underline,
  Undo,
  Redo,
  ChevronDown,
  Copy,
  Trash,
  Save,
  Check,
  MoreHorizontal,
  Eye,
  Edit,
  X,
  MoveUp,
  MoveDown,
  GripVertical,
  FlipVertical,
  Wifi,
  AlertCircle,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription, // Añadido DialogDescription
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu" // Añadido DropdownMenu
import { Alert, AlertDescription } from "@/components/ui/alert"

import MarkdownRenderer from "@/components/markdown-renderer"
import { updateScene, deleteScene as deleteSceneFromDB, reorderScenesInstant } from "@/lib/scenes"
import { toast } from "@/components/ui/use-toast"
import { authenticatedFetch, getUserClient } from "@/lib/auth"
import OfflineManager from "@/lib/offline-manager"

// Importar el logger
import { logger, DebugLoggerComponent } from "@/components/debug-logger"

interface ScriptEditorProps {
  projectId: string
  scenes: any[] // REQUERIDO: El padre DEBE pasar las escenas
  onScenesChange: (scenes: any[]) => void // REQUERIDO: Callback para notificar cambios de escenas
  activeSceneIndex: number // REQUERIDO: El padre DEBE controlar el índice activo
  onActiveSceneIndexChange: (index: number) => void // REQUERIDO: Callback para cambios de índice activo
  generatedContent?: string
  setGeneratedContent?: (content: string) => void
  aiSuggestions?: string[]
  onApplySuggestion?: (suggestion: string) => void
}

interface Version {
  id: number
  date: string
  description: string
  content: string
}

const StatusIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return (
    <Alert variant={isOnline ? "default" : "destructive"}>
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4" />
          <AlertDescription>Conectado</AlertDescription>
        </>
      ) : (
        <>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Sin conexión</AlertDescription>
        </>
      )}
    </Alert>
  )
}

export function ScriptEditor({
  projectId,
  scenes, // Directamente de props
  onScenesChange, // Directamente de props
  activeSceneIndex, // Directamente de props
  onActiveSceneIndexChange, // Directamente de props
  generatedContent,
  setGeneratedContent,
  aiSuggestions = [],
  onApplySuggestion,
}: ScriptEditorProps) {
  // Log inicial
  useEffect(() => {
    logger.info("ScriptEditor", "Componente inicializado (controlado)", {
      projectId,
      scenesLength: scenes?.length || 0,
      activeSceneIndex,
    })
  }, [projectId, scenes, activeSceneIndex])

  // Estados de conectividad y autenticación
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)

  // Derivar activeScene de las props (siempre usar props)
  const activeScene = scenes[activeSceneIndex] || {
    id: `fallback-${Date.now()}`, // ID único para fallback si no hay escena
    title: "Nueva Escena (Fallback)",
    content: "",
    project_id: projectId,
    order_index: activeSceneIndex,
  }

  const [history, setHistory] = useState<string[]>([activeScene?.content || ""])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiPrompt, setAiPrompt] = useState("")
  const [versions, setVersions] = useState<Version[]>([])
  const [isVersionsOpen, setIsVersionsOpen] = useState(false)
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null)
  const [showFormatToolbar, setShowFormatToolbar] = useState(false)
  const [selectionCoords, setSelectionCoords] = useState({ top: 0, left: 0 })
  const [selectedText, setSelectedText] = useState("")
  const [selectedRange, setSelectedRange] = useState({ start: 0, end: 0 })
  const [previewMode, setPreviewMode] = useState(true)
  const [newVersionName, setNewVersionName] = useState("")
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [editingVersionId, setEditingVersionId] = useState<number | null>(null)
  const [editingVersionName, setEditingVersionName] = useState("")
  const [isReordering, setIsReordering] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const offlineManager = OfflineManager.getInstance()

  // Verificar autenticación y conectividad al cargar
  useEffect(() => {
    const checkAuth = async () => {
      try {
        logger.debug("ScriptEditor", "Verificando autenticación...")
        const user = await getUserClient()
        setIsAuthenticated(!!user)
        logger.info("ScriptEditor", "Estado de autenticación", { isAuthenticated: !!user, userId: user?.id })
      } catch (error) {
        logger.error("ScriptEditor", "Error verificando autenticación", { error: error.message }, error)
        setIsAuthenticated(false)
      } finally {
        setAuthChecking(false)
      }
    }

    checkAuth()

    // Escuchar cambios de conectividad
    const handleOnline = () => {
      setIsOnline(true)
      logger.info("ScriptEditor", "Conexión restaurada")
    }
    const handleOffline = () => {
      setIsOnline(false)
      logger.warn("ScriptEditor", "Conexión perdida")
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Sincronizar historial y versiones cuando cambia la escena activa (basado en props)
  useEffect(() => {
    if (scenes[activeSceneIndex]) {
      logger.debug("ScriptEditor", "Sincronizando historial/versiones con nueva escena activa", {
        sceneId: scenes[activeSceneIndex].id,
        activeSceneIndex,
      })
      setHistory([scenes[activeSceneIndex].content || ""])
      setHistoryIndex(0)

      // Cargar versiones guardadas localmente para esta escena
      try {
        const savedVersions = localStorage.getItem(
          `storynema_versions_scene_${scenes[activeSceneIndex].id}_${projectId}`,
        )
        if (savedVersions) {
          setVersions(JSON.parse(savedVersions))
        } else {
          const initialVersion = {
            id: Date.now(),
            date: new Date().toLocaleString(),
            description: "Versión inicial",
            content: scenes[activeSceneIndex].content || "",
          }
          setVersions([initialVersion])
        }
      } catch (error) {
        console.error("Error loading versions from localStorage:", error)
        const initialVersion = {
          id: Date.now(),
          date: new Date().toLocaleString(),
          description: "Versión inicial",
          content: scenes[activeSceneIndex].content || "",
        }
        setVersions([initialVersion])
      }
    }
  }, [activeSceneIndex, scenes, projectId]) // Dependencias actualizadas

  // Función auxiliar para manejar operaciones que requieren autenticación
  const handleAuthenticatedOperation = async (operation: () => Promise<void>, fallback?: () => void) => {
    if (!isAuthenticated) {
      logger.warn("ScriptEditor", "Operación requiere autenticación")
      toast({
        title: "Se requiere autenticación",
        description: "Por favor, inicia sesión para guardar cambios.",
        variant: "destructive",
      })

      if (fallback) {
        fallback()
      }
      return
    }

    if (!isOnline) {
      logger.warn("ScriptEditor", "Operación sin conexión, usando fallback")
      if (fallback) {
        fallback()
      }
      toast({
        title: "Sin conexión",
        description: "Los cambios se guardarán cuando recuperes la conexión.",
        variant: "default",
      })
      return
    }

    try {
      logger.debug("ScriptEditor", "Ejecutando operación autenticada")
      await operation()
      logger.info("ScriptEditor", "Operación autenticada completada exitosamente")
    } catch (error) {
      logger.error("ScriptEditor", "Error en operación autenticada", { error: error.message }, error)

      if (fallback) {
        fallback()
      }

      toast({
        title: "Error al guardar",
        description: "Los cambios se guardarán localmente y se sincronizarán más tarde.",
        variant: "destructive",
      })
    }
  }

  const handleSceneContentChange = useCallback(
    (content: string) => {
      if (!activeScene) {
        logger.warn("ScriptEditor", "No hay escena activa para cambiar contenido")
        return
      }

      logger.debug("ScriptEditor", "Cambiando contenido de escena", {
        sceneId: activeScene.id,
        contentLength: content.length,
        activeSceneIndex,
      })

      const updatedScene = { ...activeScene, content }
      const updatedScenes = scenes.map((s, index) => (index === activeSceneIndex ? updatedScene : s))

      // Notificar al padre
      onScenesChange(updatedScenes)

      const newHistory = history.slice(0, historyIndex + 1)
      newHistory.push(content)
      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)

      // Intentar guardar en servidor con manejo de errores
      const saveToServer = async () => {
        logger.api("ScriptEditor", "Guardando contenido en servidor", { sceneId: activeScene.id })
        await updateScene(activeScene.id, { content })
        logger.api("ScriptEditor", "Contenido guardado exitosamente en servidor")
      }

      const saveOffline = () => {
        logger.warn("ScriptEditor", "Guardando contenido offline", { sceneId: activeScene.id })
        offlineManager.addPendingChange({
          type: "update",
          entity: "scene",
          data: { id: activeScene.id, content },
          projectId,
        })
      }

      handleAuthenticatedOperation(saveToServer, saveOffline)
    },
    [activeScene, activeSceneIndex, projectId, scenes, history, historyIndex, onScenesChange],
  )

  useEffect(() => {
    if (generatedContent && activeScene) {
      logger.info("ScriptEditor", "Aplicando contenido generado por IA", {
        sceneId: activeScene.id,
        generatedContentLength: generatedContent.length,
      })
      const updatedContent = activeScene.content + "\n\n" + generatedContent
      handleSceneContentChange(updatedContent)

      if (setGeneratedContent) {
        setGeneratedContent("")
      }
    }
  }, [generatedContent, activeScene, handleSceneContentChange, setGeneratedContent])

  const handleSceneTitleChange = async (title: string) => {
    logger.debug("ScriptEditor", "Cambiando título de escena", {
      sceneId: activeScene.id,
      oldTitle: activeScene.title,
      newTitle: title,
    })

    const updatedScene = { ...activeScene, title }
    const updatedScenes = scenes.map((s, index) => (index === activeSceneIndex ? updatedScene : s))

    // Notificar al padre
    onScenesChange(updatedScenes)

    // Auto-guardar en servidor instantáneamente
    const saveToServer = async () => {
      logger.api("ScriptEditor", "Guardando título en servidor", { sceneId: activeScene.id, title })
      await updateScene(activeScene.id, { title })
      logger.api("ScriptEditor", "Título guardado exitosamente en servidor")
    }

    const saveOffline = () => {
      logger.warn("ScriptEditor", "Guardando título offline", { sceneId: activeScene.id, title })
      offlineManager.addPendingChange({
        type: "update",
        entity: "scene",
        data: { id: activeScene.id, title },
        projectId,
      })
    }

    // Ejecutar auto-guardado si está autenticado y online
    if (isAuthenticated && isOnline) {
      saveToServer()
    } else {
      saveOffline()
    }
  }

  const moveSceneUp = async (index: number) => {
    if (index <= 0) {
      logger.warn("ScriptEditor", "No se puede mover escena hacia arriba", { index })
      return
    }

    logger.info("ScriptEditor", "Moviendo escena hacia arriba", { index, sceneId: scenes[index].id })

    const updatedScenes = [...scenes]
    const temp = updatedScenes[index]
    updatedScenes[index] = updatedScenes[index - 1]
    updatedScenes[index - 1] = temp

    // Reasignar order_index a todas las escenas en el nuevo array
    const scenesWithNewOrder = updatedScenes.map((scene, idx) => ({
      ...scene,
      order_index: idx,
    }))

    let newActiveIndex = activeSceneIndex
    if (activeSceneIndex === index) {
      newActiveIndex = index - 1
    } else if (activeSceneIndex === index - 1) {
      newActiveIndex = index
    }

    // Notificar al padre
    onScenesChange(scenesWithNewOrder)
    onActiveSceneIndexChange(newActiveIndex)

    // Auto-guardar instantáneamente
    const saveToServer = async () => {
      logger.api("ScriptEditor", "Guardando nuevo orden en servidor")
      const sceneIds = scenesWithNewOrder.map((scene) => scene.id)
      await reorderScenesInstant(projectId, sceneIds)
      logger.api("ScriptEditor", "Orden guardado exitosamente en servidor")
    }

    const saveOffline = () => {
      logger.warn("ScriptEditor", "Guardando orden offline")
      scenesWithNewOrder.forEach((scene, idx) => {
        offlineManager.addPendingChange({
          type: "update",
          entity: "scene",
          data: { id: scene.id, order_index: idx },
          projectId,
        })
      })
    }

    if (isAuthenticated && isOnline) {
      saveToServer()
    } else {
      saveOffline()
    }

    toast({
      title: "Orden actualizado",
      description: "El orden de las escenas ha sido actualizado automáticamente",
      duration: 2000,
    })
  }

  const moveSceneDown = async (index: number) => {
    if (index >= scenes.length - 1) {
      logger.warn("ScriptEditor", "No se puede mover escena hacia abajo", { index, totalScenes: scenes.length })
      return
    }

    logger.info("ScriptEditor", "Moviendo escena hacia abajo", { index, sceneId: scenes[index].id })

    const updatedScenes = [...scenes]
    const temp = updatedScenes[index]
    updatedScenes[index] = updatedScenes[index + 1]
    updatedScenes[index + 1] = temp

    // Reasignar order_index a todas las escenas en el nuevo array
    const scenesWithNewOrder = updatedScenes.map((scene, idx) => ({
      ...scene,
      order_index: idx,
    }))

    let newActiveIndex = activeSceneIndex
    if (activeSceneIndex === index) {
      newActiveIndex = index + 1
    } else if (activeSceneIndex === index + 1) {
      newActiveIndex = index
    }

    // Notificar al padre
    onScenesChange(scenesWithNewOrder)
    onActiveSceneIndexChange(newActiveIndex)

    // Auto-guardar instantáneamente
    const saveToServer = async () => {
      logger.api("ScriptEditor", "Guardando nuevo orden en servidor")
      const sceneIds = scenesWithNewOrder.map((scene) => scene.id)
      await reorderScenesInstant(projectId, sceneIds)
      logger.api("ScriptEditor", "Orden guardado exitosamente en servidor")
    }

    const saveOffline = () => {
      logger.warn("ScriptEditor", "Guardando orden offline")
      scenesWithNewOrder.forEach((scene, idx) => {
        offlineManager.addPendingChange({
          type: "update",
          entity: "scene",
          data: { id: scene.id, order_index: idx },
          projectId,
        })
      })
    }

    if (isAuthenticated && isOnline) {
      saveToServer()
    } else {
      saveOffline()
    }

    toast({
      title: "Orden actualizado",
      description: "El orden de las escenas ha sido actualizado automáticamente",
      duration: 2000,
    })
  }

  const deleteScene = async (sceneIdToDelete: string) => {
    if (scenes.length <= 1) {
      logger.warn("ScriptEditor", "No se puede eliminar la única escena restante")
      return
    }

    logger.info("ScriptEditor", "Eliminando escena", { sceneId: sceneIdToDelete, totalScenes: scenes.length })

    const updatedScenes = scenes.filter((s) => s.id !== sceneIdToDelete)
    // Reasignar order_index a las escenas restantes
    const scenesWithNewOrder = updatedScenes.map((scene, idx) => ({
      ...scene,
      order_index: idx,
    }))

    let newActiveIndex = activeSceneIndex
    if (activeScene.id === sceneIdToDelete) {
      newActiveIndex = Math.min(activeSceneIndex, scenesWithNewOrder.length - 1)
      setHistory([scenesWithNewOrder[newActiveIndex]?.content || ""])
      setHistoryIndex(0)

      const initialVersion = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        description: "Versión inicial",
        content: scenesWithNewOrder[newActiveIndex]?.content || "",
      }
      setVersions([initialVersion])
    } else if (scenes.findIndex((s) => s.id === sceneIdToDelete) < activeSceneIndex) {
      newActiveIndex = activeSceneIndex - 1
    }

    // Notificar al padre
    onScenesChange(scenesWithNewOrder)
    onActiveSceneIndexChange(newActiveIndex)

    // Auto-eliminar de la base de datos instantáneamente
    const deleteFromServer = async () => {
      logger.api("ScriptEditor", "Eliminando escena del servidor", { sceneId: sceneIdToDelete })
      await deleteSceneFromDB(sceneIdToDelete, projectId)
      logger.api("ScriptEditor", "Escena eliminada exitosamente del servidor")

      toast({
        title: "Escena eliminada",
        description: "La escena ha sido eliminada automáticamente",
        duration: 2000,
      })
    }

    const deleteOffline = () => {
      logger.warn("ScriptEditor", "Eliminando escena offline", { sceneId: sceneIdToDelete })
      offlineManager.addPendingChange({
        type: "delete",
        entity: "scene",
        data: { id: sceneIdToDelete },
        projectId,
      })

      toast({
        title: "Escena eliminada localmente",
        description: "Se eliminará del servidor cuando recuperes la conexión",
        duration: 3000,
      })
    }

    if (isAuthenticated && isOnline) {
      deleteFromServer()
    } else {
      deleteOffline()
    }
  }

  const reverseScenes = async () => {
    if (scenes.length <= 1) {
      logger.warn("ScriptEditor", "No se puede invertir orden con una sola escena")
      return
    }

    logger.info("ScriptEditor", "Invirtiendo orden de escenas", { totalScenes: scenes.length })

    setIsReordering(true)
    try {
      const reversedScenes = [...scenes].reverse()

      // Reasignar order_index a todas las escenas en el nuevo array
      const scenesWithNewOrder = reversedScenes.map((scene, idx) => ({
        ...scene,
        order_index: idx,
      }))

      let newActiveIndex = activeSceneIndex
      if (activeSceneIndex !== null && activeScene) {
        const activeSceneId = activeScene.id
        const newIndex = scenesWithNewOrder.findIndex((scene) => scene.id === activeSceneId)
        if (newIndex !== -1) {
          newActiveIndex = newIndex
        }
      }

      // Notificar al padre
      onScenesChange(scenesWithNewOrder)
      onActiveSceneIndexChange(newActiveIndex)

      // Auto-guardar instantáneamente
      const saveToServer = async () => {
        logger.api("ScriptEditor", "Guardando orden invertido en servidor")
        const sceneIds = scenesWithNewOrder.map((scene) => scene.id)
        await reorderScenesInstant(projectId, sceneIds)
        logger.api("ScriptEditor", "Orden invertido guardado exitosamente en servidor")

        toast({
          title: "Orden invertido",
          description: "El orden de las escenas ha sido invertido y guardado automáticamente",
          duration: 2000,
        })
      }

      const saveOffline = () => {
        logger.warn("ScriptEditor", "Guardando orden invertido offline")
        scenesWithNewOrder.forEach((scene, index) => {
          offlineManager.addPendingChange({
            type: "update",
            entity: "scene",
            data: { id: scene.id, order_index: index },
            projectId,
          })
        })

        toast({
          title: "Orden invertido localmente",
          description: "Se guardará en el servidor cuando recuperes la conexión",
          duration: 3000,
        })
      }

      if (isAuthenticated && isOnline) {
        saveToServer()
      } else {
        saveOffline()
      }
    } catch (error) {
      logger.error("ScriptEditor", "Error al invertir orden de escenas", { error: error.message }, error)
      toast({
        title: "Error",
        description: "No se pudo invertir el orden de las escenas. Inténtalo de nuevo.",
        variant: "destructive",
        duration: 4000,
      })
    } finally {
      setIsReordering(false)
    }
  }

  const addNewScene = async () => {
    if (!isAuthenticated) {
      logger.warn("ScriptEditor", "Intento de crear escena sin autenticación")
      toast({
        title: "Se requiere autenticación",
        description: "Por favor, inicia sesión para crear nuevas escenas.",
        variant: "destructive",
      })
      return
    }

    logger.info("ScriptEditor", "Creando nueva escena", { currentScenesCount: scenes.length })

    try {
      toast({
        title: "Creando nueva escena...",
        description: "Por favor, espera un momento.",
      })

      let newSceneData

      if (isOnline) {
        // Intentar crear en servidor
        logger.api("ScriptEditor", "Creando escena en servidor")
        const response = await authenticatedFetch(`/api/projects/${projectId}/scenes`, {
          method: "POST",
          body: JSON.stringify({
            title: `ESCENA ${scenes.length + 1} - NUEVA ESCENA`,
            order_index: scenes.length, // Asignar order_index basado en la longitud actual
          }),
        })

        if (!response.ok) {
          throw new Error("No se pudo crear la escena en el servidor.")
        }

        newSceneData = await response.json()
        logger.api("ScriptEditor", "Escena creada exitosamente en servidor", { sceneId: newSceneData.id })
      } else {
        // Crear escena temporal offline
        newSceneData = {
          id: `temp-${Date.now()}`,
          project_id: projectId,
          title: `ESCENA ${scenes.length + 1} - NUEVA ESCENA (Offline)`,
          content: "",
          order_index: scenes.length, // Asignar order_index
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_temporary: true, // Marcar como temporal
        }

        logger.warn("ScriptEditor", "Creando escena offline", { tempId: newSceneData.id })

        // Añadir a la cola de sincronización
        offlineManager.addPendingChange({
          type: "create",
          entity: "scene",
          data: newSceneData,
          projectId,
        })
      }

      // Actualizar el estado del padre
      const updatedScenes = [...scenes, newSceneData]
      const newActiveIndex = updatedScenes.length - 1

      onScenesChange(updatedScenes)
      onActiveSceneIndexChange(newActiveIndex)

      // Reiniciar el historial para la nueva escena
      setHistory([""])
      setHistoryIndex(0)

      // Inicializar versiones para la nueva escena
      const initialVersion = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        description: "Versión inicial",
        content: "",
      }
      setVersions([initialVersion])

      toast({
        title: "Escena creada",
        description: isOnline
          ? "La nueva escena se ha guardado correctamente."
          : "Escena creada offline. Se sincronizará cuando recuperes la conexión.",
      })
    } catch (error) {
      logger.error("ScriptEditor", "Error creando nueva escena", { error: error.message }, error)
      toast({
        title: "Error al crear escena",
        description: "No se pudo crear la escena. Inténtalo de nuevo.",
        variant: "destructive",
      })
    }
  }

  const generateWithAI = () => {
    logger.info("ScriptEditor", "Iniciando generación con IA")
    setIsGenerating(true)
    setTimeout(() => {
      const updatedContent =
        activeScene.content +
        "\n\n" +
        "MARÍA\n(con tono conciliador)\nEntiendo. Pero necesitamos esos informes para presentarlos al cliente.\n\n" +
        "JUAN\nLos tengo aquí mismo. Trabajé toda la noche para terminarlos.\n\n" +
        "María sonríe, sorprendida por la dedicación de Juan a pesar de su tardanza."

      // Usar handleSceneContentChange para actualizar y notificar al padre
      handleSceneContentChange(updatedContent)

      setIsGenerating(false)

      const newVersion = {
        id: versions.length + 1,
        date: "Ahora mismo",
        description: "Generación con IA: Ampliación de diálogo",
        content: updatedContent,
      }
      setVersions([newVersion, ...versions])

      logger.info("ScriptEditor", "Generación con IA completada")
    }, 2000)
  }

  const exportToPDF = () => {
    logger.info("ScriptEditor", "Exportando a PDF")
    alert("Guion exportado a PDF correctamente")
  }

  const getFullScript = () => {
    return scenes.map((scene) => `${scene.title}\n\n${scene.content || ""}\n\n`).join("\n")
  }

  const handleUndo = () => {
    if (historyIndex > 0 && activeScene) {
      logger.debug("ScriptEditor", "Deshaciendo cambio", { currentIndex: historyIndex })
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      const previousContent = history[newIndex]

      // Actualizar el contenido de la escena activa y notificar al padre
      const updatedScene = { ...activeScene, content: previousContent }
      const updatedScenes = scenes.map((s, i) => (i === activeSceneIndex ? updatedScene : s))
      onScenesChange(updatedScenes)
    }
  }

  const handleRedo = () => {
    if (historyIndex < history.length - 1 && activeScene) {
      logger.debug("ScriptEditor", "Rehaciendo cambio", { currentIndex: historyIndex })
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      const nextContent = history[newIndex]

      // Actualizar el contenido de la escena activa y notificar al padre
      const updatedScene = { ...activeScene, content: nextContent }
      const updatedScenes = scenes.map((s, i) => (i === activeSceneIndex ? updatedScene : s))
      onScenesChange(updatedScenes)
    }
  }

  const applyTextFormat = (format: string) => {
    if (!textareaRef.current || !activeScene) return

    logger.debug("ScriptEditor", "Aplicando formato de texto", { format })

    const start = selectedRange.start
    const end = selectedRange.end
    const selectedText = activeScene.content.substring(start, end)
    let newContent = activeScene.content
    let cursorOffset = 0

    switch (format) {
      case "bold":
        newContent = newContent.substring(0, start) + `**${selectedText}**` + newContent.substring(end)
        cursorOffset = 4
        break
      case "italic":
        newContent = newContent.substring(0, start) + `_${selectedText}_` + newContent.substring(end)
        cursorOffset = 2
        break
      case "underline":
        newContent = newContent.substring(0, start) + `__${selectedText}__` + newContent.substring(end)
        cursorOffset = 4
        break
      case "uppercase":
        newContent = newContent.substring(0, start) + selectedText.toUpperCase() + newContent.substring(end)
        break
      case "lowercase":
        newContent = newContent.substring(0, start) + selectedText.toLowerCase() + newContent.substring(end)
        break
      case "capitalize":
        newContent =
          newContent.substring(0, start) +
          selectedText
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ") +
          newContent.substring(end)
        break
      case "character":
        newContent = newContent.substring(0, start) + `${selectedText.toUpperCase()}\n` + newContent.substring(end)
        cursorOffset = 1
        break
      case "dialogue":
        newContent = newContent.substring(0, start) + `\n${selectedText}\n` + newContent.substring(end)
        cursorOffset = 2
        break
      case "parenthetical":
        newContent = newContent.substring(0, start) + `(${selectedText})` + newContent.substring(end)
        cursorOffset = 2
        break
      case "scene-heading":
        newContent = newContent.substring(0, start) + `${selectedText.toUpperCase()}` + newContent.substring(end)
        break
    }

    handleSceneContentChange(newContent) // Esto notificará al padre y guardará
    setShowFormatToolbar(false)

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(start, end + cursorOffset)
      }
    }, 0)
  }

  const startEditingVersionName = (version: Version) => {
    setEditingVersionId(version.id)
    setEditingVersionName(version.description)
  }

  const saveVersionName = (versionId: number) => {
    if (editingVersionName.trim()) {
      const updatedVersions = versions.map((v) => (v.id === versionId ? { ...v, description: editingVersionName } : v))
      setVersions(updatedVersions)

      try {
        localStorage.setItem(`storynema_versions_scene_${activeScene.id}_${projectId}`, JSON.stringify(updatedVersions))
      } catch (error) {
        console.error("Error saving versions to localStorage:", error)
      }

      setEditingVersionId(null)
      setEditingVersionName("")
    }
  }

  const cancelEditingVersionName = () => {
    setEditingVersionId(null)
    setEditingVersionName("")
  }

  const saveCurrentVersion = (description: string) => {
    const newVersion = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      description,
      content: activeScene.content,
    }

    let updatedVersions = [newVersion, ...versions]
    if (updatedVersions.length > 10) {
      updatedVersions = updatedVersions.slice(0, 10)
    }

    setVersions(updatedVersions)

    try {
      localStorage.setItem(`storynema_versions_scene_${activeScene.id}_${projectId}`, JSON.stringify(updatedVersions))
    } catch (error) {
      console.error("Error saving versions to localStorage:", error)
    }
  }

  const loadVersion = (version: Version) => {
    handleSceneContentChange(version.content) // Esto actualiza la escena activa y notifica al padre

    const newHistory = [...history.slice(0, historyIndex + 1), version.content]
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)

    alert(`Versión "${version.description}" cargada correctamente`)
  }

  const duplicateVersion = (version: Version) => {
    const newVersion = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      description: `Copia de: ${version.description}`,
      content: version.content,
    }

    let updatedVersions = [newVersion, ...versions]
    if (updatedVersions.length > 10) {
      updatedVersions = updatedVersions.slice(0, 10)
    }

    setVersions(updatedVersions)

    try {
      localStorage.setItem(`storynema_versions_scene_${activeScene.id}_${projectId}`, JSON.stringify(updatedVersions))
    } catch (error) {
      console.error("Error saving versions to localStorage:", error)
    }

    alert(`Versión "${version.description}" duplicada correctamente`)
  }

  const deleteVersion = (versionId: number) => {
    if (versions.length <= 1) return

    const updatedVersions = versions.filter((v) => v.id !== versionId)
    setVersions(updatedVersions)

    try {
      localStorage.setItem(`storynema_versions_scene_${activeScene.id}_${projectId}`, JSON.stringify(updatedVersions))
    } catch (error) {
      console.error("Error saving versions to localStorage:", error)
    }

    alert(`Versión eliminada correctamente`)
  }

  const FloatingToolbar = () => {
    if (!showFormatToolbar) return null

    const style = {
      position: "absolute" as const,
      top: `${selectionCoords.top - 40}px`,
      left: `${selectionCoords.left}px`,
      zIndex: 100,
      transform: "translateX(-50%)",
    }

    return (
      <div
        style={style}
        className="bg-[#2A2A2A] border border-[#444444] rounded-md shadow-lg p-1 flex items-center gap-1 transition-all duration-200"
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-300 hover:text-white hover:bg-[#3A3A3A]"
          onClick={() => applyTextFormat("bold")}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-300 hover:text-white hover:bg-[#3A3A3A]"
          onClick={() => applyTextFormat("italic")}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-300 hover:text-white hover:bg-[#3A3A3A]"
          onClick={() => applyTextFormat("underline")}
        >
          <Underline className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-[#444444]"></div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-gray-300 hover:text-white hover:bg-[#3A3A3A]"
          onClick={() => applyTextFormat("uppercase")}
        >
          ABC
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-gray-300 hover:text-white hover:bg-[#3A3A3A]"
          onClick={() => applyTextFormat("lowercase")}
        >
          abc
        </Button>
        <div className="w-px h-6 bg-[#444444]"></div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-gray-300 hover:text-white hover:bg-[#3A3A3A]"
          onClick={() => applyTextFormat("character")}
        >
          PERSONAJE
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-gray-300 hover:text-white hover:bg-[#3A3A3A]"
          onClick={() => applyTextFormat("parenthetical")}
        >
          (acotación)
        </Button>
      </div>
    )
  }

  const SaveVersionDialog = () => (
    <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
      <DialogContent className="bg-[#1E1E1E] border-[#333333] text-gray-200">
        <DialogHeader>
          <DialogTitle>Guardar versión</DialogTitle>
          <DialogDescription className="text-gray-400">Añade un nombre descriptivo para esta versión</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="version-name" className="block mb-2">
            Nombre de la versión
          </Label>
          <Input
            id="version-name"
            value={newVersionName}
            onChange={(e) => setNewVersionName(e.target.value)}
            placeholder="Ej: Revisión de diálogos"
            className="bg-[#2A2A2A] border-[#444444] text-gray-200"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && newVersionName.trim()) {
                saveCurrentVersion(newVersionName)
                setNewVersionName("")
                setShowSaveDialog(false)
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setShowSaveDialog(false)}
            className="bg-[#2A2A2A] border-[#444444] text-gray-200 hover:bg-[#3A3A3A]"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (newVersionName.trim()) {
                saveCurrentVersion(newVersionName)
                setNewVersionName("")
                setShowSaveDialog(false)
              }
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white"
            disabled={!newVersionName.trim()}
          >
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )

  // En handleSceneChange, cambiar para usar la función apropiada:
  const handleSceneChange = (sceneId: string) => {
    const newIndex = scenes.findIndex((scene) => scene.id === sceneId)
    if (newIndex !== -1 && newIndex !== activeSceneIndex) {
      logger.info("ScriptEditor", "Cambiando escena activa", {
        oldIndex: activeSceneIndex,
        newIndex,
        oldSceneId: activeScene.id,
        newSceneId: sceneId,
      })

      onActiveSceneIndexChange(newIndex) // Notificar al padre
    }
  }

  if (!scenes || scenes.length === 0) {
    return (
      <div className="space-y-4">
        <StatusIndicator />
        <DebugLoggerComponent />
        <div className="flex flex-col items-center justify-center h-64 gap-4 bg-[#252525] border border-[#333333] rounded-md p-6">
          <p className="text-gray-400 mb-4">No hay escenas disponibles. Crea una nueva para comenzar.</p>
          <div className="flex gap-4">
            <Button
              onClick={addNewScene}
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={!isAuthenticated}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Escribir nueva escena
            </Button>
            <Button
              variant="outline"
              className="bg-[#2A2A2A] border-[#444444] text-gray-200 hover:bg-[#3A3A3A]"
              onClick={() => {
                addNewScene()
                if (setGeneratedContent) {
                  setGeneratedContent(
                    "ESCENA 1 - INTERIOR. OFICINA - DÍA\n\nUna oficina moderna y minimalista. JUAN (35) está sentado frente a su computadora, concentrado en su trabajo.",
                  )
                }
              }}
              disabled={!isAuthenticated}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Crear con IA
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const handleSelectVersion = (versionId: number) => {
    setSelectedVersionId(versionId)
  }

  return (
    <div className="space-y-4">
      <StatusIndicator />
      <DebugLoggerComponent />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <Card className="bg-[#1E1E1E] border-[#333333]">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-gray-200">Escenas</h3>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={reverseScenes}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                    title="Invertir orden de escenas"
                  >
                    <FlipVertical className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsReordering(!isReordering)}
                    className={`h-8 w-8 p-0 ${isReordering ? "text-amber-500" : "text-gray-400 hover:text-white"}`}
                    title={isReordering ? "Finalizar reordenamiento" : "Reordenar escenas"}
                  >
                    <GripVertical className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={addNewScene}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                    title="Añadir nueva escena"
                    disabled={!isAuthenticated}
                  >
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {scenes.map((scene, index) => (
                  <div
                    key={scene.id}
                    className={`p-2 rounded-md cursor-pointer flex justify-between items-center ${
                      activeScene.id === scene.id ? "bg-[#3A3A3A]" : "hover:bg-[#2A2A2A]"
                    }`}
                    onClick={() => handleSceneChange(scene.id)}
                  >
                    <div className="truncate text-sm text-gray-200 flex-grow">
                      {scene.title.length > 30 ? scene.title.substring(0, 30) + "..." : scene.title}
                    </div>
                    <div className="flex items-center">
                      {isReordering && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              moveSceneUp(index)
                            }}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                            disabled={index === 0}
                            title="Mover arriba"
                          >
                            <MoveUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              moveSceneDown(index)
                            }}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                            disabled={index === scenes.length - 1}
                            title="Mover abajo"
                          >
                            <MoveDown className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      {scenes.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteScene(scene.id)
                          }}
                          className="h-6 w-6 p-0 opacity-50 hover:opacity-100 text-gray-400 hover:text-red-400"
                          title="Eliminar escena"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4 bg-[#1E1E1E] border-[#333333]">
            <CardContent className="p-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Button
                    variant="ghost"
                    className="flex items-center justify-between w-full p-0 text-gray-200 hover:bg-transparent hover:text-white"
                    onClick={() => setIsVersionsOpen(!isVersionsOpen)}
                  >
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">Historial de versiones</span>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${isVersionsOpen ? "transform rotate-180" : ""}`}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSaveDialog(true)}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </div>

                {isVersionsOpen && (
                  <div className="space-y-2 mt-2">
                    {versions.map((version) => (
                      <div
                        key={version.id}
                        className={`p-2 rounded-md bg-[#252525] border border-[#333333] cursor-pointer ${
                          selectedVersionId === version.id ? "border-amber-500" : ""
                        }`}
                        onClick={() => handleSelectVersion(version.id)}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-400">{version.date}</span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-[#2A2A2A] border-[#444444] text-gray-200">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  loadVersion(version)
                                }}
                                className="cursor-pointer hover:bg-[#3A3A3A]"
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Cargar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  startEditingVersionName(version)
                                }}
                                className="cursor-pointer hover:bg-[#3A3A3A]"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Renombrar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  duplicateVersion(version)
                                }}
                                className="cursor-pointer hover:bg-[#3A3A3A]"
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicar
                              </DropdownMenuItem>
                              {versions.length > 1 && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteVersion(version.id)
                                  }}
                                  className="cursor-pointer text-red-400 hover:bg-[#3A3A3A] hover:text-red-300"
                                >
                                  <Trash className="h-4 w-4 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {editingVersionId === version.id ? (
                          <div className="flex gap-2 mt-1">
                            <Input
                              value={editingVersionName}
                              onChange={(e) => setEditingVersionName(e.target.value)}
                              className="bg-[#2A2A2A] border-[#444444] text-gray-200 text-sm"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  saveVersionName(version.id)
                                } else if (e.key === "Escape") {
                                  cancelEditingVersionName()
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                saveVersionName(version.id)
                              }}
                              className="bg-amber-600 hover:bg-amber-700 text-white"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                cancelEditingVersionName()
                              }}
                              className="bg-[#2A2A2A] border-[#444444] text-gray-200"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-300">{version.description}</div>
                        )}
                        {selectedVersionId === version.id && !editingVersionId && (
                          <div className="mt-2 flex justify-end">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                loadVersion(version)
                              }}
                              className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
                            >
                              Cargar esta versión
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <SaveVersionDialog />
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3">
          <Card className="bg-[#1E1E1E] border-[#333333]">
            <CardContent className="p-4">
              <Tabs defaultValue="editor">
                <div className="flex justify-between items-center mb-4">
                  <TabsList className="bg-[#2A2A2A]">
                    <TabsTrigger
                      value="editor"
                      className="flex items-center gap-1 data-[state=active]:bg-[#3A3A3A] text-gray-300"
                    >
                      <BookOpen className="h-4 w-4" />
                      Editor
                    </TabsTrigger>
                    <TabsTrigger
                      value="full-script"
                      className="flex items-center gap-1 data-[state=active]:bg-[#3A3A3A] text-gray-300"
                    >
                      <FileText className="h-4 w-4" />
                      Guion completo
                    </TabsTrigger>
                    <TabsTrigger
                      value="ai-assist"
                      className="flex items-center gap-1 data-[state=active]:bg-[#3A3A3A] text-gray-300"
                    >
                      <Sparkles className="h-4 w-4" />
                      Asistente IA
                    </TabsTrigger>
                    <TabsTrigger
                      value="comments"
                      className="flex items-center gap-1 data-[state=active]:bg-[#3A3A3A] text-gray-300"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Comentarios
                    </TabsTrigger>
                  </TabsList>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 bg-[#2A2A2A] border-[#444444] text-gray-200 hover:bg-[#3A3A3A]"
                      onClick={exportToPDF}
                    >
                      <Download className="h-4 w-4" />
                      Exportar
                    </Button>
                  </div>
                </div>

                <TabsContent value="editor" className="space-y-4 relative">
                  <div>
                    <Label htmlFor="scene-title" className="text-gray-300">
                      Título de la escena
                    </Label>
                    <Input
                      id="scene-title"
                      value={activeScene.title}
                      onChange={(e) => handleSceneTitleChange(e.target.value)}
                      className="bg-[#2A2A2A] border-[#444444] text-gray-200"
                      disabled={!isAuthenticated}
                    />
                  </div>

                  <div className="flex justify-between items-center p-2 border rounded-md bg-[#2A2A2A] border-[#444444]">
                    <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-300 hover:text-white hover:bg-[#3A3A3A]"
                              onClick={handleUndo}
                              disabled={historyIndex <= 0}
                            >
                              <Undo className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Deshacer</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-300 hover:text-white hover:bg-[#3A3A3A]"
                              onClick={handleRedo}
                              disabled={historyIndex >= history.length - 1}
                            >
                              <Redo className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Rehacer</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <div className="h-6 w-px bg-[#444444] mx-1"></div>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-300 hover:text-white hover:bg-[#3A3A3A]"
                              onClick={() => setPreviewMode(!previewMode)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Vista previa</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    <div className="text-xs text-gray-400">
                      {!isAuthenticated
                        ? "Modo solo lectura - Inicia sesión para editar"
                        : "Selecciona texto para ver opciones de formato"}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="scene-content" className="text-gray-300">
                      Contenido
                    </Label>
                    <div className="relative">
                      {previewMode ? (
                        <div className="min-h-[400px] p-4 font-mono bg-[#2A2A2A] border border-[#444444] rounded-md text-gray-200 overflow-auto">
                          <MarkdownRenderer content={activeScene.content} />
                        </div>
                      ) : (
                        <Textarea
                          id="scene-content"
                          value={activeScene.content}
                          onChange={(e) => handleSceneContentChange(e.target.value)}
                          ref={textareaRef}
                          className="min-h-[400px] font-mono bg-[#2A2A2A] border-[#444444] text-gray-200"
                          placeholder="Escribe aquí el contenido de tu escena..."
                          disabled={!isAuthenticated}
                        />
                      )}
                      <FloatingToolbar />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="full-script">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-gray-200">Guion completo</h3>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="bg-[#2A2A2A] border-[#444444] text-gray-200 hover:bg-[#3A3A3A]"
                        >
                          <Maximize2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl h-[80vh] bg-[#1E1E1E] border-[#333333]">
                        <DialogHeader>
                          <DialogTitle className="text-gray-200">Guion completo</DialogTitle>
                          <DialogDescription className="text-gray-400">
                            Vista completa del guion para lectura
                          </DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="h-full pr-4">
                          <div className="font-mono whitespace-pre-wrap p-4 text-gray-200">
                            <MarkdownRenderer content={getFullScript()} />
                          </div>
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <ScrollArea className="h-[500px] pr-4 border rounded-md bg-[#2A2A2A] border-[#444444]">
                    <div className="font-mono whitespace-pre-wrap p-4 text-gray-200">
                      <MarkdownRenderer content={getFullScript()} />
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="ai-assist" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">Modelo de IA</Label>
                      <Select defaultValue="gemini-2.0-flash-001" disabled={!isAuthenticated || !isOnline}>
                        <SelectTrigger className="bg-[#2A2A2A] border-[#444444] text-gray-200">
                          <SelectValue placeholder="Seleccionar modelo" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#2A2A2A] border-[#444444] text-gray-200">
                          <SelectItem value="gemini-2.0-flash-001">Google Gemini 2.0 Flash</SelectItem>
                          <SelectItem value="gemini-pro">Google Gemini Pro</SelectItem>
                          <SelectItem value="gpt4">OpenAI GPT-4</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-gray-300">Género</Label>
                      <Select defaultValue="drama" disabled={!isAuthenticated || !isOnline}>
                        <SelectTrigger className="bg-[#2A2A2A] border-[#444444] text-gray-200">
                          <SelectValue placeholder="Seleccionar género" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#2A2A2A] border-[#444444] text-gray-200">
                          <SelectItem value="drama">Drama</SelectItem>
                          <SelectItem value="comedy">Comedia</SelectItem>
                          <SelectItem value="thriller">Thriller</SelectItem>
                          <SelectItem value="scifi">Ciencia Ficción</SelectItem>
                          <SelectItem value="romance">Romance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-300">Instrucciones para la IA</Label>
                    <Textarea
                      id="ai-prompt"
                      placeholder="Describe lo que quieres que la IA genere o modifique..."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="min-h-[100px] bg-[#2A2A2A] border-[#444444] text-gray-200 placeholder:text-gray-500"
                      disabled={!isAuthenticated || !isOnline}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Sugerencias de la IA</Label>
                    <div className="space-y-2">
                      {aiSuggestions.map((suggestion, index) => (
                        <Card
                          key={index}
                          className="p-3 hover:bg-[#2A2A2A] cursor-pointer bg-[#252525] border-[#444444] text-gray-200"
                          onClick={() => onApplySuggestion && onApplySuggestion(suggestion)}
                        >
                          <p className="text-sm">{suggestion}</p>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <Button
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={generateWithAI}
                    disabled={isGenerating || !isAuthenticated || !isOnline}
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    {isGenerating ? "Generando..." : "Generar con IA"}
                  </Button>
                </TabsContent>

                <TabsContent value="comments" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#3A3A3A] flex items-center justify-center text-xs font-medium text-gray-200">
                        CR
                      </div>
                      <div className="flex-1">
                        <div className="bg-[#2A2A2A] p-3 rounded-lg">
                          <p className="text-sm font-medium mb-1 text-gray-200">Carlos Rodríguez</p>
                          <p className="text-sm text-gray-300">
                            Creo que podríamos hacer que Juan llegue aún más tarde para aumentar la tensión en la escena
                            de la oficina.
                          </p>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Hace 2 horas</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#3A3A3A] flex items-center justify-center text-xs font-medium text-gray-200">
                        AL
                      </div>
                      <div className="flex-1">
                        <div className="bg-[#2A2A2A] p-3 rounded-lg">
                          <p className="text-sm font-medium mb-1 text-gray-200">Ana López</p>
                          <p className="text-sm text-gray-300">
                            ¿Y si añadimos que María está esperando unos documentos importantes que Juan debía traer?
                          </p>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Ayer</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Textarea
                      placeholder="Añadir un comentario..."
                      className="min-h-[80px] bg-[#2A2A2A] border-[#444444] text-gray-200 placeholder:text-gray-500"
                      disabled={!isAuthenticated}
                    />
                  </div>
                  <Button className="bg-amber-600 hover:bg-amber-700 text-white" disabled={!isAuthenticated}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Enviar comentario
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default ScriptEditor
