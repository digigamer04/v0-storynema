import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"
import { getUser } from "@/lib/auth"

export async function POST(request: NextRequest, { params }: { params: { backupId: string } }) {
  try {
    const backupId = params.backupId

    if (!backupId) {
      return NextResponse.json({ error: "Backup ID is required" }, { status: 400 })
    }

    // Get the current user
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()

    // 1. Get the backup
    const { data: backup, error: backupError } = await supabase
      .from("project_backups")
      .select("*")
      .eq("id", backupId)
      .single()

    if (backupError) {
      console.error("Error fetching backup:", backupError)
      return NextResponse.json({ error: "Backup not found" }, { status: 404 })
    }

    // 2. Verify ownership
    if (backup.user_id !== user.id) {
      return NextResponse.json({ error: "You don't have permission to restore this backup" }, { status: 403 })
    }

    const backupData = backup.backup_data

    // 3. Create a new project from the backup
    const { data: newProject, error: projectError } = await supabase
      .from("projects")
      .insert({
        title: `${backupData.project.title} (Restored)`,
        description: backupData.project.description,
        genre: backupData.project.genre,
        format: backupData.project.format,
        thumbnail_url: backupData.project.thumbnail_url,
        user_id: user.id,
      })
      .select()
      .single()

    if (projectError) {
      console.error("Error creating restored project:", projectError)
      return NextResponse.json({ error: projectError.message }, { status: 500 })
    }

    // 4. Restore scenes
    for (const sceneData of backupData.scenes) {
      const { data: newScene, error: sceneError } = await supabase
        .from("scenes")
        .insert({
          project_id: newProject.id,
          title: sceneData.scene.title,
          description: sceneData.scene.description,
          content: sceneData.scene.content,
          order_index: sceneData.scene.order_index,
        })
        .select()
        .single()

      if (sceneError) {
        console.error("Error restoring scene:", sceneError)
        continue
      }

      // 5. Restore shots and settings
      for (const shotData of sceneData.shots) {
        const { data: newShot, error: shotError } = await supabase
          .from("storyboard_shots")
          .insert({
            scene_id: newScene.id,
            url: shotData.shot.url,
            description: shotData.shot.description,
            duration: shotData.shot.duration,
            order_index: shotData.shot.order_index,
            type: shotData.shot.type,
          })
          .select()
          .single()

        if (shotError) {
          console.error("Error restoring shot:", shotError)
          continue
        }

        // Restore camera settings
        if (shotData.settings) {
          await supabase.from("camera_settings").insert({
            shot_id: newShot.id,
            model: shotData.settings.model,
            lens: shotData.settings.lens,
            aperture: shotData.settings.aperture,
            shutter_speed: shotData.settings.shutter_speed,
            iso: shotData.settings.iso,
            white_balance: shotData.settings.white_balance,
            resolution: shotData.settings.resolution,
            frame_rate: shotData.settings.frame_rate,
            format: shotData.settings.format,
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Project restored successfully",
      project: newProject,
    })
  } catch (error: any) {
    console.error("Error in restore project API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
