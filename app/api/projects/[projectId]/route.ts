import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"
import { getUser } from "@/lib/auth"

// DELETE endpoint to delete a project
export async function DELETE(request: NextRequest, { params }: { params: { projectId: string } }) {
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

    // First, verify that the user owns the project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("user_id")
      .eq("id", projectId)
      .single()

    if (projectError) {
      console.error("Error fetching project:", projectError)
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    if (project.user_id !== user.id) {
      return NextResponse.json({ error: "You don't have permission to delete this project" }, { status: 403 })
    }

    // Delete the project (cascading delete will handle related records)
    const { error: deleteError } = await supabase.from("projects").delete().eq("id", projectId)

    if (deleteError) {
      console.error("Error deleting project:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in delete project API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
