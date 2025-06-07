import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClientWithCookies } from "@/lib/supabase";
import { getProject } from "@/lib/projects";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string; sceneId: string } },
) {
  try {
    const { projectId, sceneId } = params;
    const cookieStore = cookies();

    // Ensure the user has access to this project
    await getProject(projectId, cookieStore);

    const supabase = createServerSupabaseClientWithCookies(cookieStore);
    const { error } = await supabase
      .from("scenes")
      .delete()
      .eq("id", sceneId)
      .eq("project_id", projectId);

    if (error) {
      console.error("Error deleting scene:", error.message);
      return NextResponse.json(
        { error: `Error al eliminar escena: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE scene API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
