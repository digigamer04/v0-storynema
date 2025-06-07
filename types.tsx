export interface Scene {
  id: string
  project_id: string
  title: string
  content: string
  order_index: number
  created_at?: string
  updated_at?: string
}

export interface ScriptScene {
  id: string
  title: string
  content?: string
  description?: string
  order_index?: number
  location?: string
  time?: string
  images?: any[]
}
