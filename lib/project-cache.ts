/**
 * Sistema de cache en memoria para datos del proyecto
 * Optimiza el rendimiento al cambiar entre pestañas
 */

interface ProjectData {
  id: string
  title: string
  description?: string
  user_id: string
  created_at: string
  updated_at: string
}

interface SceneData {
  id: string
  project_id: string
  title: string
  content: string
  order_index: number
  created_at: string
  updated_at: string
}

interface StoryboardData {
  scenes: any[]
  metadata: any
  settings: any
}

interface ProjectSettings {
  title: string
  description?: string
  genre?: string
  format?: string
  [key: string]: any
}

interface CachedProject {
  project: ProjectData
  scenes: SceneData[]
  storyboard: StoryboardData
  settings: ProjectSettings
  lastUpdated: number
  isLoading: boolean
}

class ProjectCache {
  private static instance: ProjectCache
  private cache: Map<string, CachedProject> = new Map()
  private activeProjectId: string | null = null

  private constructor() {}

  public static getInstance(): ProjectCache {
    if (!ProjectCache.instance) {
      ProjectCache.instance = new ProjectCache()
    }
    return ProjectCache.instance
  }

  // Establecer el proyecto activo
  public setActiveProject(projectId: string): void {
    this.activeProjectId = projectId
  }

  // Obtener el proyecto activo
  public getActiveProjectId(): string | null {
    return this.activeProjectId
  }

  // Verificar si un proyecto está en cache
  public hasProject(projectId: string): boolean {
    return this.cache.has(projectId)
  }

  // Obtener datos del proyecto desde cache
  public getProject(projectId: string): CachedProject | null {
    return this.cache.get(projectId) || null
  }

  // Cargar proyecto completo en cache
  public async loadProject(projectId: string, supabase: any): Promise<CachedProject> {
    console.log(`Cargando proyecto ${projectId} en cache...`)

    // Marcar como cargando
    const loadingProject: CachedProject = {
      project: {} as ProjectData,
      scenes: [],
      storyboard: { scenes: [], metadata: {}, settings: {} },
      settings: { title: "" },
      lastUpdated: Date.now(),
      isLoading: true,
    }
    this.cache.set(projectId, loadingProject)

    try {
      // Cargar datos del proyecto en paralelo
      const [projectResult, scenesResult] = await Promise.all([
        supabase.from("projects").select("*").eq("id", projectId).single(),
        supabase.from("scenes").select("*").eq("project_id", projectId).order("order_index", { ascending: true }),
      ])

      if (projectResult.error) {
        throw new Error(`Error al cargar proyecto: ${projectResult.error.message}`)
      }

      if (scenesResult.error) {
        throw new Error(`Error al cargar escenas: ${scenesResult.error.message}`)
      }

      // Cargar datos del storyboard desde localStorage si existen
      let storyboardData: StoryboardData = { scenes: [], metadata: {}, settings: {} }
      try {
        const savedStoryboard = localStorage.getItem(`storynema_storyboard_data_${projectId}`)
        if (savedStoryboard) {
          storyboardData = JSON.parse(savedStoryboard)
        }
      } catch (error) {
        console.warn("Error al cargar datos del storyboard desde localStorage:", error)
      }

      // Crear el objeto de proyecto cacheado
      const cachedProject: CachedProject = {
        project: projectResult.data,
        scenes: scenesResult.data || [],
        storyboard: storyboardData,
        settings: {
          title: projectResult.data.title,
          description: projectResult.data.description,
          genre: projectResult.data.genre,
          format: projectResult.data.format,
        },
        lastUpdated: Date.now(),
        isLoading: false,
      }

      this.cache.set(projectId, cachedProject)
      console.log(`Proyecto ${projectId} cargado en cache exitosamente`)

      return cachedProject
    } catch (error) {
      console.error("Error al cargar proyecto en cache:", error)
      this.cache.delete(projectId)
      throw error
    }
  }

  // Actualizar escenas en cache
  public updateScenes(projectId: string, scenes: SceneData[]): void {
    const project = this.cache.get(projectId)
    if (project) {
      project.scenes = [...scenes].sort((a, b) => a.order_index - b.order_index)
      project.lastUpdated = Date.now()
      this.cache.set(projectId, project)
    }
  }

  // Actualizar datos del storyboard en cache
  public updateStoryboard(projectId: string, storyboardData: StoryboardData): void {
    const project = this.cache.get(projectId)
    if (project) {
      project.storyboard = storyboardData
      project.lastUpdated = Date.now()
      this.cache.set(projectId, project)
    }
  }

  // Actualizar configuración del proyecto en cache
  public updateSettings(projectId: string, settings: ProjectSettings): void {
    const project = this.cache.get(projectId)
    if (project) {
      project.settings = { ...project.settings, ...settings }
      project.project = { ...project.project, ...settings }
      project.lastUpdated = Date.now()
      this.cache.set(projectId, project)
    }
  }

  // Añadir nueva escena al cache
  public addScene(projectId: string, scene: SceneData): void {
    const project = this.cache.get(projectId)
    if (project) {
      project.scenes.push(scene)
      project.scenes.sort((a, b) => a.order_index - b.order_index)
      project.lastUpdated = Date.now()
      this.cache.set(projectId, project)
    }
  }

  // Eliminar escena del cache
  public removeScene(projectId: string, sceneId: string): void {
    const project = this.cache.get(projectId)
    if (project) {
      project.scenes = project.scenes.filter((scene) => scene.id !== sceneId)
      project.lastUpdated = Date.now()
      this.cache.set(projectId, project)
    }
  }

  // Actualizar escena específica en cache
  public updateScene(projectId: string, sceneId: string, updates: Partial<SceneData>): void {
    const project = this.cache.get(projectId)
    if (project) {
      const sceneIndex = project.scenes.findIndex((scene) => scene.id === sceneId)
      if (sceneIndex !== -1) {
        project.scenes[sceneIndex] = { ...project.scenes[sceneIndex], ...updates }
        project.lastUpdated = Date.now()
        this.cache.set(projectId, project)
      }
    }
  }

  // Limpiar cache de un proyecto específico
  public clearProject(projectId: string): void {
    this.cache.delete(projectId)
    if (this.activeProjectId === projectId) {
      this.activeProjectId = null
    }
    console.log(`Cache limpiado para el proyecto ${projectId}`)
  }

  // Limpiar todo el cache
  public clearAll(): void {
    this.cache.clear()
    this.activeProjectId = null
    console.log("Cache completo limpiado")
  }

  // Obtener estadísticas del cache
  public getCacheStats(): { projectCount: number; totalSize: number; activeProject: string | null } {
    return {
      projectCount: this.cache.size,
      totalSize: JSON.stringify(Array.from(this.cache.values())).length,
      activeProject: this.activeProjectId,
    }
  }

  // Sincronizar cache con localStorage
  public syncToLocalStorage(projectId: string): void {
    const project = this.cache.get(projectId)
    if (project) {
      try {
        localStorage.setItem(`storynema_scenes_${projectId}`, JSON.stringify(project.scenes))
        localStorage.setItem(`storynema_storyboard_data_${projectId}`, JSON.stringify(project.storyboard))
        localStorage.setItem(`storynema_last_update_time_${projectId}`, project.lastUpdated.toString())
      } catch (error) {
        console.error("Error al sincronizar cache con localStorage:", error)
      }
    }
  }
}

// Exportar la instancia única
export const projectCache = ProjectCache.getInstance()

// Funciones de utilidad
export function getCachedProject(projectId: string): CachedProject | null {
  return projectCache.getProject(projectId)
}

export function isCacheLoading(projectId: string): boolean {
  const project = projectCache.getProject(projectId)
  return project?.isLoading || false
}

export function getCachedScenes(projectId: string): SceneData[] {
  const project = projectCache.getProject(projectId)
  return project?.scenes || []
}

export function getCachedStoryboard(projectId: string): StoryboardData {
  const project = projectCache.getProject(projectId)
  return project?.storyboard || { scenes: [], metadata: {}, settings: {} }
}

export function getCachedSettings(projectId: string): ProjectSettings {
  const project = projectCache.getProject(projectId)
  return project?.settings || { title: "" }
}
