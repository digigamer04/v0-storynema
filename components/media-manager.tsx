"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Upload, Trash2, ImageIcon, FileAudio, Film, File, Settings, Camera, X } from "lucide-react"
import { createClientSupabaseClient } from "@/lib/supabase"
import { uploadFile, deleteFile } from "@/lib/supabase-storage"
import { toast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"

interface MediaFile {
  id: string
  name: string
  url: string
  path: string
  type: string
  size?: string
  metadata?: any
}

interface MediaManagerProps {
  userId: string
  projectId?: string
  onSelectMedia?: (url: string) => void
  onSelectMultipleMedia?: (urls: string[]) => void
  onAudioUpload?: (audio: { url: string; name: string; duration: number }) => void
  mode?: "select" | "multiple" | "upload"
  context?: "storyboard" | "config"
  buttonLabel?: string
  buttonIcon?: React.ReactNode
  buttonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  buttonClassName?: string
  dialogTitle?: string
  acceptedFileTypes?: string
}

export default function MediaManager({
  userId,
  projectId,
  onSelectMedia,
  onSelectMultipleMedia,
  onAudioUpload,
  context = "storyboard",
  buttonLabel,
  buttonIcon,
  buttonVariant = "outline",
  buttonClassName = "",
  dialogTitle,
  acceptedFileTypes,
  mode: propsMode = "upload",
}: MediaManagerProps) {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [filteredFiles, setFilteredFiles] = useState<MediaFile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<string>("all")
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<"select" | "multiple">(propsMode)

  // Configurar valores predeterminados según el contexto
  useEffect(() => {
    if (context === "storyboard") {
      // Valores predeterminados para storyboard
      setActiveTab("images")
    } else if (context === "config") {
      // Valores predeterminados para configuración
      setActiveTab("all")
    }
  }, [context])

  useEffect(() => {
    if (propsMode) {
      setMode(propsMode)
    }
  }, [propsMode])

  // Cargar archivos cuando se abre el diálogo o cambia el usuario
  useEffect(() => {
    if (open) {
      if (!userId) {
        console.error("MediaManager: No se proporcionó userId")
        setError("No se pudo identificar al usuario. Por favor, inicia sesión nuevamente.")
        setIsLoading(false)
        return
      }
      console.log("MediaManager: Cargando archivos para usuario", userId)
      loadFiles()
    }
  }, [open, userId])

  // Filtrar archivos cuando cambia la pestaña activa
  useEffect(() => {
    if (activeTab === "all") {
      setFilteredFiles(files)
    } else {
      setFilteredFiles(
        files.filter((file) => {
          if (activeTab === "images") return file.type?.startsWith("image")
          if (activeTab === "audio") return file.type?.startsWith("audio")
          if (activeTab === "video") return file.type?.startsWith("video")
          return true
        }),
      )
    }
  }, [activeTab, files])

  const loadFiles = async () => {
    try {
      setIsLoading(true)
      setError(null)

      if (!userId) {
        console.error("No se proporcionó userId para cargar archivos")
        setError("No se pudo identificar al usuario. Por favor, inicia sesión nuevamente.")
        setIsLoading(false)
        return
      }

      console.log("Cargando archivos para el usuario:", userId)

      const supabase = createClientSupabaseClient()
      const { data, error: supabaseError } = await supabase.storage.from("media-files").list(userId, {
        sortBy: { column: "created_at", order: "desc" },
      })

      if (supabaseError) {
        console.error("Error de Supabase al listar archivos:", supabaseError)
        throw supabaseError
      }

      console.log("Archivos obtenidos:", data?.length || 0)

      if (!data || data.length === 0) {
        setFiles([])
        setFilteredFiles([])
        setIsLoading(false)
        return
      }

      const filesWithUrls = await Promise.all(
        data.map(async (file) => {
          const filePath = `${userId}/${file.name}`
          const { data: urlData } = supabase.storage.from("media-files").getPublicUrl(filePath)

          // Determinar el tipo de archivo basado en la extensión
          const extension = file.name.split(".").pop()?.toLowerCase() || ""
          let type = "unknown"

          if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(extension)) {
            type = "image"
          } else if (["mp3", "wav", "ogg", "aac"].includes(extension)) {
            type = "audio"
          } else if (["mp4", "webm", "mov", "avi"].includes(extension)) {
            type = "video"
          } else if (["pdf", "doc", "docx", "txt"].includes(extension)) {
            type = "document"
          }

          return {
            ...file,
            url: urlData.publicUrl,
            path: filePath,
            type,
          }
        }),
      )

      console.log("Archivos procesados con URLs:", filesWithUrls.length)
      setFiles(filesWithUrls)
      setFilteredFiles(filesWithUrls)
    } catch (err) {
      console.error("Error loading media files:", err)
      setError("Error al cargar los archivos multimedia. Inténtalo de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = (url: string, fileType?: string) => {
    if (onSelectMedia) {
      console.log("Media seleccionado:", url)
      onSelectMedia(url)
      setOpen(false)
      toast({
        title: "Archivo seleccionado",
        description: "El archivo ha sido seleccionado correctamente.",
      })
    }

    // Si es un archivo de audio y tenemos la función onAudioUpload
    if (fileType === "audio" && onAudioUpload) {
      const selectedFile = files.find((file) => file.url === url)
      if (selectedFile) {
        onAudioUpload({
          url: selectedFile.url,
          name: selectedFile.name,
          duration: 0, // Esto se actualizará cuando se cargue el audio
        })
        setOpen(false)
        toast({
          title: "Audio seleccionado",
          description: `${selectedFile.name} ha sido seleccionado como pista de audio.`,
        })
      }
    }
  }

  const handleMultipleFileSelect = () => {
    if (onSelectMultipleMedia && selectedFiles.length > 0) {
      console.log("Múltiples archivos seleccionados:", selectedFiles)
      onSelectMultipleMedia(selectedFiles)
      setOpen(false)
      toast({
        title: "Archivos seleccionados",
        description: `${selectedFiles.length} archivos han sido seleccionados correctamente.`,
      })
      setSelectedFiles([])
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !userId) {
      return
    }

    try {
      setUploading(true)
      const file = e.target.files[0]

      // Validar tamaño del archivo (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "El archivo es demasiado grande. El tamaño máximo es 10MB.",
          variant: "destructive",
        })
        return
      }

      const result = await uploadFile(file, userId)

      // Determinar el tipo de archivo
      const extension = file.name.split(".").pop()?.toLowerCase() || ""
      let type = "unknown"

      if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(extension)) {
        type = "image"
      } else if (["mp3", "wav", "ogg", "aac"].includes(extension)) {
        type = "audio"
      } else if (["mp4", "webm", "mov", "avi"].includes(extension)) {
        type = "video"
      } else if (["pdf", "doc", "docx", "txt"].includes(extension)) {
        type = "document"
      }

      // Añadir el nuevo archivo a la lista
      const newFile = {
        id: Date.now().toString(),
        name: file.name,
        url: result.url,
        path: result.path,
        type,
        size: formatFileSize(file.size),
      }

      setFiles((prev) => [newFile, ...prev])

      // Si estamos en la pestaña correspondiente al tipo de archivo o en "all", actualizar filteredFiles
      if (
        activeTab === "all" ||
        (activeTab === "images" && type === "image") ||
        (activeTab === "audio" && type === "audio") ||
        (activeTab === "video" && type === "video")
      ) {
        setFilteredFiles((prev) => [newFile, ...prev])
      }

      toast({
        title: "Archivo subido",
        description: "El archivo se ha subido correctamente.",
      })

      // Si es un archivo de audio y tenemos la función onAudioUpload
      if (type === "audio" && onAudioUpload && mode === "select") {
        onAudioUpload({
          url: result.url,
          name: file.name,
          duration: 0, // Esto se actualizará cuando se cargue el audio
        })
        setOpen(false)
      }

      // Si es una imagen o video y tenemos la función onSelectMedia
      if ((type === "image" || type === "video") && onSelectMedia && mode === "select") {
        onSelectMedia(result.url)
        setOpen(false)
      }
    } catch (error) {
      console.error("Error uploading file:", error)
      toast({
        title: "Error",
        description: "Error al subir el archivo. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
      // Limpiar el input para permitir subir el mismo archivo de nuevo
      if (e.target) {
        e.target.value = ""
      }
    }
  }

  const handleFileDelete = async (filePath: string) => {
    try {
      setIsLoading(true)

      await deleteFile(filePath)

      // Actualizar las listas de archivos
      setFiles((prev) => prev.filter((file) => file.path !== filePath))
      setFilteredFiles((prev) => prev.filter((file) => file.path !== filePath))

      // Si el archivo estaba seleccionado, quitarlo de la selección
      if (selectedFiles.includes(filePath)) {
        setSelectedFiles((prev) => prev.filter((path) => path !== filePath))
      }

      toast({
        title: "Archivo eliminado",
        description: "El archivo se ha eliminado correctamente.",
      })
    } catch (error) {
      console.error("Error deleting file:", error)
      toast({
        title: "Error",
        description: "Error al eliminar el archivo. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B"
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
    else return (bytes / 1048576).toFixed(1) + " MB"
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case "image":
        return <ImageIcon className="h-4 w-4" />
      case "audio":
        return <FileAudio className="h-4 w-4" />
      case "video":
        return <Film className="h-4 w-4" />
      default:
        return <File className="h-4 w-4" />
    }
  }

  const toggleFileSelection = (url: string) => {
    setSelectedFiles((prev) => (prev.includes(url) ? prev.filter((fileUrl) => fileUrl !== url) : [...prev, url]))
  }

  // Determinar el icono del botón según el contexto
  const getButtonIcon = () => {
    if (buttonIcon) return buttonIcon

    if (context === "storyboard") return <Camera className="h-4 w-4" />
    if (context === "config") return <Settings className="h-4 w-4" />

    return <Upload className="h-4 w-4" />
  }

  // Determinar la etiqueta del botón según el contexto
  const getButtonLabel = () => {
    if (buttonLabel) return buttonLabel

    if (context === "storyboard") return "Seleccionar imagen"
    if (context === "config") return "Imagen de portada"

    return "Gestor de medios"
  }

  // Determinar el título del diálogo según el contexto
  const getDialogTitle = () => {
    if (dialogTitle) return dialogTitle

    if (context === "storyboard") return "Seleccionar imagen para storyboard"
    if (context === "config") return "Seleccionar imagen de portada"

    return "Gestor de medios"
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} className={`flex items-center gap-2 ${buttonClassName}`}>
          {getButtonIcon()}
          {getButtonLabel()}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[80vw] max-h-[90vh] bg-[#1E1E1E] border-[#333333] text-gray-200">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl font-bold">{getDialogTitle()}</DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="rounded-full h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-col h-full space-y-4">
          {/* Controles superiores */}
          <div className="flex justify-between items-center">
            <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-[#2A2A2A]">
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="images">Imágenes</TabsTrigger>
                <TabsTrigger value="audio">Audio</TabsTrigger>
                <TabsTrigger value="video">Video</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className={`${mode === "multiple" ? "bg-blue-600 text-white" : "bg-[#2A2A2A]"}`}
                onClick={() => {
                  // Cambiar entre modo selección única y múltiple
                  setMode(mode === "select" ? "multiple" : "select")
                  // Limpiar selección al cambiar de modo
                  setSelectedFiles([])
                }}
              >
                {mode === "multiple" ? "Selección múltiple" : "Selección única"}
              </Button>

              <Label htmlFor="media-upload" className="cursor-pointer">
                <div className="flex items-center justify-center gap-2 p-2 bg-[#2A2A2A] rounded-md hover:bg-[#3A3A3A] transition-colors">
                  <Upload className="h-4 w-4" />
                  <span>{uploading ? "Subiendo..." : "Subir"}</span>
                </div>
                <Input
                  type="file"
                  id="media-upload"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  accept={acceptedFileTypes}
                />
              </Label>
            </div>
          </div>

          {/* Información de selección */}
          {mode === "multiple" && (
            <div className="flex items-center justify-between bg-[#2A2A2A] p-2 rounded-md">
              <span className="text-sm">
                {selectedFiles.length === 0
                  ? "Selecciona archivos haciendo clic en ellos"
                  : `${selectedFiles.length} ${selectedFiles.length === 1 ? "archivo seleccionado" : "archivos seleccionados"}`}
              </span>
              {selectedFiles.length > 0 && (
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleMultipleFileSelect}>
                  Usar seleccionados
                </Button>
              )}
            </div>
          )}

          {/* Contenido principal */}
          {error && <p className="text-red-400 p-2">{error}</p>}

          <Card className="flex-1 bg-[#252525] border-[#333333] overflow-hidden">
            <CardContent className="p-4 h-[50vh]">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <p>Cargando archivos...</p>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Upload className="h-12 w-12 mb-2" />
                  <p>No hay archivos disponibles</p>
                  <p className="text-sm">Sube archivos para comenzar</p>
                </div>
              ) : (
                <ScrollArea className="h-full pr-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredFiles.map((file) => (
                      <div
                        key={file.id || file.path}
                        className={`relative group bg-[#2A2A2A] rounded-md overflow-hidden cursor-pointer hover:bg-[#333333] transition-colors ${
                          selectedFiles.includes(file.url) ? "ring-2 ring-blue-500" : ""
                        }`}
                        onClick={() => {
                          if (mode === "select") {
                            handleFileSelect(file.url, file.type)
                          } else if (mode === "multiple") {
                            toggleFileSelection(file.url)
                          }
                        }}
                      >
                        <div className="aspect-square w-full relative">
                          {file.type === "image" ? (
                            <img
                              src={file.url || "/placeholder.svg"}
                              alt={file.name}
                              className="object-cover w-full h-full"
                              onError={(e) => {
                                ;(e.target as HTMLImageElement).src = "/placeholder.svg"
                              }}
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full bg-[#333333]">
                              {getFileIcon(file.type)}
                            </div>
                          )}

                          {/* Overlay con información y controles */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex flex-col justify-between p-2">
                            <div className="flex justify-between">
                              <Badge
                                variant="outline"
                                className={`${selectedFiles.includes(file.url) ? "bg-blue-500/70" : "bg-black/50"} text-xs`}
                              >
                                {selectedFiles.includes(file.url) ? "Seleccionado" : file.type}
                              </Badge>

                              {mode === "multiple" && (
                                <div
                                  className={`h-5 w-5 rounded-full border-2 ${selectedFiles.includes(file.url) ? "bg-blue-500 border-white" : "border-gray-400 bg-transparent"} flex items-center justify-center`}
                                >
                                  {selectedFiles.includes(file.url) && (
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-3 w-3 text-white"
                                      viewBox="0 0 20 20"
                                      fill="currentColor"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Botón específico para archivos de audio */}
                            {file.type === "audio" && (
                              <div className="flex justify-center my-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-green-600/80 hover:bg-green-700 text-white border-none text-xs py-1 h-auto"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (onAudioUpload) {
                                      onAudioUpload({
                                        url: file.url,
                                        name: file.name,
                                        duration: 0, // Esto se actualizará cuando se cargue el audio
                                      })
                                      toast({
                                        title: "Pista de audio seleccionada",
                                        description: `${file.name} establecida como pista de audio principal`,
                                      })
                                      setOpen(false)
                                    }
                                  }}
                                >
                                  <FileAudio className="h-3 w-3 mr-1" />
                                  Usar como pista master
                                </Button>
                              </div>
                            )}

                            <div className="flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="text-xs truncate max-w-[80%] bg-black/50 p-1 rounded">{file.name}</div>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="bg-black/50 text-white hover:bg-red-500/70"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleFileDelete(file.path)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Controles inferiores */}
          <div className="flex justify-between items-center">
            <div>
              {mode === "multiple" && selectedFiles.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setSelectedFiles([])}>
                  Limpiar selección
                </Button>
              )}
            </div>

            {mode === "select" && filteredFiles.length > 0 && (
              <Button onClick={() => setMode("multiple")} className="bg-[#2A2A2A] hover:bg-[#3A3A3A]">
                Cambiar a selección múltiple
              </Button>
            )}

            {mode === "multiple" && (
              <Button
                onClick={handleMultipleFileSelect}
                disabled={selectedFiles.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Usar {selectedFiles.length} seleccionados
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
