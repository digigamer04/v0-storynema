import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function POST(request: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const projectId = params.projectId

    if (!projectId) {
      return NextResponse.json({ error: "ID de proyecto es requerido" }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // 1. Obtener todas las escenas del proyecto ordenadas por order_index
    const { data: scenes, error: fetchError } = await supabase
      .from("scenes")
      .select("id, order_index")
      .eq("project_id", projectId)
      .order("order_index", { ascending: true })

    if (fetchError) {
      console.error("Error al obtener escenas:", fetchError.message)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!scenes || scenes.length === 0) {
      return NextResponse.json({ message: "No hay escenas para invertir" }, { status: 200 })
    }

    // 2. Calcular el nuevo orden (invertido)
    const maxOrder = scenes.length - 1
    const updates = []

    for (const scene of scenes) {
      const newOrder = maxOrder - scene.order_index

      // Ejecutar la actualización directamente
      const { error: updateError } = await supabase.from("scenes").update({ order_index: newOrder }).eq("id", scene.id)

      if (updateError) {
        console.error(`Error al actualizar escena ${scene.id}:`, updateError.message)
        updates.push({ id: scene.id, success: false, error: updateError.message })
      } else {
        updates.push({ id: scene.id, success: true, oldOrder: scene.order_index, newOrder })
      }
    }

    // Verificar si todas las actualizaciones fueron exitosas
    const allSuccessful = updates.every((update) => update.success)

    return NextResponse.json(
      {
        success: allSuccessful,
        message: allSuccessful
          ? "Orden de escenas invertido correctamente"
          : "Algunas escenas no pudieron ser actualizadas",
        updates,
      },
      { status: 200 },
    )
  } catch (error: any) {
    console.error("Error al invertir escenas:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
