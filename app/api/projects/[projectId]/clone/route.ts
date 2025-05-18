import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"
import { getUser } from "@/lib/auth"

export async function POST(request: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const projectId = params.projectId

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 })
    }

    // Get request body for new title
    const { title } = await request.json()

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "New project title is required" }, { status: 400 })
    }

    // Get the current user
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()

    // 1. Get the original project
    const { data: originalProject, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single()

    if (projectError) {
      console.error("Error fetching project:", projectError)
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Check if user has access to the project
    if (originalProject.user_id !== user.id) {
      return NextResponse.json({ error: "You don't have permission to clone this project" }, { status: 403 })
    }

    // 2. Create a new project with the same properties but new title
    const { data: newProject, error: createError } = await supabase
      .from("projects")
      .insert({
        title: title.trim(),
        description: originalProject.description,
        genre: originalProject.genre,
        format: originalProject.format,
        thumbnail_url: originalProject.thumbnail_url,
        user_id: user.id,
      })
      .select()
      .single()

    if (createError) {
      console.error("Error creating cloned project:", createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    // 3. Get all scenes from the original project
    const { data: originalScenes, error: scenesError } = await supabase
      .from("scenes")
      .select("*")
      .eq("project_id", projectId)
      .order("order_index", { ascending: true })

    if (scenesError) {
      console.error("Error fetching scenes:", scenesError)
      // Don't fail the whole operation, just log the error
    }

    // 4. Clone all scenes if any exist
    if (originalScenes && originalScenes.length > 0) {
      const newScenes = originalScenes.map((scene) => {
        // For the first scene, update content to include the new project title
        if (scene.order_index === 0) {
          let updatedContent = scene.content

          // If the content doesn't already mention the project title, add it
          if (
            !updatedContent.includes(`Proyecto: "${title.trim()}"`) &&
            !updatedContent.includes(`Proyecto: "${originalProject.title}"`)
          ) {
            updatedContent = `Proyecto: "${title.trim()}"\n\n${updatedContent}`
          } else if (updatedContent.includes(`Proyecto: "${originalProject.title}"`)) {
            // Replace old project title with new one
            updatedContent = updatedContent.replace(
              `Proyecto: "${originalProject.title}"`,
              `Proyecto: "${title.trim()}"`,
            )
          }

          return {
            project_id: newProject.id,
            title: scene.title,
            description: scene.description,
            content: updatedContent,
            order_index: scene.order_index,
          }
        }

        return {
          project_id: newProject.id,
          title: scene.title,
          description: scene.description,
          content: scene.content,
          order_index: scene.order_index,
        }
      })

      const { error: insertScenesError } = await supabase.from("scenes").insert(newScenes)

      if (insertScenesError) {
        console.error("Error cloning scenes:", insertScenesError)
        // Don't fail the whole operation, just log the error
      }

      // 5. For each original scene, get and clone its storyboard shots
      for (const scene of originalScenes) {
        // Get the corresponding new scene
        const { data: newScene } = await supabase
          .from("scenes")
          .select("id")
          .eq("project_id", newProject.id)
          .eq("order_index", scene.order_index)
          .single()

        if (!newScene) continue

        // Get storyboard shots for this scene
        const { data: shots } = await supabase
          .from("storyboard_shots")
          .select("*")
          .eq("scene_id", scene.id)
          .order("order_index", { ascending: true })

        if (shots && shots.length > 0) {
          // Clone the shots
          const newShots = shots.map((shot) => ({
            scene_id: newScene.id,
            url: shot.url,
            description: shot.description,
            duration: shot.duration,
            order_index: shot.order_index,
            type: shot.type,
          }))

          await supabase.from("storyboard_shots").insert(newShots)

          // Clone camera settings for each shot
          for (let i = 0; i < shots.length; i++) {
            const { data: cameraSettings } = await supabase
              .from("camera_settings")
              .select("*")
              .eq("shot_id", shots[i].id)
              .single()

            if (cameraSettings) {
              // Get the new shot ID
              const { data: newShot } = await supabase
                .from("storyboard_shots")
                .select("id")
                .eq("scene_id", newScene.id)
                .eq("order_index", shots[i].order_index)
                .single()

              if (newShot) {
                await supabase.from("camera_settings").insert({
                  shot_id: newShot.id,
                  model: cameraSettings.model,
                  lens: cameraSettings.lens,
                  aperture: cameraSettings.aperture,
                  shutter_speed: cameraSettings.shutter_speed,
                  iso: cameraSettings.iso,
                  white_balance: cameraSettings.white_balance,
                  resolution: cameraSettings.resolution,
                  frame_rate: cameraSettings.frame_rate,
                  format: cameraSettings.format,
                })
              }
            }
          }
        }
      }
    }

    return NextResponse.json(newProject)
  } catch (error: any) {
    console.error("Error in clone project API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
