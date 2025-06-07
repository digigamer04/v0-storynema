import { createServerSupabaseClient, createServerSupabaseClientWithCookies } from "./supabase"

// Obtener un proyecto por ID
export async function getProject(projectId: string, cookieStore?: any) {
  try {
    console.log(`Obteniendo proyecto con ID: ${projectId}`)

    // Obtener el usuario actual
    const supabase = createServerSupabaseClientWithCookies(cookieStore)
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) {
      console.error("Error getting session:", error.message)
      throw new Error(`Error getting session: ${error.message}`)
    }

    if (!session?.user) {
      console.error("Usuario no autenticado al intentar obtener proyecto")
      throw new Error("Debes iniciar sesión para ver este proyecto")
    }

    const user = session.user

    // Crear cliente de Supabase
    const supabaseClient = createServerSupabaseClientWithCookies(cookieStore)

    // Obtener el proyecto
    const { data: project, error: projectError } = await supabaseClient
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single()

    if (projectError) {
      console.error("Error al obtener proyecto:", projectError.message)
      throw new Error(`Error al obtener el proyecto: ${projectError.message}`)
    }

    if (!project) {
      console.error(`Proyecto con ID ${projectId} no encontrado`)
      throw new Error("Proyecto no encontrado")
    }

    // Verificar que el usuario es propietario del proyecto
    if (project.user_id !== user.id && !project.is_sample) {
      console.error(`Usuario ${user.id} no es propietario del proyecto ${projectId}`)
      throw new Error("No tienes permiso para ver este proyecto")
    }

    console.log(`Proyecto obtenido correctamente: ${project.title}`)
    return project
  } catch (error) {
    console.error("Error en getProject:", error)
    throw error
  }
}

// Obtener todos los proyectos de un usuario
export async function getUserProjects(userId: string) {
  try {
    console.log(`Obteniendo proyectos del usuario: ${userId}`)

    // Crear cliente de Supabase
    const supabase = createServerSupabaseClientWithCookies()

    // Obtener los proyectos del usuario
    const { data: projects, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })

    if (error) {
      console.error("Error al obtener proyectos del usuario:", error.message)
      throw new Error(`Error al obtener proyectos: ${error.message}`)
    }

    console.log(`Se encontraron ${projects?.length || 0} proyectos para el usuario ${userId}`)
    return projects || []
  } catch (error) {
    console.error("Error en getUserProjects:", error)
    return []
  }
}

// Crear un nuevo proyecto
export async function createProject(projectData: any) {
  try {
    console.log(`Creando proyecto: ${projectData.title} para usuario: ${projectData.user_id}`)

    // Validar datos
    if (!projectData.title || !projectData.user_id) {
      throw new Error("Título y ID de usuario son requeridos")
    }

    // Crear cliente de Supabase
    const supabase = createServerSupabaseClient()

    // Crear el proyecto
    const { data: project, error } = await supabase.from("projects").insert(projectData).select().single()

    if (error) {
      console.error("Error al crear proyecto:", error.message)
      throw new Error(`Error al crear proyecto: ${error.message}`)
    }

    if (!project) {
      throw new Error("Error al crear proyecto: no se devolvieron datos")
    }

    console.log(`Proyecto creado correctamente: ${project.id}`)
    return project
  } catch (error) {
    console.error("Error en createProject:", error)
    throw error
  }
}

// Actualizar un proyecto
export async function updateProject(projectId: string, data: any) {
  try {
    console.log(`Actualizando proyecto: ${projectId}`)

    // Validar datos
    if (!projectId || !data) {
      throw new Error("ID de proyecto y datos son requeridos")
    }

    // Crear cliente de Supabase
    const supabase = createServerSupabaseClient()

    // Actualizar el proyecto
    const { data: project, error } = await supabase.from("projects").update(data).eq("id", projectId).select().single()

    if (error) {
      console.error("Error al actualizar proyecto:", error.message)
      throw new Error(`Error al actualizar proyecto: ${error.message}`)
    }

    console.log(`Proyecto actualizado correctamente: ${projectId}`)
    return project
  } catch (error) {
    console.error("Error en updateProject:", error)
    throw error
  }
}

// Eliminar un proyecto
export async function deleteProject(projectId: string) {
  try {
    console.log(`Eliminando proyecto: ${projectId}`)

    // Validar datos
    if (!projectId) {
      throw new Error("ID de proyecto es requerido")
    }

    // Crear cliente de Supabase
    const supabase = createServerSupabaseClient()

    // Eliminar el proyecto
    const { error } = await supabase.from("projects").delete().eq("id", projectId)

    if (error) {
      console.error("Error al eliminar proyecto:", error.message)
      throw new Error(`Error al eliminar proyecto: ${error.message}`)
    }

    console.log(`Proyecto eliminado correctamente: ${projectId}`)
    return true
  } catch (error) {
    console.error("Error en deleteProject:", error)
    throw error
  }
}

// Clonar un proyecto
export async function cloneProject(projectId: string, newTitle: string) {
  try {
    console.log(`Clonando proyecto: ${projectId} con nuevo título: ${newTitle}`)

    // Validar datos
    if (!projectId || !newTitle) {
      throw new Error("ID de proyecto y nuevo título son requeridos")
    }

    // Crear cliente de Supabase
    const supabase = createServerSupabaseClient()

    // Obtener el proyecto original
    const { data: originalProject, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single()

    if (projectError) {
      console.error("Error al obtener proyecto original:", projectError.message)
      throw new Error(`Error al obtener proyecto original: ${projectError.message}`)
    }

    if (!originalProject) {
      throw new Error("Proyecto original no encontrado")
    }

    // Crear un nuevo proyecto con los mismos datos
    const newProjectData = {
      ...originalProject,
      title: newTitle,
      id: undefined, // Generar un nuevo ID
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Insertar el nuevo proyecto
    const { data: newProject, error: insertError } = await supabase
      .from("projects")
      .insert([newProjectData])
      .select()
      .single()

    if (insertError) {
      console.error("Error al insertar nuevo proyecto:", insertError.message)
      throw new Error(`Error al insertar nuevo proyecto: ${insertError.message}`)
    }

    console.log(`Proyecto clonado correctamente: ${newProject.id}`)
    return newProject
  } catch (error) {
    console.error("Error en cloneProject:", error)
    throw error
  }
}

// Crear copia de seguridad de un proyecto
export async function backupProject(projectId: string) {
  try {
    console.log(`Creando copia de seguridad del proyecto: ${projectId}`)

    // Validar datos
    if (!projectId) {
      throw new Error("ID de proyecto es requerido")
    }

    // Crear cliente de Supabase
    const supabase = createServerSupabaseClient()

    // Simplemente retornar true, the actual implementation is in the route handler
    return true
  } catch (error) {
    console.error("Error en backupProject:", error)
    throw error
  }
}

// Restaurar copia de seguridad de un proyecto
export async function restoreProject(backupId: string) {
  try {
    console.log(`Restaurando copia de seguridad del proyecto con ID: ${backupId}`)

    // Validar datos
    if (!backupId) {
      throw new Error("ID de copia de seguridad es requerido")
    }

    // Crear cliente de Supabase
    const supabase = createServerSupabaseClient()

    // Simplemente retornar true, the actual implementation is in the route handler
    return true
  } catch (error) {
    console.error("Error en restoreProject:", error)
    throw error
  }
}
