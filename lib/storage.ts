import { createServerSupabaseClient } from "./supabase"

export async function uploadFile(bucket: string, path: string, file: File) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  })

  if (error) {
    console.error("Error uploading file:", error)
    throw new Error("Error al subir el archivo")
  }

  // Obtener la URL pública del archivo
  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path)

  return publicUrlData.publicUrl
}

export async function deleteFile(bucket: string, path: string) {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase.storage.from(bucket).remove([path])

  if (error) {
    console.error("Error deleting file:", error)
    throw new Error("Error al eliminar el archivo")
  }

  return true
}

export async function getPublicUrl(bucket: string, path: string) {
  const supabase = createServerSupabaseClient()

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)

  return data.publicUrl
}
