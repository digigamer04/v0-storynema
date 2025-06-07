import { createClientSupabaseClient } from "@/lib/supabase"
import type { Database } from "@/types/supabase"

type Scene = Database["public"]["Tables"]["scenes"]["Row"]

type SceneCallback = (payload: {
  eventType: "INSERT" | "UPDATE" | "DELETE"
  scene: Scene
}) => void

export function subscribeToProjectScenes(projectId: string, cb: SceneCallback) {
  const supabase = createClientSupabaseClient()

  const channel = supabase
    .channel(`scenes-${projectId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "scenes", filter: `project_id=eq.${projectId}` },
      (payload) => {
        const scene = (payload.new ?? payload.old) as Scene
        cb({ eventType: payload.eventType as any, scene })
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
