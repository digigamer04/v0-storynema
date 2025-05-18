import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"
import { getUser } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    // Verificar autenticación
    const currentUser = await getUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Verificar que el usuario está solicitando sus propios proyectos
    if (params.userId !== currentUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const supabase = createServerSupabaseClient()

    // Obtener proyectos del usuario
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", params.userId)
      .order("updated_at", { ascending: false })

    if (error) {
      console.error("Error fetching user projects:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error("Error in user projects API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
