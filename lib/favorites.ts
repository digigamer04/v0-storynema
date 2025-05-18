import { createServerSupabaseClient } from "./supabase"
import type { Database } from "@/types/supabase"

export type FavoriteCamera = Database["public"]["Tables"]["favorite_cameras"]["Row"]
export type FavoriteLens = Database["public"]["Tables"]["favorite_lenses"]["Row"]

export async function getFavoriteCameras(userId: string) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("favorite_cameras")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching favorite cameras:", error)
    throw new Error("Error al obtener las cámaras favoritas")
  }

  return data
}

export async function createFavoriteCamera(camera: Database["public"]["Tables"]["favorite_cameras"]["Insert"]) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase.from("favorite_cameras").insert(camera).select().single()

  if (error) {
    console.error("Error creating favorite camera:", error)
    throw new Error("Error al crear la cámara favorita")
  }

  return data
}

export async function deleteFavoriteCamera(cameraId: string) {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase.from("favorite_cameras").delete().eq("id", cameraId)

  if (error) {
    console.error("Error deleting favorite camera:", error)
    throw new Error("Error al eliminar la cámara favorita")
  }

  return true
}

export async function getFavoriteLenses(userId: string) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("favorite_lenses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching favorite lenses:", error)
    throw new Error("Error al obtener los lentes favoritos")
  }

  return data
}

export async function createFavoriteLens(lens: Database["public"]["Tables"]["favorite_lenses"]["Insert"]) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase.from("favorite_lenses").insert(lens).select().single()

  if (error) {
    console.error("Error creating favorite lens:", error)
    throw new Error("Error al crear el lente favorito")
  }

  return data
}

export async function deleteFavoriteLens(lensId: string) {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase.from("favorite_lenses").delete().eq("id", lensId)

  if (error) {
    console.error("Error deleting favorite lens:", error)
    throw new Error("Error al eliminar el lente favorito")
  }

  return true
}
