"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Folder, File, Upload, ImageIcon, FileText, Film, Music, ArrowLeft, Plus, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/components/ui/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

type FileItem = {
  id: string
  name: string
  isFolder: boolean
  size?: number
  type?: string
  url?: string
  lastModified?: string
  metadata?: any
}

type FileManagerProps = {
  projectId: string
  bucketName?: string
  initialPath?: string
  onFileSelect?: (file: FileItem) => void
  allowedFileTypes?: string[]
  maxFileSize?: number // in MB
}

export default function FileManager({
  projectId,
  bucketName = "media",
  initialPath = "",
  onFileSelect,
  allowedFileTypes = ["image/*", "video/*", "audio/*"],
  maxFileSize = 50, // 50MB default
}: FileManagerProps) {
  const supabase = createClientComponentClient()
  const [files, setFiles] = useState<FileItem[]>([])
  const [path, setPath] = useState<string>(initialPath ? `${projectId}/${initialPath}/` : `${projectId}/`)
  const [isLoading, setIsLoading] = useState(true)
  const [newFolderName, setNewFolderName] = useState("")
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [isUploading, setIsUploading] = useState(false)
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [pathHistory, setPathHistory] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Parse path into breadcrumb segments
  const pathSegments = path.split("/").filter((segment) => segment !== "")

  useEffect(() => {
    listFiles()
  }, [path])

  const listFiles = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.storage.from(bucketName).list(path)

      if (error) {
        throw error
      }

      // Get file URLs and metadata for non-folders
      const filesWithMetadata = await Promise.all(
        (data || []).map(async (item) => {
          // Check if it's a folder (no extension or ends with /)
          const isFolder = !item.name.includes(".") || item.name.endsWith("/")

          let url = ""
          let metadata = null

          if (!isFolder) {
            const { data: publicUrl } = supabase.storage.from(bucketName).getPublicUrl(`${path}${item.name}`)

            url = publicUrl.publicUrl

            // Get metadata for files
            const { data: metaData } = await supabase.storage.from(bucketName).getMetadata(`${path}${item.name}`)

            metadata = metaData
          }

          return {
            id: item.id || `${path}${item.name}`,
            name: item.name,
            isFolder,
            size: item.metadata?.size,
            type: item.metadata?.mimetype || getFileTypeFromName(item.name),
            url,
            lastModified: item.metadata?.lastModified,
            metadata,
          }
        }),
      )

      // Sort: folders first, then files alphabetically
      const sortedFiles = filesWithMetadata.sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1
        if (!a.isFolder && b.isFolder) return 1
        return a.name.localeCompare(b.name)
      })

      setFiles(sortedFiles)
    } catch (error) {
      console.error("Error al listar archivos:", error)
      toast({
        title: "Error al cargar archivos",
        description: "No se pudieron cargar los archivos. Intenta de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getFileTypeFromName = (fileName: string): string => {
    const extension = fileName.split(".").pop()?.toLowerCase() || ""

    const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "svg"]
    const videoExtensions = ["mp4", "webm", "mov", "avi"]
    const audioExtensions = ["mp3", "wav", "ogg", "flac"]
    const documentExtensions = ["pdf", "doc", "docx", "txt", "rtf"]

    if (imageExtensions.includes(extension)) return "image"
    if (videoExtensions.includes(extension)) return "video"
    if (audioExtensions.includes(extension)) return "audio"
    if (documentExtensions.includes(extension)) return "document"

    return "unknown"
  }

  const getFileIcon = (file: FileItem) => {
    if (file.isFolder) return <Folder className="h-6 w-6 text-blue-500" />

    const fileType = file.type || getFileTypeFromName(file.name)

    switch (fileType) {
      case "image":
        return <ImageIcon className="h-6 w-6 text-green-500" />
      case "video":
        return <Film className="h-6 w-6 text-purple-500" />
      case "audio":
        return <Music className="h-6 w-6 text-yellow-500" />
      case "document":
        return <FileText className="h-6 w-6 text-orange-500" />
      default:
        return <File className="h-6 w-6 text-gray-500" />
    }
  }

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "N/A"

    const units = ["B", "KB", "MB", "GB"]
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  const navigateToFolder = (folderName: string) => {
    // Save current path to history for back navigation
    setPathHistory([...pathHistory, path])
    setPath(`${path}${folderName}/`)
  }

  const navigateUp = () => {
    // Remove the last folder and the trailing slash
    const segments = path.split("/").filter((segment) => segment !== "")
    segments.pop() // Remove the last segment

    const newPath = segments.length > 0 ? `${segments.join("/")}/` : ""
    setPath(newPath || `${projectId}/`)
  }

  const navigateBack = () => {
    if (pathHistory.length > 0) {
      const previousPath = pathHistory[pathHistory.length - 1]
      setPath(previousPath)
      setPathHistory(pathHistory.slice(0, -1))
    }
  }

  const navigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      // Navigate to root
      setPathHistory([...pathHistory, path])
      setPath(`${projectId}/`)
      return
    }

    const segments = pathSegments.slice(0, index + 1)
    const newPath = `${segments.join("/")}/`

    setPathHistory([...pathHistory, path])
    setPath(newPath)
  }

  const createFolder = async () => {
    if (!newFolderName.trim()) {
      toast({
        title: "Nombre requerido",
        description: "Por favor ingresa un nombre para la carpeta",
        variant: "destructive",
      })
      return
    }

    setIsCreatingFolder(true)

    try {
      // Create an empty .keep file in the new folder to make it exist
      const folderPath = `${path}${newFolderName}/.keep`
      const { error } = await supabase.storage
        .from(bucketName)
        .upload(folderPath, new Blob([]), { contentType: "application/octet-stream" })

      if (error) throw error

      toast({
        title: "Carpeta creada",
        description: `La carpeta "${newFolderName}" ha sido creada exitosamente.`,
        variant: "default",
      })

      setNewFolderName("")
      setShowNewFolderDialog(false)
      listFiles()
    } catch (error) {
      console.error("Error al crear carpeta:", error)
      toast({
        title: "Error al crear carpeta",
        description: "No se pudo crear la carpeta. Intenta de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsCreatingFolder(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    uploadFiles(Array.from(files))
  }

  const uploadFiles = async (filesToUpload: File[]) => {
    setIsUploading(true)
    setUploadProgress(0)

    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i]

      // Check file size
      if (file.size > maxFileSize * 1024 * 1024) {
        toast({
          title: "Archivo demasiado grande",
          description: `El archivo "${file.name}" excede el tamaño máximo de ${maxFileSize}MB.`,
          variant: "destructive",
        })
        errorCount++
        continue
      }

      // Check file type if allowedFileTypes is provided
      if (allowedFileTypes.length > 0) {
        const fileType = file.type
        const isAllowed = allowedFileTypes.some((type) => {
          if (type.endsWith("/*")) {
            // Handle wildcard types like 'image/*'
            const category = type.split("/")[0]
            return fileType.startsWith(`${category}/`)
          }
          return type === fileType
        })

        if (!isAllowed) {
          toast({
            title: "Tipo de archivo no permitido",
            description: `El archivo "${file.name}" no es de un tipo permitido.`,
            variant: "destructive",
          })
          errorCount++
          continue
        }
      }

      try {
        const filePath = `${path}${file.name}`
        const { error } = await supabase.storage.from(bucketName).upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        })

        if (error) throw error

        successCount++
        // Update progress
        setUploadProgress(Math.round(((i + 1) / filesToUpload.length) * 100))
      } catch (error) {
        console.error(`Error al subir archivo ${file.name}:`, error)
        errorCount++
      }
    }

    // Show toast with results
    if (successCount > 0) {
      toast({
        title: "Archivos subidos",
        description: `${successCount} archivo(s) subido(s) exitosamente.${errorCount > 0 ? ` ${errorCount} archivo(s) fallaron.` : ""}`,
        variant: successCount > 0 && errorCount === 0 ? "default" : "destructive",
      })

      // Refresh file list
      listFiles()
    } else if (errorCount > 0) {
      toast({
        title: "Error al subir archivos",
        description: `No se pudieron subir ${errorCount} archivo(s).`,
        variant: "destructive",
      })
    }

    setIsUploading(false)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const confirmDelete = (file: FileItem) => {
    setFileToDelete(file)
    setShowDeleteDialog(true)
  }

  const deleteFile = async () => {
    if (!fileToDelete) return

    try {
      if (fileToDelete.isFolder) {
        // For folders, we need to recursively delete all contents
        // First, list all files in the folder
        const folderPath = `${path}${fileToDelete.name}/`
        const { data, error } = await supabase.storage.from(bucketName).list(folderPath)

        if (error) throw error

        // Delete all files in the folder
        if (data && data.length > 0) {
          const filePaths = data.map((item) => `${folderPath}${item.name}`)
          const { error: deleteError } = await supabase.storage.from(bucketName).remove(filePaths)
          if (deleteError) throw deleteError
        }

        // Delete the .keep file that represents the folder
        const { error: keepError } = await supabase.storage.from(bucketName).remove([`${folderPath}.keep`])
        if (keepError && keepError.message !== "The resource was not found") {
          throw keepError
        }
      } else {
        // For regular files, just delete the file
        const filePath = `${path}${fileToDelete.name}`
        const { error } = await supabase.storage.from(bucketName).remove([filePath])
        if (error) throw error
      }

      toast({
        title: "Eliminado exitosamente",
        description: `"${fileToDelete.name}" ha sido eliminado.`,
        variant: "default",
      })

      setShowDeleteDialog(false)
      setFileToDelete(null)
      listFiles()
    } catch (error) {
      console.error("Error al eliminar:", error)
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar el elemento. Intenta de nuevo.",
        variant: "destructive",
      })
    }
  }

  const handleFileClick = (file: FileItem) => {
    if (file.isFolder) {
      navigateToFolder(file.name)
    } else if (onFileSelect) {
      // Asegurarse de que se llame al callback con el archivo completo
      console.log("Archivo seleccionado:", file)
      onFileSelect(file)
      // Cerrar el diálogo después de seleccionar un archivo
      setShowPreview(false)
      toast({
        title: "Archivo seleccionado",
        description: `${file.name} ha sido seleccionado correctamente.`,
      })
    } else {
      // Preview the file if no onFileSelect handler
      setPreviewFile(file)
      setShowPreview(true)
    }
  }

  const renderFilePreview = () => {
    if (!previewFile) return null

    const fileType = previewFile.type || getFileTypeFromName(previewFile.name)

    return (
      <div className="flex flex-col items-center justify-center">
        {fileType === "image" ? (
          <div className="flex justify-center">
            <img
              src={previewFile.url || "/placeholder.svg"}
              alt={previewFile.name}
              className="max-h-[60vh] max-w-full object-contain rounded-md"
            />
          </div>
        ) : fileType === "video" ? (
          <div className="flex justify-center">
            <video src={previewFile.url} controls className="max-h-[60vh] max-w-full rounded-md">
              Tu navegador no soporta la reproducción de video.
            </video>
          </div>
        ) : fileType === "audio" ? (
          <div className="flex justify-center">
            <audio src={previewFile.url} controls className="w-full">
              Tu navegador no soporta la reproducción de audio.
            </audio>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-4">
            {getFileIcon(previewFile)}
            <p className="mt-2 text-center">Este tipo de archivo no se puede previsualizar.</p>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <Button onClick={() => window.open(previewFile.url, "_blank")}>Abrir archivo</Button>
          {onFileSelect && (
            <Button
              variant="default"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                onFileSelect(previewFile)
                setShowPreview(false)
                toast({
                  title: "Archivo seleccionado",
                  description: `${previewFile.name} ha sido seleccionado correctamente.`,
                })
              }}
            >
              Seleccionar este archivo
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 p-2 bg-muted/40 rounded-md">
        <div className="flex items-center space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={navigateBack} disabled={pathHistory.length === 0}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Atrás</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Breadcrumb className="overflow-x-auto">
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => navigateToBreadcrumb(-1)}>Raíz</BreadcrumbLink>
            </BreadcrumbItem>

            {pathSegments.map((segment, index) => (
              <BreadcrumbItem key={index}>
                <BreadcrumbSeparator>/</BreadcrumbSeparator>
                <BreadcrumbLink onClick={() => navigateToBreadcrumb(index)}>{segment}</BreadcrumbLink>
              </BreadcrumbItem>
            ))}
          </Breadcrumb>
        </div>

        <div className="flex items-center space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => setShowNewFolderDialog(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Nueva carpeta</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Subir archivos</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple />

          <Button variant="outline" size="sm" onClick={listFiles}>
            Actualizar
          </Button>

          {/* Botón para salir del gestor de archivos */}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                window.history.back()
              } else {
                // Fallback si no hay historial
                window.location.href = "/projects"
              }
            }}
          >
            Salir
          </Button>
        </div>
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm">Subiendo archivos...</span>
            <span className="text-sm">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      {/* File List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4">
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                    <Skeleton className="h-3 w-1/2 mt-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Folder className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Carpeta vacía</h3>
            <p className="text-sm text-muted-foreground mt-1">Esta carpeta no contiene archivos ni subcarpetas</p>
            <div className="flex mt-4 space-x-2">
              <Button variant="outline" size="sm" onClick={() => setShowNewFolderDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva carpeta
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Subir archivos
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {files.map((file) => (
              <Card
                key={file.id}
                className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleFileClick(file)}
              >
                <CardContent className="p-0">
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 truncate">
                        {getFileIcon(file)}
                        <div className="truncate">
                          <p className="font-medium truncate" title={file.name}>
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {file.isFolder ? "Carpeta" : formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!file.isFolder && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                if (file.url) {
                                  window.open(file.url, "_blank")
                                }
                              }}
                            >
                              Abrir
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              confirmDelete(file)
                            }}
                            className="text-red-500"
                          >
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {!file.isFolder && file.type === "image" && file.url && (
                      <div className="mt-2 h-24 bg-muted/30 rounded-md overflow-hidden">
                        <img
                          src={file.url || "/placeholder.svg"}
                          alt={file.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Hide broken images
                            ;(e.target as HTMLImageElement).style.display = "none"
                          }}
                        />
                      </div>
                    )}

                    {!file.isFolder && file.type === "video" && (
                      <div className="mt-2 flex items-center justify-center h-24 bg-muted/30 rounded-md">
                        <Film className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}

                    {!file.isFolder && file.type === "audio" && (
                      <div className="mt-2 flex items-center justify-center h-24 bg-muted/30 rounded-md">
                        <Music className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva carpeta</DialogTitle>
            <DialogDescription>Ingresa un nombre para la nueva carpeta</DialogDescription>
          </DialogHeader>

          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Nombre de la carpeta"
            className="mt-2"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                createFolder()
              }
            }}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolderDialog(false)} disabled={isCreatingFolder}>
              Cancelar
            </Button>
            <Button onClick={createFolder} disabled={isCreatingFolder || !newFolderName.trim()}>
              {isCreatingFolder ? <>Creando...</> : <>Crear carpeta</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              {fileToDelete?.isFolder ? (
                <>
                  ¿Estás seguro de que deseas eliminar la carpeta <strong>{fileToDelete?.name}</strong> y todo su
                  contenido? Esta acción no se puede deshacer.
                </>
              ) : (
                <>
                  ¿Estás seguro de que deseas eliminar <strong>{fileToDelete?.name}</strong>? Esta acción no se puede
                  deshacer.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={deleteFile}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {previewFile && getFileIcon(previewFile)}
              <span>{previewFile?.name}</span>
            </DialogTitle>
            <DialogDescription>
              {previewFile?.size && (
                <Badge variant="outline" className="mt-1">
                  {formatFileSize(previewFile.size)}
                </Badge>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2">{renderFilePreview()}</div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Cerrar
            </Button>
            {previewFile?.url && (
              <>
                <Button onClick={() => window.open(previewFile.url, "_blank")}>Abrir en nueva pestaña</Button>
                {onFileSelect && (
                  <Button
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      onFileSelect(previewFile)
                      setShowPreview(false)
                      toast({
                        title: "Archivo seleccionado",
                        description: `${previewFile.name} ha sido seleccionado correctamente.`,
                      })
                    }}
                  >
                    Usar este archivo
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
