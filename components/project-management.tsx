"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Pencil,
  Trash2,
  Copy,
  RotateCcw,
  Clock,
  Filter,
  SortAsc,
  AlertCircle,
  Loader2,
  Check,
  CheckSquare,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import { createClientSupabaseClient } from "@/lib/supabase"

interface ProjectManagementProps {
  userId: string
}

export default function ProjectManagement({ userId }: ProjectManagementProps) {
  const router = useRouter()
  const [projects, setProjects] = useState<any[]>([])
  const [filteredProjects, setFilteredProjects] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("updated_at")
  const [sortOrder, setSortOrder] = useState("desc")
  const [filterGenre, setFilterGenre] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [selectionMode, setSelectionMode] = useState(false)

  // Estados para diálogos
  const [projectToDelete, setProjectToDelete] = useState<any | null>(null)
  const [projectToClone, setProjectToClone] = useState<any | null>(null)
  const [newProjectTitle, setNewProjectTitle] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [backups, setBackups] = useState<any[]>([])
  const [isLoadingBackups, setIsLoadingBackups] = useState(false)
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null)

  // Cargar proyectos al iniciar
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Usar directamente el cliente de Supabase
        const supabase = createClientSupabaseClient()
        const { data, error: supabaseError } = await supabase
          .from("projects")
          .select("*")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })

        if (supabaseError) {
          throw supabaseError
        }

        console.log("Loaded projects:", data)
        setProjects(data || [])
      } catch (err) {
        console.error("Error loading projects:", err)
        setError("Error loading projects. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    if (userId) {
      loadProjects()
    }
  }, [userId])

  // Filtrar y ordenar proyectos cuando cambian los criterios
  useEffect(() => {
    if (!projects) return

    let filtered = [...projects]

    // Filtrar por pestaña activa
    if (activeTab === "active") {
      filtered = filtered.filter((p) => p.status === "active")
    } else if (activeTab === "archived") {
      filtered = filtered.filter((p) => p.status === "archived")
    }

    // Filtrar por término de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (p) => p.title?.toLowerCase().includes(term) || p.description?.toLowerCase().includes(term),
      )
    }

    // Filtrar por género
    if (filterGenre !== "all") {
      filtered = filtered.filter((p) => p.genre === filterGenre)
    }

    // Filtrar por estado
    if (filterStatus !== "all") {
      filtered = filtered.filter((p) => p.status === filterStatus)
    }

    // Ordenar
    filtered.sort((a, b) => {
      let valueA = a[sortBy]
      let valueB = b[sortBy]

      // Manejar valores nulos
      if (valueA === null) valueA = sortBy === "updated_at" ? "1970-01-01" : ""
      if (valueB === null) valueB = sortBy === "updated_at" ? "1970-01-01" : ""

      // Ordenar
      if (sortOrder === "asc") {
        return valueA > valueB ? 1 : valueA < valueB ? -1 : 0
      } else {
        return valueA < valueB ? 1 : valueA > valueB ? -1 : 0
      }
    })

    setFilteredProjects(filtered)
  }, [projects, activeTab, searchTerm, filterGenre, filterStatus, sortBy, sortOrder])

  // Funciones para manejar acciones en proyectos
  const handleDeleteProject = async () => {
    if (!projectToDelete) return

    try {
      setIsProcessing(true)

      // Usar directamente el cliente de Supabase
      const supabase = createClientSupabaseClient()
      const { error } = await supabase.from("projects").delete().eq("id", projectToDelete.id)

      if (error) {
        throw error
      }

      // Actualizar la lista de proyectos
      setProjects(projects.filter((p) => p.id !== projectToDelete.id))

      toast({
        title: "Proyecto eliminado",
        description: "El proyecto ha sido eliminado correctamente",
      })
    } catch (error) {
      console.error("Error deleting project:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el proyecto. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setProjectToDelete(null)
    }
  }

  const handleCloneProject = async () => {
    if (!projectToClone || !newProjectTitle.trim()) return

    try {
      setIsProcessing(true)

      // Obtener el proyecto original
      const supabase = createClientSupabaseClient()
      const { data: originalProject, error: getError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectToClone.id)
        .single()

      if (getError) {
        throw getError
      }

      // Crear un nuevo proyecto con los mismos datos pero diferente título
      const newProjectData = {
        ...originalProject,
        title: newProjectTitle,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // Eliminar explícitamente el id para que Supabase genere uno nuevo
      delete newProjectData.id

      // Insertar el nuevo proyecto
      const { data: clonedProject, error: insertError } = await supabase
        .from("projects")
        .insert([newProjectData])
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      // Añadir el proyecto clonado a la lista
      setProjects([clonedProject, ...projects])

      toast({
        title: "Proyecto clonado",
        description: "El proyecto ha sido clonado correctamente",
      })

      // Redirigir al nuevo proyecto
      router.push(`/projects/${clonedProject.id}`)
    } catch (error) {
      console.error("Error cloning project:", error)
      toast({
        title: "Error",
        description: "No se pudo clonar el proyecto. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setProjectToClone(null)
      setNewProjectTitle("")
    }
  }

  const handleBackupProject = async (project: any) => {
    try {
      setIsProcessing(true)

      // Implementar la lógica de backup directamente aquí
      const supabase = createClientSupabaseClient()

      // Obtener las escenas del proyecto
      const { data: scenes, error: scenesError } = await supabase
        .from("scenes")
        .select("*")
        .eq("project_id", project.id)

      if (scenesError) {
        throw scenesError
      }

      // Crear un objeto de backup
      const backupData = {
        project,
        scenes,
        timestamp: new Date().toISOString(),
      }

      // Guardar en localStorage como solución temporal
      localStorage.setItem(`backup_${project.id}_${Date.now()}`, JSON.stringify(backupData))

      toast({
        title: "Copia de seguridad creada",
        description: "La copia de seguridad ha sido creada correctamente",
      })
    } catch (error) {
      console.error("Error backing up project:", error)
      toast({
        title: "Error",
        description: "No se pudo crear la copia de seguridad. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRestoreProject = async () => {
    if (!selectedBackup) return

    try {
      setIsProcessing(true)

      // Implementar la lógica de restauración
      // En una implementación real, esto se haría a través de una API

      // Simulación de restauración exitosa
      const backupData = JSON.parse(localStorage.getItem(selectedBackup) || "{}")

      if (!backupData.project) {
        throw new Error("Datos de backup inválidos")
      }

      // Simular proyecto restaurado
      const restoredProject = {
        ...backupData.project,
        title: `${backupData.project.title} (Restaurado)`,
        updated_at: new Date().toISOString(),
      }

      // Actualizar la lista de proyectos (simulado)
      setProjects([restoredProject, ...projects.filter((p) => p.id !== restoredProject.id)])

      toast({
        title: "Proyecto restaurado",
        description: "El proyecto ha sido restaurado correctamente",
      })

      // Redirigir al proyecto restaurado
      router.push(`/projects/${restoredProject.id}`)
    } catch (error) {
      console.error("Error restoring project:", error)
      toast({
        title: "Error",
        description: "No se pudo restaurar el proyecto. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setSelectedBackup(null)
    }
  }

  const toggleSelectedProject = (projectId: string) => {
    setSelectedProjects((prevSelected) =>
      prevSelected.includes(projectId) ? prevSelected.filter((id) => id !== projectId) : [...prevSelected, projectId],
    )
  }

  const handleBulkDelete = async () => {
    if (selectedProjects.length === 0) {
      toast({
        title: "Error",
        description: "No projects selected for deletion.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsProcessing(true)

      // Usar directamente el cliente de Supabase
      const supabase = createClientSupabaseClient()
      const { error } = await supabase.from("projects").delete().in("id", selectedProjects)

      if (error) {
        throw error
      }

      // Actualizar la lista de proyectos
      setProjects(projects.filter((p) => !selectedProjects.includes(p.id)))
      setSelectedProjects([])

      toast({
        title: "Projects deleted",
        description: "The selected projects have been deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting projects:", error)
      toast({
        title: "Error",
        description: "Failed to delete the selected projects. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Renderizar estado de carga
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    )
  }

  // Renderizar mensaje de error
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filtros y búsqueda */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex-1">
          <Input
            placeholder="Buscar proyectos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={filterGenre} onValueChange={setFilterGenre}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Género" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los géneros</SelectItem>
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

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[150px]">
              <SortAsc className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated_at">Última actualización</SelectItem>
              <SelectItem value="created_at">Fecha de creación</SelectItem>
              <SelectItem value="title">Título</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Orden" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Descendente</SelectItem>
              <SelectItem value="asc">Ascendente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end mb-4 gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setSelectionMode(!selectionMode)
            if (!selectionMode) {
              setSelectedProjects([])
            }
          }}
        >
          {selectionMode ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Finalizar selección
            </>
          ) : (
            <>
              <CheckSquare className="h-4 w-4 mr-2" />
              Modo selección
            </>
          )}
        </Button>

        {selectionMode && (
          <Button
            variant="destructive"
            onClick={handleBulkDelete}
            disabled={isProcessing || selectedProjects.length === 0}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar seleccionados ({selectedProjects.length})
              </>
            )}
          </Button>
        )}
      </div>

      {/* Pestañas */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="active">Activos</TabsTrigger>
          <TabsTrigger value="archived">Archivados</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {renderProjectList(filteredProjects)}
        </TabsContent>

        <TabsContent value="active" className="mt-6">
          {renderProjectList(filteredProjects)}
        </TabsContent>

        <TabsContent value="archived" className="mt-6">
          {renderProjectList(filteredProjects)}
        </TabsContent>
      </Tabs>

      {/* Diálogo de confirmación para eliminar proyecto */}
      <Dialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar proyecto</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar el proyecto "{projectToDelete?.title}"? Esta acción no se puede
              deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectToDelete(null)} disabled={isProcessing}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteProject} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para clonar proyecto */}
      <Dialog open={!!projectToClone} onOpenChange={(open) => !open && setProjectToClone(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clonar proyecto</DialogTitle>
            <DialogDescription>
              Introduce un nuevo título para la copia del proyecto "{projectToClone?.title}".
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Nuevo título"
              value={newProjectTitle}
              onChange={(e) => setNewProjectTitle(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectToClone(null)} disabled={isProcessing}>
              Cancelar
            </Button>
            <Button onClick={handleCloneProject} disabled={isProcessing || !newProjectTitle.trim()}>
              {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Copy className="h-4 w-4 mr-2" />}
              Clonar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para restaurar copia de seguridad */}
      <Dialog open={!!selectedBackup} onOpenChange={(open) => !open && setSelectedBackup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurar copia de seguridad</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres restaurar esta copia de seguridad? Se sobrescribirán los datos actuales del
              proyecto.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedBackup(null)} disabled={isProcessing}>
              Cancelar
            </Button>
            <Button onClick={handleRestoreProject} disabled={isProcessing}>
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Restaurar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )

  // Función para renderizar la lista de proyectos
  function renderProjectList(projects: any[]) {
    if (projects.length === 0) {
      return (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">
            No hay proyectos que coincidan con los criterios de búsqueda.
          </p>
          <Link href="/projects-new">
            <Button className="mt-4">Crear nuevo proyecto</Button>
          </Link>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Card
            key={project.id}
            className={`overflow-hidden ${selectionMode ? "cursor-pointer" : ""} ${
              selectionMode && selectedProjects.includes(project.id) ? "ring-2 ring-primary ring-offset-2" : ""
            }`}
            onClick={() => {
              if (selectionMode) {
                toggleSelectedProject(project.id)
              }
            }}
          >
            <CardHeader className="pb-2 relative">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{project.title}</CardTitle>
                {project.status && (
                  <Badge variant={project.status === "active" ? "default" : "secondary"}>
                    {project.status === "active" ? "Activo" : "Archivado"}
                  </Badge>
                )}
              </div>

              <CardDescription className="line-clamp-2">{project.description || "Sin descripción"}</CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="flex flex-wrap gap-2 mb-2">
                {project.genre && <Badge variant="outline">{project.genre}</Badge>}
                {project.format && <Badge variant="outline">{project.format}</Badge>}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                Actualizado: {new Date(project.updated_at).toLocaleDateString()}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between pt-2">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/projects/${project.id}`}>
                    <Pencil className="h-4 w-4 mr-1" />
                    Editar
                  </Link>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setProjectToClone(project)}>
                  <Copy className="h-4 w-4 mr-1" />
                  Clonar
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    )
  }
}
