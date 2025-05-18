import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Clock, Users, Bookmark } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

interface ProjectCardProps {
  project: {
    id: string
    title: string
    description: string | null
    created_at?: string
    updated_at?: string
    lastEdited?: string
    progress?: number
    collaborators?: number
    thumbnail?: string
    thumbnail_url?: string
    isSample?: boolean
    is_sample?: boolean
    user_id?: string
  }
}

// Cambiando a exportación nombrada para resolver el error de importación
export function ProjectCard({ project }: ProjectCardProps) {
  // Determinar si es un proyecto de ejemplo
  const isSample = project.isSample || project.is_sample

  // Determinar la URL de enlace basada en si es un proyecto de ejemplo
  // Para proyectos de ejemplo, usar una ruta específica
  const linkUrl = isSample ? `/sample-projects/${project.id}` : `/projects/${project.id}`

  // Determinar la última edición
  const lastEdited =
    project.lastEdited || (project.updated_at ? new Date(project.updated_at).toLocaleDateString() : "Sin editar")

  // Determinar la imagen de miniatura
  const thumbnail = project.thumbnail || project.thumbnail_url || "/placeholder.svg?height=200&width=300"

  // Valores por defecto
  const progress = project.progress || 0
  const collaborators = project.collaborators || 1
  const description = project.description || "Sin descripción"

  return (
    <Link href={linkUrl}>
      <Card className="h-full hover:shadow-md transition-shadow">
        <CardHeader className="p-0">
          <div className="relative h-40 w-full">
            <Image
              src={thumbnail || "/placeholder.svg"}
              alt={project.title}
              fill
              className="object-cover rounded-t-lg"
            />
            {isSample && (
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="bg-amber-500 text-white">
                  <Bookmark className="h-3 w-3 mr-1" />
                  Ejemplo
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <CardTitle className="mb-2">{project.title}</CardTitle>
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {lastEdited}
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {collaborators}
            </div>
          </div>
          <Progress value={progress} className="h-1" />
        </CardContent>
        <CardFooter className="pt-0">
          <div className="flex -space-x-2">
            {[...Array(collaborators)].map((_, i) => (
              <Avatar key={i} className="h-6 w-6 border-2 border-background">
                <AvatarFallback className="text-xs">{`U${i + 1}`}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        </CardFooter>
      </Card>
    </Link>
  )
}

// Mantener también la exportación por defecto para compatibilidad con código existente
export default ProjectCard
