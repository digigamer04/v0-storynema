"use client"

import type React from "react"
import { useState, useEffect } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Trash2, UserPlus, ImageIcon, Upload, FolderOpen } from "lucide-react"
import { uploadFile } from "@/lib/supabase-storage"
import { createClientSupabaseClient } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"
import MediaManager from "@/components/media-manager"
import { getUserClient } from "@/lib/auth"

interface ProjectSettingsProps {
  projectId: string
  projectTitle: string
  setProjectTitle: (title: string) => void
  userId?: string
  thumbnailUrl?: string
  onThumbnailUpdate?: (url: string) => void
}

export default function ProjectSettings({
  projectId,
  projectTitle,
  setProjectTitle,
  userId: propUserId,
  thumbnailUrl,
  onThumbnailUpdate,
}: ProjectSettingsProps) {
  const [uploading, setUploading] = useState(false)
  const [thumbnail, setThumbnail] = useState<string | undefined>(thumbnailUrl)
  const [userId, setUserId] = useState<string | undefined>(propUserId)

  // Obtener el userId si no se proporciona como prop
  useEffect(() => {
    const fetchUserId = async () => {
      if (!propUserId) {
        try {
          const user = await getUserClient()
          if (user) {
            console.log("UserId obtenido de getUserClient:", user.id)
            setUserId(user.id)
          } else {
            console.error("No se pudo obtener el usuario actual")
          }
        } catch (error) {
          console.error("Error al obtener el usuario:", error)
        }
      }
    }

    fetchUserId()
  }, [propUserId])

  // Cargar la descripción del proyecto desde localStorage al montar el componente
  useEffect(() => {
    const savedDescription = localStorage.getItem(`project_description_${projectId}`)
    if (savedDescription) {
      // Actualizar el valor del textarea con la descripción guardada
      const textarea = document.getElementById("project-description") as HTMLTextAreaElement
      if (textarea) {
        textarea.value = savedDescription
      }
    }
  }, [projectId])

  // Función para guardar la descripción del proyecto en localStorage
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const description = e.target.value
    localStorage.setItem(`project_description_${projectId}`, description)
  }

  // Función para actualizar la miniatura en la base de datos
  const updateThumbnailInDatabase = async (url: string) => {
    try {
      const supabase = createClientSupabaseClient()
      const { error } = await supabase.from("projects").update({ thumbnail_url: url }).eq("id", projectId)

      if (error) {
        throw error
      }

      // Actualizar el estado local
      setThumbnail(url)

      // Notificar al componente padre si existe la función de callback
      if (onThumbnailUpdate) {
        onThumbnailUpdate(url)
      }

      toast({
        title: "Éxito",
        description: "Imagen de portada actualizada correctamente",
      })
    } catch (error) {
      console.error("Error al actualizar la imagen:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar la imagen. Inténtalo de nuevo.",
        variant: "destructive",
      })
      throw error
    }
  }

  // Función para manejar la carga de la imagen de portada
  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("Evento de cambio de archivo activado")

    if (!e.target.files || e.target.files.length === 0) {
      console.log("No hay archivos seleccionados")
      return
    }

    // Verificar userId antes de continuar
    if (!userId) {
      console.error("Error: userId no disponible")

      // Intentar obtener el userId directamente
      try {
        const user = await getUserClient()
        if (user) {
          console.log("UserId obtenido en el momento de la subida:", user.id)
          setUserId(user.id)
          // Continuar con la subida usando el userId recién obtenido
          await handleUpload(e.target.files[0], user.id)
          return
        }
      } catch (error) {
        console.error("Error al obtener el usuario durante la subida:", error)
      }

      toast({
        title: "Error",
        description: "No se puede subir la imagen sin identificación de usuario. Por favor, inicia sesión nuevamente.",
        variant: "destructive",
      })
      return
    }

    await handleUpload(e.target.files[0], userId)
  }

  // Función auxiliar para manejar la subida real
  const handleUpload = async (file: File, userIdentifier: string) => {
    try {
      setUploading(true)
      console.log("Archivo seleccionado:", file.name, "Tamaño:", file.size, "Tipo:", file.type)
      console.log("userId disponible:", userIdentifier)

      // Validar el tipo de archivo
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Error",
          description: "Por favor, sube solo archivos de imagen",
          variant: "destructive",
        })
        return
      }

      // Validar el tamaño del archivo (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "La imagen no debe superar los 5MB",
          variant: "destructive",
        })
        return
      }

      console.log("Iniciando subida a Supabase Storage con userId:", userIdentifier)

      // Crear un nombre de archivo único para evitar colisiones
      const fileExt = file.name.split(".").pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`
      const filePath = `thumbnails/${projectId}/${fileName}`

      // Subir el archivo a Supabase Storage
      const result = await uploadFile(file, userIdentifier, filePath)
      console.log("Archivo subido correctamente:", result)

      // Actualizar la URL de la miniatura en la base de datos
      await updateThumbnailInDatabase(result.url)

      // Limpiar el input de archivo
      const fileInput = document.getElementById("thumbnail-upload") as HTMLInputElement
      if (fileInput) {
        fileInput.value = ""
      }
    } catch (error) {
      console.error("Error al subir la imagen:", error)
      toast({
        title: "Error",
        description: "No se pudo subir la imagen. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  // Función para manejar la selección de una imagen del gestor de medios
  const handleMediaSelection = async (url: string) => {
    try {
      await updateThumbnailInDatabase(url)
    } catch (error) {
      console.error("Error al seleccionar la imagen:", error)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Información del proyecto</CardTitle>
            <CardDescription>Configura los detalles básicos de tu proyecto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="project-title">Título</Label>
              <Input id="project-title" value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} />
            </div>

            {/* Sección de imagen de portada mejorada */}
            <div className="space-y-2">
              <Label>Imagen de portada</Label>
              <div className="flex flex-col items-center gap-4">
                {thumbnail ? (
                  <div className="relative w-full h-40 rounded-md overflow-hidden border">
                    <img
                      src={thumbnail || "/placeholder.svg"}
                      alt="Portada del proyecto"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-40 rounded-md border border-dashed border-gray-300 bg-gray-50">
                    <ImageIcon className="h-10 w-10 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">No hay imagen de portada</p>
                  </div>
                )}

                <div className="w-full flex gap-2">
                  {/* Botón para subir nueva imagen */}
                  <div className="flex-1">
                    <Button
                      variant="outline"
                      className="w-full flex items-center justify-center gap-2 relative"
                      onClick={() => {
                        if (!userId) {
                          toast({
                            title: "Obteniendo usuario...",
                            description: "Intentando obtener la información de usuario",
                          })
                          getUserClient().then((user) => {
                            if (user) {
                              setUserId(user.id)
                              document.getElementById("thumbnail-upload")?.click()
                            } else {
                              toast({
                                title: "Error",
                                description: "No se pudo obtener el usuario. Por favor, recarga la página.",
                                variant: "destructive",
                              })
                            }
                          })
                          return
                        }
                        document.getElementById("thumbnail-upload")?.click()
                      }}
                      disabled={uploading}
                    >
                      <Upload className="h-4 w-4" />
                      <span>{uploading ? "Subiendo..." : "Subir nueva imagen"}</span>
                    </Button>
                    <input
                      id="thumbnail-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleThumbnailUpload}
                      disabled={uploading}
                      key={`file-upload-${Date.now()}`} // Usar timestamp para forzar recreación
                    />
                  </div>

                  {/* Botón para abrir el gestor de medios */}
                  <div className="flex-1">
                    <MediaManager
                      userId={userId || ""}
                      onSelectMedia={handleMediaSelection}
                      projectId={projectId}
                      mode="select"
                      context="config"
                      buttonLabel="Seleccionar del gestor"
                      buttonVariant="outline"
                      buttonClassName="w-full flex items-center justify-center gap-2"
                      buttonIcon={<FolderOpen className="h-4 w-4" />}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="project-description">Descripción</Label>
              <Textarea
                id="project-description"
                placeholder="Describe tu proyecto..."
                defaultValue="Drama psicológico sobre un viaje de autodescubrimiento"
                onChange={handleDescriptionChange}
              />
            </div>
            <div>
              <Label htmlFor="project-genre">Género</Label>
              <Select defaultValue="drama">
                <SelectTrigger id="project-genre">
                  <SelectValue placeholder="Seleccionar género" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="drama">Drama</SelectItem>
                  <SelectItem value="comedy">Comedia</SelectItem>
                  <SelectItem value="thriller">Thriller</SelectItem>
                  <SelectItem value="scifi">Ciencia Ficción</SelectItem>
                  <SelectItem value="romance">Romance</SelectItem>
                  <SelectItem value="horror">Terror</SelectItem>
                  <SelectItem value="action">Acción</SelectItem>
                  <SelectItem value="documentary">Documental</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="project-format">Formato</Label>
              <Select defaultValue="feature">
                <SelectTrigger id="project-format">
                  <SelectValue placeholder="Seleccionar formato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feature">Largometraje</SelectItem>
                  <SelectItem value="short">Cortometraje</SelectItem>
                  <SelectItem value="series">Serie</SelectItem>
                  <SelectItem value="webseries">Webserie</SelectItem>
                  <SelectItem value="commercial">Comercial</SelectItem>
                  <SelectItem value="music-video">Videoclip</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Parámetros de IA</CardTitle>
            <CardDescription>Configura cómo la IA asistirá en tu proyecto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="ai-script">Asistencia en guión</Label>
                <p className="text-sm text-muted-foreground">
                  Permite que la IA genere y sugiera contenido para el guión
                </p>
              </div>
              <Switch id="ai-script" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="ai-storyboard">Asistencia en storyboard</Label>
                <p className="text-sm text-muted-foreground">
                  Permite que la IA genere imágenes y sugerencias visuales
                </p>
              </div>
              <Switch id="ai-storyboard" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="ai-feedback">Retroalimentación automática</Label>
                <p className="text-sm text-muted-foreground">
                  Recibe sugerencias de mejora basadas en análisis de la IA
                </p>
              </div>
              <Switch id="ai-feedback" defaultChecked />
            </div>
            <div>
              <Label htmlFor="ai-style">Estilo narrativo preferido</Label>
              <Select defaultValue="balanced">
                <SelectTrigger id="ai-style">
                  <SelectValue placeholder="Seleccionar estilo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="concise">Conciso y directo</SelectItem>
                  <SelectItem value="descriptive">Descriptivo y detallado</SelectItem>
                  <SelectItem value="balanced">Equilibrado</SelectItem>
                  <SelectItem value="poetic">Poético y metafórico</SelectItem>
                  <SelectItem value="technical">Técnico y preciso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle>Colaboradores</CardTitle>
            <CardDescription>Gestiona quién tiene acceso a tu proyecto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>TÚ</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">Tú</p>
                    <p className="text-sm text-muted-foreground">Propietario</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>CR</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">Carlos Rodríguez</p>
                    <p className="text-sm text-muted-foreground">Editor</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>AL</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">Ana López</p>
                    <p className="text-sm text-muted-foreground">Visualizador</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button variant="outline" className="w-full flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Invitar colaborador
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Exportación</CardTitle>
            <CardDescription>Configura las opciones de exportación del proyecto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="export-script">Formato de guión</Label>
              <Select defaultValue="pdf">
                <SelectTrigger id="export-script">
                  <SelectValue placeholder="Seleccionar formato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="final-draft">Final Draft (.fdx)</SelectItem>
                  <SelectItem value="fountain">Fountain (.fountain)</SelectItem>
                  <SelectItem value="celtx">Celtx</SelectItem>
                  <SelectItem value="word">Microsoft Word (.docx)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="export-storyboard">Formato de storyboard</Label>
              <Select defaultValue="pdf">
                <SelectTrigger id="export-storyboard">
                  <SelectValue placeholder="Seleccionar formato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="images">Imágenes individuales (.jpg)</SelectItem>
                  <SelectItem value="ppt">PowerPoint (.pptx)</SelectItem>
                  <SelectItem value="video">Video animático (.mp4)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="include-metadata">Incluir metadatos</Label>
                <p className="text-sm text-muted-foreground">
                  Añadir información técnica y de producción en la exportación
                </p>
              </div>
              <Switch id="include-metadata" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="include-comments">Incluir comentarios</Label>
                <p className="text-sm text-muted-foreground">Añadir comentarios y notas de colaboradores</p>
              </div>
              <Switch id="include-comments" defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
