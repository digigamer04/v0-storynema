import { createServerSupabaseClient } from "./supabase"
import type { Database } from "@/types/supabase"

export type MediaFile = Database["public"]["Tables"]["media_files"]["Row"]
export type AudioTrack = Database["public"]["Tables"]["audio_tracks"]["Row"]

export async function getMediaFiles(userId: string, type?: string) {
  const supabase = createServerSupabaseClient()

  let query = supabase.from("media_files").select("*").eq("user_id", userId)

  if (type) {
    query = query.eq("type", type)
  }

  const { data, error } = await query.order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching media files:", error)
    throw new Error("Error al obtener los archivos multimedia")
  }

  return data
}

export async function createMediaFile(file: Database["public"]["Tables"]["media_files"]["Insert"]) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase.from("media_files").insert(file).select().single()

  if (error) {
    console.error("Error creating media file:", error)
    throw new Error("Error al crear el archivo multimedia")
  }

  return data
}

export async function deleteMediaFile(fileId: string) {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase.from("media_files").delete().eq("id", fileId)

  if (error) {
    console.error("Error deleting media file:", error)
    throw new Error("Error al eliminar el archivo multimedia")
  }

  return true
}

export async function getAudioTracks(projectId: string) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("audio_tracks")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching audio tracks:", error)
    throw new Error("Error al obtener las pistas de audio")
  }

  return data
}

export async function createAudioTrack(track: Database["public"]["Tables"]["audio_tracks"]["Insert"]) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase.from("audio_tracks").insert(track).select().single()

  if (error) {
    console.error("Error creating audio track:", error)
    throw new Error("Error al crear la pista de audio")
  }

  return data
}

export async function deleteAudioTrack(trackId: string) {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase.from("audio_tracks").delete().eq("id", trackId)

  if (error) {
    console.error("Error deleting audio track:", error)
    throw new Error("Error al eliminar la pista de audio")
  }

  return true
}
