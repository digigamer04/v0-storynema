import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClientWithCookies } from "@/lib/supabase"
import { getUser } from "@/lib/auth"
import { cookies } from "next/headers"

// PUT - Actualizar una escena específica
export async function PUT(request: NextRequest, { params }: { params: { sceneId: string } }) {
  try {
    const sceneId = params.sceneId
    const cookieStore = cookies()

    // Verificar autenticación
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Obtener los datos del cuerpo de la solicitud
    const updateData = await request.json()

    // Crear cliente de Supabase
    const supabase = createServerSupabaseClientWithCookies(cookieStore)

    // Verificar que la escena existe y el usuario tiene acceso
    const { data: existingScene, error: fetchError } = await supabase
      .from("scenes")
      .select("*, projects!inner(user_id)")
      .eq("id", sceneId)
      .single()

    if (fetchError || !existingScene) {
      console.error("Error al verificar escena:", fetchError)
      return NextResponse.json({ error: "Escena no encontrada" }, { status: 404 })
    }

    if (existingScene.projects.user_id !== user.id) {
      return NextResponse.json({ error: "No tienes permiso para modificar esta escena" }, { status: 403 })
    }

    // Actualizar la escena
    const { data: updatedScene, error } = await supabase
      .from("scenes")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sceneId)
      .select()
      .single()

    if (error) {
      console.error("Error al actualizar escena:", error.message)
      return NextResponse.json({ error: `Error al actualizar escena: ${error.message}` }, { status: 500 })
    }

    console.log(`Escena ${sceneId} actualizada correctamente`)
    return NextResponse.json(updatedScene)
  } catch (error: any) {
    console.error("Error en la API de actualización de escenas:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Eliminar una escena específica
export async function DELETE(request: NextRequest, { params }: { params: { sceneId: string } }) {
  try {
    const sceneId = params.sceneId
    const cookieStore = cookies()

    // Verificar autenticación
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Crear cliente de Supabase
    const supabase = createServerSupabaseClientWithCookies(cookieStore)

    // Verificar que la escena existe y el usuario tiene acceso
    const { data: existingScene, error: fetchError } = await supabase
      .from("scenes")
      .select("*, projects!inner(user_id)")
      .eq("id", sceneId)
      .single()

    if (fetchError || !existingScene) {
      console.error("Error al verificar escena:", fetchError)
      return NextResponse.json({ error: "Escena no encontrada" }, { status: 404 })
    }

    if (existingScene.projects.user_id !== user.id) {
      return NextResponse.json({ error: "No tienes permiso para eliminar esta escena" }, { status: 403 })
    }

    // Eliminar la escena
    const { error } = await supabase.from("scenes").delete().eq("id", sceneId)

    if (error) {
      console.error("Error al eliminar escena:", error.message)
      return NextResponse.json({ error: `Error al eliminar escena: ${error.message}` }, { status: 500 })
    }

    console.log(`Escena ${sceneId} eliminada correctamente`)
    return NextResponse.json({ success: true, message: "Escena eliminada correctamente" })
  } catch (error: any) {
    console.error("Error en la API de eliminación de escenas:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET - Obtener una escena específica
export async function GET(request: NextRequest, { params }: { params: { sceneId: string } }) {
  try {
    const sceneId = params.sceneId
    const cookieStore = cookies()

    // Verificar autenticación
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Crear cliente de Supabase
    const supabase = createServerSupabaseClientWithCookies(cookieStore)

    // Obtener la escena
    const { data: scene, error } = await supabase
      .from("scenes")
      .select("*, projects!inner(user_id)")
      .eq("id", sceneId)
      .single()

    if (error || !scene) {
      console.error("Error al obtener escena:", error)
      return NextResponse.json({ error: "Escena no encontrada" }, { status: 404 })
    }

    if (scene.projects.user_id !== user.id) {
      return NextResponse.json({ error: "No tienes permiso para ver esta escena" }, { status: 403 })
    }

    return NextResponse.json(scene)
  } catch (error: any) {
    console.error("Error en GET escena:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
