export interface LocalProject {
  id: string
  title: string
  description: string
  user_id: string
  created_at: string
  updated_at: string
  scenes: LocalScene[]
  storyboard?: { scenes: unknown[]; metadata: Record<string, unknown>; settings: Record<string, unknown> }
}

export interface LocalScene {
  id: string
  project_id: string
  title: string
  content: string
  order_index: number
  created_at: string
  updated_at: string
}

const DB_NAME = "storynema-local"
const DB_VERSION = 1
const STORE = "projects"

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB no está disponible en este navegador"))
      return
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error("No se pudo abrir IndexedDB"))
  })
}

export async function saveLocalProject(project: LocalProject): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).put(project)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error("No se pudo guardar el proyecto local"))
  })
  db.close()
}

export async function listLocalProjects(userId?: string): Promise<LocalProject[]> {
  const db = await openDb()
  const projects = await new Promise<LocalProject[]>((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).getAll()
    request.onsuccess = () => resolve((request.result || []).filter((project: LocalProject) => !userId || project.user_id === userId))
    request.onerror = () => reject(request.error || new Error("No se pudieron leer los proyectos locales"))
  })
  db.close()
  return projects.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

export async function deleteLocalProject(id: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error("No se pudo eliminar el proyecto local"))
  })
  db.close()
}

export async function getLocalProject(id: string): Promise<LocalProject | null> {
  const db = await openDb()
  const project = await new Promise<LocalProject | null>((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).get(id)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error || new Error("No se pudo leer el proyecto local"))
  })
  db.close()
  return project
}

export async function updateLocalProject(id: string, patch: Partial<LocalProject>): Promise<LocalProject> {
  const current = await getLocalProject(id)
  if (!current) throw new Error("Proyecto local no encontrado")
  const updated = { ...current, ...patch, updated_at: new Date().toISOString() }
  await saveLocalProject(updated)
  return updated
}

export function isLocalProjectId(id: string): boolean {
  return id.startsWith("local-")
}

export function createLocalProjectId(): string {
  return `local-${crypto.randomUUID()}`
}

export function createLocalSceneId(): string {
  return `local-scene-${crypto.randomUUID()}`
}
