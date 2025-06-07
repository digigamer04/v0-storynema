import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers" // Importar cookies
import { createServerSupabaseClientWithCookies } from "@/lib/supabase"
import { getUser } from "@/lib/auth"

export async function POST(request: NextRequest, { params }: { params: { backupId: string } }) {
  try {
    const backupId = params.backupId
    const cookieStore = cookies()

    // Verificar autenticación y obtener usuario
    const user = await getUser(cookieStore)
    if (!user) {
      console.error("Authentication required for restore")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const supabase = createServerSupabaseClientWithCookies(cookieStore)

    // 1. Obtener la copia de seguridad
    const { data: backupRecord, error: backupError } = await supabase
      .from("project_backups")
      .select("*")
      .eq("id", backupId)
      .eq("user_id", user.id) // Asegurarse de que el usuario sea el propietario de la copia de seguridad
      .single()

    if (backupError) {
      console.error("Error fetching backup record:", backupError.message)
      return NextResponse.json(
        { error: `Error al obtener la copia de seguridad: ${backupError.message}` },
        { status: 500 },
      )
    }
    if (!backupRecord || !backupRecord.backup_data) {
      console.error("Backup record not found or data missing")
      return NextResponse.json({ error: "Copia de seguridad no encontrada o datos corruptos" }, { status: 404 })
    }

    const projectData = backupRecord.backup_data as any

    // 2. Eliminar el proyecto actual si existe y no es el proyecto de la copia de seguridad
    // Asumimos que queremos restaurar un proyecto existente a un estado anterior, o crearlo si no existe
    // Por simplicidad, si el project_id en backup_data existe, lo eliminamos y luego lo reinsertamos
    // (Podría ser más sofisticado, actualizando campos, pero reinsertar es más simple para una restauración completa)

    const currentProjectId = projectData.id
    if (currentProjectId) {
      // Verificar si el proyecto actual existe y pertenece al usuario
      const { data: existingProject, error: existingProjectError } = await supabase
        .from("projects")
        .select("id, user_id")
        .eq("id", currentProjectId)
        .single()

      if (existingProjectError && existingProjectError.code !== "PGRST116") {
        // PGRST116 means no rows found
        console.error("Error checking existing project:", existingProjectError.message)
        return NextResponse.json(
          { error: `Error al verificar proyecto existente: ${existingProjectError.message}` },
          { status: 500 },
        )
      }

      if (existingProject && existingProject.user_id === user.id) {
        console.log(`Eliminando proyecto existente ${currentProjectId} para restaurar...`)
        const { error: deleteError } = await supabase.from("projects").delete().eq("id", currentProjectId)
        if (deleteError) {
          console.error("Error deleting existing project:", deleteError.message)
          return NextResponse.json(
            { error: `Error al eliminar proyecto existente: ${deleteError.message}` },
            { status: 500 },
          )
        }
      } else if (existingProject && existingProject.user_id !== user.id) {
        console.error(`Usuario ${user.id} no es propietario del proyecto ${currentProjectId} para restaurar.`)
        return NextResponse.json({ error: "No tienes permiso para restaurar este proyecto" }, { status: 403 })
      }
    }

    // 3. Insertar el proyecto principal y sus escenas/tomas/configuraciones de cámara
    // Generar un nuevo ID para el proyecto si el ID original es el mismo que un proyecto existente
    const newProjectId = projectData.id || crypto.randomUUID() // Usar un nuevo ID si el original no existe o es nulo

    // Asegurar que las escenas, tomas y configuraciones se inserten en el orden correcto
    // (projects -> scenes -> storyboard_shots -> camera_settings)

    const { data: newProject, error: insertProjectError } = await supabase
      .from("projects")
      .insert({
        ...projectData,
        id: newProjectId,
        user_id: user.id, // Asegurarse de que el nuevo proyecto pertenezca al usuario actual
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertProjectError) {
      console.error("Error inserting main project during restore:", insertProjectError.message)
      return NextResponse.json(
        { error: `Error al restaurar proyecto principal: ${insertProjectError.message}` },
        { status: 500 },
      )
    }

    // Restaurar escenas
    if (projectData.scenes && projectData.scenes.length > 0) {
      const sceneInserts = projectData.scenes.map((scene: any) => ({
        ...scene,
        project_id: newProject.id,
        id: crypto.randomUUID(), // Generar nuevo ID para la escena
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))
      const { data: newScenes, error: insertScenesError } = await supabase.from("scenes").insert(sceneInserts).select()
      if (insertScenesError) {
        console.error("Error inserting scenes during restore:", insertScenesError.message)
        throw new Error(`Error al restaurar escenas: ${insertScenesError.message}`)
      }

      // Mapear IDs de escenas antiguas a nuevas
      const oldSceneIdToNewSceneIdMap = new Map(
        projectData.scenes.map((oldScene: any, idx: number) => [oldScene.id, newScenes[idx].id]),
      )

      // Restaurar tomas de storyboard y configuraciones de cámara
      for (const oldScene of projectData.scenes) {
        const newSceneId = oldSceneIdToNewSceneIdMap.get(oldScene.id)
        if (oldScene.storyboard_shots && oldScene.storyboard_shots.length > 0) {
          const shotInserts = oldScene.storyboard_shots.map((shot: any) => ({
            ...shot,
            scene_id: newSceneId,
            id: crypto.randomUUID(), // Generar nuevo ID para la toma
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }))
          const { data: newShots, error: insertShotsError } = await supabase
            .from("storyboard_shots")
            .insert(shotInserts)
            .select()
          if (insertShotsError) {
            console.error("Error inserting storyboard shots during restore:", insertShotsError.message)
            throw new Error(`Error al restaurar tomas de storyboard: ${insertShotsError.message}`)
          }

          // Mapear IDs de tomas antiguas a nuevas
          const oldShotIdToNewShotIdMap = new Map(
            oldScene.storyboard_shots.map((oldShot: any, idx: number) => [oldShot.id, newShots[idx].id]),
          )

          // Restaurar configuraciones de cámara
          for (const oldShot of oldScene.storyboard_shots) {
            const newShotId = oldShotIdToNewShotIdMap.get(oldShot.id)
            if (oldShot.camera_settings && oldShot.camera_settings.length > 0) {
              const cameraSettingsInserts = oldShot.camera_settings.map((setting: any) => ({
                ...setting,
                shot_id: newShotId,
                id: crypto.randomUUID(), // Generar nuevo ID para la configuración
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }))
              const { error: insertCameraSettingsError } = await supabase
                .from("camera_settings")
                .insert(cameraSettingsInserts)
              if (insertCameraSettingsError) {
                console.error("Error inserting camera settings during restore:", insertCameraSettingsError.message)
                throw new Error(`Error al restaurar configuraciones de cámara: ${insertCameraSettingsError.message}`)
              }
            }
          }
        }
      }
    }

    console.log(`Copia de seguridad ${backupId} restaurada correctamente como nuevo proyecto ${newProject.id}`)
    return NextResponse.json({ success: true, projectId: newProject.id })
  } catch (error: any) {
    console.error("Error en restore project API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
