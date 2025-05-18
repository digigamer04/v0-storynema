import { createClientSupabaseClient } from "./supabase"

// Función para subir un archivo a Supabase Storage
export async function uploadFile(file: File, userId: string, customPath?: string) {
  try {
    const supabase = createClientSupabaseClient()

    // Crear un nombre de archivo único para evitar colisiones
    const timestamp = Date.now()
    const fileName = customPath || `${timestamp}_${file.name}`
    const filePath = `${userId}/${fileName}`

    // Subir el archivo
    const { data, error } = await supabase.storage.from("media-files").upload(filePath, file, {
      cacheControl: "3600",
      upsert: true, // Permitir sobreescribir si existe
    })

    if (error) {
      console.error("Error uploading file:", error)
      throw error
    }

    // Obtener la URL pública del archivo
    const { data: urlData } = supabase.storage.from("media-files").getPublicUrl(filePath)

    return {
      path: filePath,
      url: urlData.publicUrl,
      name: fileName,
    }
  } catch (error) {
    console.error("Error in uploadFile:", error)
    throw error
  }
}

// Función para listar los archivos de un usuario
export async function listUserFiles(userId: string) {
  try {
    if (!userId) {
      console.error("listUserFiles: No se proporcionó userId")
      throw new Error("Se requiere un ID de usuario para listar archivos")
    }

    console.log("Listando archivos para el usuario:", userId)
    const supabase = createClientSupabaseClient()

    // Listar archivos en la carpeta del usuario
    const { data, error } = await supabase.storage.from("media-files").list(userId, {
      sortBy: { column: "created_at", order: "desc" },
    })

    if (error) {
      console.error("Error listing files:", error)
      throw error
    }

    console.log("Archivos encontrados:", data?.length || 0)

    if (!data || data.length === 0) {
      return []
    }

    // Obtener URLs públicas para cada archivo
    const filesWithUrls = await Promise.all(
      data.map(async (file) => {
        const filePath = `${userId}/${file.name}`
        const { data: urlData } = supabase.storage.from("media-files").getPublicUrl(filePath)

        return {
          ...file,
          url: urlData.publicUrl,
          path: filePath,
        }
      }),
    )

    return filesWithUrls
  } catch (error) {
    console.error("Error in listUserFiles:", error)
    throw error
  }
}

// Función para eliminar un archivo
export async function deleteFile(filePath: string) {
  try {
    const supabase = createClientSupabaseClient()

    const { error } = await supabase.storage.from("media-files").remove([filePath])

    if (error) {
      console.error("Error deleting file:", error)
      throw error
    }

    return true
  } catch (error) {
    console.error("Error in deleteFile:", error)
    throw error
  }
}

// Función para crear una carpeta (en Supabase Storage no existen carpetas reales,
// pero podemos simularlas con la estructura de nombres de archivos)
export async function createFolder(userId: string, folderName: string) {
  try {
    const supabase = createClientSupabaseClient()

    // Crear un archivo vacío con el nombre de la carpeta
    const { data, error } = await supabase.storage
      .from("media-files")
      .upload(`${userId}/${folderName}/.folder`, new Blob([""]), {
        cacheControl: "3600",
        upsert: false,
      })

    if (error && error.message !== "The resource already exists") {
      console.error("Error creating folder:", error)
      throw error
    }

    return true
  } catch (error) {
    console.error("Error in createFolder:", error)
    throw error
  }
}
