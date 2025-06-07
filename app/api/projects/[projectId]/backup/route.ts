import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"
import { getUser } from "@/lib/auth"

export async function POST(request: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const projectId = params.projectId

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 })
    }

    // Get the current user
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()

    // 1. Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single()

    if (projectError) {
      console.error("Error fetching project:", projectError)
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    if (project.user_id !== user.id) {
      return NextResponse.json({ error: "You don't have permission to backup this project" }, { status: 403 })
    }

    // 2. Get all project data
    const { data: scenes } = await supabase.from("scenes").select("*").eq("project_id", projectId)

    // 3. Get storyboard shots for each scene
    const shotsPromises =
      scenes?.map(async (scene) => {
        const { data: shots } = await supabase.from("storyboard_shots").select("*").eq("scene_id", scene.id)

        // Get camera settings for each shot
        const settingsPromises =
          shots?.map(async (shot) => {
            const { data: settings } = await supabase
              .from("camera_settings")
              .select("*")
              .eq("shot_id", shot.id)
              .single()

            return { shot, settings }
          }) || []

        const shotsWithSettings = await Promise.all(settingsPromises)

        return { scene, shots: shotsWithSettings }
      }) || []

    const scenesWithShots = await Promise.all(shotsPromises)

    // 4. Create a backup record
    const backupData = {
      project,
      scenes: scenesWithShots,
    }

    // 5. Store the backup in the project_backups table
    const { data: backup, error: backupError } = await supabase
      .from("project_backups")
      .insert({
        user_id: user.id,
        project_id: projectId,
        backup_data: backupData,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (backupError) {
      console.error("Error creating backup:", backupError)
      return NextResponse.json({ error: backupError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Project backup created successfully",
      backupId: backup.id,
    })
  } catch (error: any) {
    console.error("Error in backup project API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
