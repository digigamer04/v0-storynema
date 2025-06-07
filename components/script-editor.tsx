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
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

// Importar el componente MarkdownRenderer
import MarkdownRenderer from "@/components/markdown-renderer"
import { updateScene, reorderScenes } from "@/lib/scenes"
import { toast } from "@/components/ui/use-toast"

// Importar el administrador de estado
import { saveScenes } from "@/lib/state-manager"

interface ScriptEditorProps {
  projectId: string
  scenes?: any[]
  setScenes?: (scenes: any[]) => void
  activeSceneIndex?: number
  setActiveSceneIndex?: (index: number) => void
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

export function ScriptEditor({
  projectId,
  scenes: externalScenes,
  setScenes: setExternalScenes,
  activeSceneIndex: externalActiveSceneIndex,
  setActiveSceneIndex: setExternalActiveSceneIndex,
  generatedContent,
  setGeneratedContent,
  aiSuggestions = [],
  onApplySuggestion,
}: ScriptEditorProps) {
  // Usar los estados externos si están disponibles, o los internos si no
  const [internalScenes, setInternalScenes] = useState([
    {
      id: "1",
      title: "ESCENA 1 - NUEVA ESCENA",
      content: "",
    },
  ])
  const [internalActiveSceneIndex, setInternalActiveSceneIndex] = useState(0)

  const scenesArray = externalScenes || internalScenes
  const setScenesArray = setExternalScenes || setInternalScenes
  const activeSceneIdx = externalActiveSceneIndex !== undefined ? externalActiveSceneIndex : internalActiveSceneIndex
  const setActiveSceneIdx = setExternalActiveSceneIndex || setInternalActiveSceneIndex

  const activeScene = scenesArray[activeSceneIdx] || {
    id: "new",
    title: "Nueva escena",
    content: "",
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
  const [previewMode, setPreviewMode] = useState(true) // Siempre activado para renderizar Markdown
  const [newVersionName, setNewVersionName] = useState("")
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [editingVersionId, setEditingVersionId] = useState<number | null>(null)
  const [editingVersionName, setEditingVersionName] = useState("")
  const [isReordering, setIsReordering] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const selectionCheckInterval = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (externalScenes) {
      const sortedScenes = [...externalScenes].sort((a, b) => {
        if (a.order_index !== undefined && b.order_index !== undefined) {
          return a.order_index - b.order_index
        }
        return 0
      })

      const currentIds = internalScenes.map((scene) => scene.id).join(",")
      const newIds = sortedScenes.map((scene) => scene.id).join(",")

      if (currentIds !== newIds || JSON.stringify(internalScenes) !== JSON.stringify(sortedScenes)) {
        console.log("Actualizando escenas desde props externos")
        setInternalScenes(sortedScenes)
      }
    }
  }, [externalScenes, internalScenes])

  useEffect(() => {
    if (externalActiveSceneIndex !== undefined) {
      setInternalActiveSceneIndex(externalActiveSceneIndex)
    }
  }, [externalActiveSceneIndex])

  const handleSceneContentChange = useCallback(
    (content: string) => {
      if (!activeScene) return

      const updatedScene = { ...activeScene, content }
      const updatedScenes = [...scenesArray]
      updatedScenes[activeSceneIdx] = updatedScene
      setScenesArray(updatedScenes)

      saveScenes(projectId, updatedScenes)

      const newHistory = history.slice(0, historyIndex + 1)
      newHistory.push(content)
      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)

      updateScene(activeScene.id, { content }).catch((error) => console.error("Error updating scene content:", error))
    },
    [activeScene, activeSceneIdx, projectId, scenesArray, setScenesArray, history, historyIndex],
  )

  useEffect(() => {
    if (generatedContent && activeScene) {
      const updatedContent = activeScene.content + "\n\n" + generatedContent
      handleSceneContentChange(updatedContent)

      if (setGeneratedContent) {
        setGeneratedContent("")
      }
    }
  }, [generatedContent, activeScene, handleSceneContentChange, setGeneratedContent])

  const handleSceneTitleChange = (title: string) => {
    const updatedScene = { ...activeScene, title }
    const updatedScenes = [...scenesArray]
    updatedScenes[activeSceneIdx] = updatedScene
    setScenesArray(updatedScenes)

    saveScenes(projectId, updatedScenes)

    updateScene(activeScene.id, { title }).catch((error) => console.error("Error updating scene title:", error))
  }

  const handleSceneChange = (sceneId: string) => {
    if (activeScene.id === sceneId) {
      return
    }

    const newIndex = scenesArray.findIndex((scene) => scene.id === sceneId)
    if (newIndex !== -1) {
      setActiveSceneIdx(newIndex)

      setHistory([scenesArray[newIndex].content])
      setHistoryIndex(0)

      try {
        const savedVersions = localStorage.getItem(`storynema_versions_scene_${sceneId}_${projectId}`)
        if (savedVersions) {
          const parsedVersions = JSON.parse(savedVersions)
          setVersions(parsedVersions)
        } else {
          const initialVersion = {
            id: Date.now(),
            date: new Date().toLocaleString(),
            description: "Versión inicial",
            content: scenesArray[newIndex].content,
          }
          setVersions([initialVersion])
        }
      } catch (error) {
        console.error("Error loading versions from localStorage:", error)
        const initialVersion = {
          id: Date.now(),
          date: new Date().toLocaleString(),
          description: "Versión inicial",
          content: scenesArray[newIndex].content,
        }
        setVersions([initialVersion])
      }
    }
  }

  const moveSceneUp = (index: number) => {
    if (index <= 0) return

    const updatedScenes = [...scenesArray]
    const temp = updatedScenes[index]
    updatedScenes[index] = updatedScenes[index - 1]
    updatedScenes[index - 1] = temp

    updatedScenes.forEach((scene, idx) => {
      scene.order_index = idx
    })

    setScenesArray(updatedScenes)

    saveScenes(projectId, updatedScenes)

    if (activeSceneIdx === index) {
      setActiveSceneIdx(index - 1)
    } else if (activeSceneIdx === index - 1) {
      setActiveSceneIdx(index)
    }

    const sceneIds = updatedScenes.map((scene) => scene.id)
    reorderScenes(projectId, sceneIds).catch((error) => console.error("Error reordering scenes:", error))

    toast({
      title: "Orden actualizado",
      description: "El orden de las escenas ha sido actualizado",
      duration: 2000,
    })
  }

  const moveSceneDown = (index: number) => {
    if (index >= scenesArray.length - 1) return

    const updatedScenes = [...scenesArray]
    const temp = updatedScenes[index]
    updatedScenes[index] = updatedScenes[index + 1]
    updatedScenes[index + 1] = temp

    updatedScenes.forEach((scene, idx) => {
      scene.order_index = idx
    })

    setScenesArray(updatedScenes)

    saveScenes(projectId, updatedScenes)

    if (activeSceneIdx === index) {
      setActiveSceneIdx(index + 1)
    } else if (activeSceneIdx === index + 1) {
      setActiveSceneIdx(index)
    }

    const sceneIds = updatedScenes.map((scene) => scene.id)
    reorderScenes(projectId, sceneIds).catch((error) => console.error("Error reordering scenes:", error))

    toast({
      title: "Orden actualizado",
      description: "El orden de las escenas ha sido actualizado",
      duration: 2000,
    })
  }

  // Modificar la función reverseScenes para asegurar que la inversión se aplique profundamente en la base de datos

  const reverseScenes = async () => {
    if (scenesArray.length <= 1) return

    setIsReordering(true)
    try {
      // Crear una copia del array de escenas
      const scenesToReverse = [...scenesArray]
      const totalScenes = scenesToReverse.length

      // Crear un nuevo array con el orden invertido
      const reversedScenes = []
      for (let i = totalScenes - 1; i >= 0; i--) {
        reversedScenes.push({
          ...scenesToReverse[i],
          order_index: totalScenes - 1 - i,
        })
      }

      // Actualizar el estado local con las escenas invertidas
      setScenesArray(reversedScenes)

      // Guardar en el administrador de estado global
      saveScenes(projectId, reversedScenes)

      // Actualizar el índice de la escena activa si es necesario
      if (activeSceneIdx !== null) {
        const activeSceneId = scenesArray[activeSceneIdx].id
        const newIndex = reversedScenes.findIndex((scene) => scene.id === activeSceneId)
        if (newIndex !== -1) {
          setActiveSceneIdx(newIndex)
        }
      }

      // Actualizar el orden en la base de datos
      // Primero, actualizar cada escena individualmente con su nuevo order_index
      const updatePromises = reversedScenes.map(async (scene, index) => {
        try {
          console.log(`Actualizando escena ${scene.id} a posición ${index} en la base de datos`)
          await updateScene(scene.id, { order_index: index })
          console.log(`Escena ${scene.id} actualizada correctamente`)
        } catch (updateError) {
          console.error(`Error al actualizar la escena ${scene.id}:`, updateError)
          toast({
            title: "Error al actualizar la escena",
            description: `No se pudo actualizar la escena ${scene.title}. Inténtalo de nuevo.`,
            variant: "destructive",
            duration: 4000,
          })
        }
      })

      // Esperar a que todas las actualizaciones individuales se completen
      await Promise.all(updatePromises)

      // Luego, usar reorderScenes para asegurar la consistencia del orden
      const sceneIds = reversedScenes.map((scene) => scene.id)
      await reorderScenes(projectId, sceneIds)

      toast({
        title: "Orden invertido",
        description: "El orden de las escenas ha sido invertido correctamente",
        duration: 2000,
      })
    } catch (error) {
      console.error("Error al invertir el orden de las escenas:", error)
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

  const saveCurrentState = useCallback(() => {
    try {
      // Guardar el estado actual con timestamp
      localStorage.setItem(`storynema_scenes_${projectId}`, JSON.stringify(scenesArray))
      localStorage.setItem(`storynema_last_update_time_${projectId}`, Date.now().toString())
      localStorage.setItem(`storynema_last_update_source_${projectId}`, "script_editor")
    } catch (error) {
      console.error("Error saving current state:", error)
    }
  }, [projectId, scenesArray])

  useEffect(() => {
    if (scenesArray.length > 0) {
      saveCurrentState()
    }
  }, [scenesArray, saveCurrentState])

  const addNewScene = async () => {
    try {
      toast({
        title: "Creando nueva escena...",
        description: "Por favor, espera un momento.",
      })

      const response = await fetch(`/api/projects/${projectId}/scenes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}), // El backend se encarga de los valores por defecto
      })

      if (!response.ok) {
        throw new Error("No se pudo crear la escena en el servidor.")
      }

      const newScene = await response.json()

      // Actualizar el estado local con la escena real
      const updatedScenes = [...scenesArray, newScene]
      setScenesArray(updatedScenes)

      // Guardar en el administrador de estado global
      saveScenes(projectId, updatedScenes)

      // Seleccionar la nueva escena
      setActiveSceneIdx(updatedScenes.length - 1)

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
        description: "La nueva escena se ha guardado correctamente.",
      })
    } catch (error) {
      console.error("Error creating new scene:", error)
      toast({
        title: "Error al crear escena",
        description: "No se pudo crear la escena. Inténtalo de nuevo.",
        variant: "destructive",
      })
    }
  }

  const deleteScene = async (sceneId: string) => {
    if (scenesArray.length <= 1) return

    try {
      const res = await fetch(
        `/api/projects/${projectId}/scenes/${sceneId}`,
        { method: "DELETE" },
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "No se pudo eliminar la escena")
      }
    } catch (error: any) {
      console.error("Error deleting scene:", error)
      toast({
        title: "Error al eliminar escena",
        description: error.message,
        variant: "destructive",
      })
      return
    }

    const updatedScenes = scenesArray.filter((s) => s.id !== sceneId)
    setScenesArray(updatedScenes)

    // Guardar en el administrador de estado global
    saveScenes(projectId, updatedScenes)

    if (activeScene.id === sceneId) {
      setActiveSceneIdx(0)
      // Reiniciar el historial al eliminar la escena activa
      setHistory([updatedScenes[0].content])
      setHistoryIndex(0)

      // Cargar versiones para la primera escena
      const initialVersion = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        description: "Versión inicial",
        content: updatedScenes[0].content,
      }
      setVersions([initialVersion])
    }
  }

  const generateWithAI = () => {
    setIsGenerating(true)
    // Simulación de generación con IA
    setTimeout(() => {
      const updatedContent =
        activeScene.content +
        "\n\n" +
        "MARÍA\n(con tono conciliador)\nEntiendo. Pero necesitamos esos informes para presentarlos al cliente.\n\n" +
        "JUAN\nLos tengo aquí mismo. Trabajé toda la noche para terminarlos.\n\n" +
        "María sonríe, sorprendida por la dedicación de Juan a pesar de su tardanza."

      const updatedScene = {
        ...activeScene,
        content: updatedContent,
      }

      const updatedScenes = [...scenesArray]
      updatedScenes[activeSceneIdx] = updatedScene
      setScenesArray(updatedScenes)
      setIsGenerating(false)

      // Añadir nueva versión
      const newVersion = {
        id: versions.length + 1,
        date: "Ahora mismo",
        description: "Generación con IA: Ampliación de diálogo",
        content: updatedContent,
      }
      setVersions([newVersion, ...versions])

      // Actualizar historial
      const newHistory = [...history, updatedContent]
      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
    }, 2000)
  }

  const exportToPDF = () => {
    // Simulación de exportación a PDF
    alert("Guion exportado a PDF correctamente")
  }

  // Función para obtener el guion completo
  const getFullScript = () => {
    return scenesArray.map((scene) => `${scene.title}\n\n${scene.content}\n\n`).join("\n")
  }

  // Funciones para deshacer/rehacer
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      const previousContent = history[newIndex]

      const updatedScene = { ...activeScene, content: previousContent }
      const updatedScenes = [...scenesArray]
      updatedScenes[activeSceneIdx] = updatedScene
      setScenesArray(updatedScenes)
    }
  }

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      const nextContent = history[newIndex]

      const updatedScene = { ...activeScene, content: nextContent }
      const updatedScenes = [...scenesArray]
      updatedScenes[activeSceneIdx] = updatedScene
      setScenesArray(updatedScenes)
    }
  }

  // Funciones para el editor de texto
  const applyTextFormat = (format: string) => {
    if (!textareaRef.current) return

    const start = selectedRange.start
    const end = selectedRange.end
    const selectedText = activeScene.content.substring(start, end)
    let newText = activeScene.content
    let cursorOffset = 0

    switch (format) {
      case "bold":
        newText = newText.substring(0, start) + `**${selectedText}**` + newText.substring(end)
        cursorOffset = 4 // ** al inicio y al final
        break
      case "italic":
        newText = newText.substring(0, start) + `_${selectedText}_` + newText.substring(end)
        cursorOffset = 2 // _ al inicio y al final
        break
      case "underline":
        newText = newText.substring(0, start) + `__${selectedText}__` + newText.substring(end)
        cursorOffset = 4 // __ al inicio y al final
        break
      case "uppercase":
        newText = newText.substring(0, start) + selectedText.toUpperCase() + newText.substring(end)
        break
      case "lowercase":
        newText = newText.substring(0, start) + selectedText.toLowerCase() + newText.substring(end)
        break
      case "capitalize":
        newText =
          newText.substring(0, start) +
          selectedText
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ") +
          newText.substring(end)
        break
      case "character":
        newText = newText.substring(0, start) + `${selectedText.toUpperCase()}\n` + newText.substring(end)
        cursorOffset = 1 // \n al final
        break
      case "dialogue":
        newText = newText.substring(0, start) + `\n${selectedText}\n` + newText.substring(end)
        cursorOffset = 2 // \n al inicio y al final
        break
      case "parenthetical":
        newText = newText.substring(0, start) + `(${selectedText})` + newText.substring(end)
        cursorOffset = 2 // ( al inicio y ) al final
        break
      case "scene-heading":
        newText = newText.substring(0, start) + `${selectedText.toUpperCase()}` + newText.substring(end)
        break
    }

    handleSceneContentChange(newText)

    // Ocultar la barra de herramientas después de aplicar el formato
    setShowFormatToolbar(false)

    // Restaurar la selección después de aplicar el formato
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(start, end + cursorOffset)
      }
    }, 0)
  }

  // 2. Añadimos una función para iniciar la edición de una versión
  const startEditingVersionName = (version: Version) => {
    setEditingVersionId(version.id)
    setEditingVersionName(version.description)
  }

  // 3. Añadimos una función para guardar el nombre editado
  const saveVersionName = (versionId: number) => {
    if (editingVersionName.trim()) {
      const updatedVersions = versions.map((v) => (v.id === versionId ? { ...v, description: editingVersionName } : v))
      setVersions(updatedVersions)

      // Guardar en localStorage
      try {
        localStorage.setItem(`storynema_versions_scene_${activeScene.id}_${projectId}`, JSON.stringify(updatedVersions))
      } catch (error) {
        console.error("Error saving versions to localStorage:", error)
      }

      setEditingVersionId(null)
      setEditingVersionName("")
    }
  }

  // Añadir una función para cancelar la edición sin guardar
  const cancelEditingVersionName = () => {
    setEditingVersionId(null)
    setEditingVersionName("")
  }

  // Modificar la función saveCurrentVersion
  const saveCurrentVersion = (description: string) => {
    const newVersion = {
      id: Date.now(), // Usar timestamp para ID único
      date: new Date().toLocaleString(), // Fecha y hora actual formateada
      description,
      content: activeScene.content,
    }

    // Limitar a 10 versiones
    let updatedVersions = [newVersion, ...versions]
    if (updatedVersions.length > 10) {
      updatedVersions = updatedVersions.slice(0, 10)
    }

    setVersions(updatedVersions)

    // Guardar versiones en localStorage
    try {
      localStorage.setItem(`storynema_versions_scene_${activeScene.id}_${projectId}`, JSON.stringify(updatedVersions))
    } catch (error) {
      console.error("Error saving versions to localStorage:", error)
    }
  }

  // Modificar las funciones para manejar versiones
  const loadVersion = (version: Version) => {
    // Actualizar el contenido de la escena activa con el contenido de la versión
    handleSceneContentChange(version.content)

    // Añadir al historial para poder deshacer/rehacer
    const newHistory = [...history.slice(0, historyIndex + 1), version.content]
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)

    // Mostrar un mensaje de confirmación
    alert(`Versión "${version.description}" cargada correctamente`)
  }

  const duplicateVersion = (version: Version) => {
    const newVersion = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      description: `Copia de: ${version.description}`,
      content: version.content,
    }

    // Limitar a 10 versiones
    let updatedVersions = [newVersion, ...versions]
    if (updatedVersions.length > 10) {
      updatedVersions = updatedVersions.slice(0, 10)
    }

    setVersions(updatedVersions)

    // Guardar versiones en localStorage
    try {
      localStorage.setItem(`storynema_versions_scene_${activeScene.id}_${projectId}`, JSON.stringify(updatedVersions))
    } catch (error) {
      console.error("Error saving versions to localStorage:", error)
    }

    // Mostrar un mensaje de confirmación
    alert(`Versión "${version.description}" duplicada correctamente`)
  }

  const deleteVersion = (versionId: number) => {
    // No permitir eliminar si solo queda una versión
    if (versions.length <= 1) return

    const updatedVersions = versions.filter((v) => v.id !== versionId)
    setVersions(updatedVersions)

    // Guardar versiones en localStorage
    try {
      localStorage.setItem(`storynema_versions_scene_${activeScene.id}_${projectId}`, JSON.stringify(updatedVersions))
    } catch (error) {
      console.error("Error saving versions to localStorage:", error)
    }

    // Mostrar un mensaje de confirmación
    alert(`Versión eliminada correctamente`)
  }

  // Modificar la posición de la barra flotante para que aparezca más cerca del cursor
  const FloatingToolbar = () => {
    if (!showFormatToolbar) return null

    const style = {
      position: "absolute" as const,
      top: `${selectionCoords.top - 40}px`, // Ajustado para aparecer 40px más arriba del cursor
      left: `${selectionCoords.left}px`,
      zIndex: 100,
      transform: "translateX(-50%)", // Centrar horizontalmente
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

  // Componente para el diálogo de guardar versión
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

  // Función para seleccionar una versión
  const handleSelectVersion = (versionId: number) => {
    setSelectedVersionId(versionId)
  }

  // Añadir un efecto para verificar cambios en el storyboard
  useEffect(() => {
    // Verificar si hay cambios desde el storyboard
    const lastUpdateSource = localStorage.getItem(`storynema_last_update_source_${projectId}`)
    const lastUpdateTime = localStorage.getItem(`storynema_last_update_time_${projectId}`)

    if (lastUpdateSource === "storyboard" && lastUpdateTime) {
      const timeSinceLastUpdate = Date.now() - Number.parseInt(lastUpdateTime)

      // Solo procesar cambios recientes (menos de 5 segundos)
      if (timeSinceLastUpdate < 5000) {
        try {
          const savedScenes = localStorage.getItem(`storynema_scenes_${projectId}`)
          if (savedScenes) {
            const parsedScenes = JSON.parse(savedScenes)

            // Verificar si hay cambios reales comparando contenido y orden
            const hasChanges =
              parsedScenes.length !== scenesArray.length ||
              parsedScenes.some((scene, index) => {
                const currentScene = scenesArray[index]
                return (
                  !currentScene ||
                  scene.id !== currentScene.id ||
                  scene.title !== currentScene.title ||
                  scene.content !== currentScene.content ||
                  scene.order_index !== currentScene.order_index
                )
              })

            if (hasChanges) {
              console.log("Detectados cambios desde el storyboard, actualizando editor de guiones")
              // Ordenar las escenas por order_index antes de actualizar
              const sortedScenes = [...parsedScenes].sort((a, b) => {
                if (a.order_index !== undefined && b.order_index !== undefined) {
                  return a.order_index - b.order_index
                }
                return 0
              })
              setScenesArray(sortedScenes)
            }
          }
        } catch (error) {
          console.error("Error checking for storyboard changes:", error)
        }
      }
    }

    // Ejecutar este efecto solo cuando cambie el projectId
    // No incluir scenesArray en las dependencias para evitar bucles
  }, [projectId])

  if (!scenesArray || scenesArray.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 bg-[#252525] border border-[#333333] rounded-md p-6">
        <p className="text-gray-400 mb-4">No hay escenas disponibles. Crea una nueva para comenzar.</p>
        <div className="flex gap-4">
          <Button onClick={addNewScene} className="bg-amber-600 hover:bg-amber-700 text-white">
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
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Crear con IA
          </Button>
        </div>
      </div>
    )
  }

  return (
    // Resto del componente sin cambios...
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
      {/* Contenido del componente sin cambios */}
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
                >
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {scenesArray
                .sort((a, b) => a.order_index - b.order_index)
                .map((scene, index) => (
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
                            disabled={index === scenesArray.length - 1}
                            title="Mover abajo"
                          >
                            <MoveDown className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      {scenesArray.length > 1 && (
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
                  />
                </div>

                {/* Barra de herramientas fija con deshacer/rehacer */}
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

                  <div className="text-xs text-gray-400">Selecciona texto para ver opciones de formato</div>
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
                    <Select defaultValue="gemini-2.0-flash-001">
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
                    <Select defaultValue="drama">
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
                  disabled={isGenerating}
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
                  />
                </div>
                <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Enviar comentario
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Exportar el componente como predeterminado también
export default ScriptEditor
