import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClientWithCookies } from "@/lib/supabase"
import { getProject } from "@/lib/projects"
import { cookies } from "next/headers"

export async function POST(request: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const projectId = params.projectId
    const cookieStore = cookies()

    // Verificar que el proyecto existe y el usuario tiene acceso
    try {
      await getProject(projectId, cookieStore)
    } catch (error: any) {
      console.error("Error al verificar proyecto:", error.message)
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    // Obtener los datos del cuerpo de la solicitud
    const { title, content, order_index } = await request.json()

    // Crear cliente de Supabase
    const supabase = createServerSupabaseClientWithCookies(cookieStore)

    // Obtener el orden máximo actual
    const { data: maxOrderScene, error: maxOrderError } = await supabase
      .from("scenes")
      .select("order_index")
      .eq("project_id", projectId)
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle()

    // Calcular el nuevo orden
    const newOrder = maxOrderScene ? maxOrderScene.order_index + 1 : 0

    // Crear la escena
    const { data: scene, error } = await supabase
      .from("scenes")
      .insert([
        {
          project_id: projectId,
          title: title || "NUEVA ESCENA",
          content: content || "",
          order_index: newOrder,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Error al crear escena:", error.message)
      return NextResponse.json({ error: `Error al crear escena: ${error.message}` }, { status: 500 })
    }

    console.log(`Escena creada correctamente: ${scene.id}`)
    return NextResponse.json(scene)
  } catch (error: any) {
    console.error("Error en la API de creación de escenas:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const projectId = params.projectId
    const cookieStore = cookies()

    // Verificar que el proyecto existe y el usuario tiene acceso
    await getProject(projectId, cookieStore)

    // Crear cliente de Supabase
    const supabase = createServerSupabaseClientWithCookies(cookieStore)

    // Obtener las escenas del proyecto ordenadas correctamente
    const { data: scenes, error } = await supabase
      .from("scenes")
      .select("*")
      .eq("project_id", projectId)
      .order("order_index", { ascending: true })

    if (error) {
      console.error("Error al obtener escenas:", error.message)
      return NextResponse.json({ error: `Error al obtener escenas: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json(scenes || [])
  } catch (error: any) {
    console.error("Error en GET escenas:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
