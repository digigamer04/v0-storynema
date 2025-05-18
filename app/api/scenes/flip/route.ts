import { type NextRequest, NextResponse } from "next/server"
import { flipScenesOrder } from "@/lib/scenes"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  console.log("[API_FLIP] Iniciando solicitud de flip")

  try {
    const { projectId, sceneIds } = await request.json()

    if (!projectId || !sceneIds || !Array.isArray(sceneIds)) {
      console.error("[API_FLIP] Datos inválidos", { projectId, sceneIds })
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    }

    console.log(`[API_FLIP] Procesando flip para proyecto ${projectId} con ${sceneIds.length} escenas`)

    // Usar la función centralizada para invertir escenas
    const result = await flipScenesOrder(projectId, sceneIds)

    console.log(`[API_FLIP] Resultado de la inversión:`, result)

    return NextResponse.json({
      success: true,
      message: "Orden de escenas invertido",
      result,
    })
  } catch (error) {
    // Capturar y registrar el error con máximo detalle
    console.error("[API_FLIP] Error al procesar la solicitud:", error)

    let errorMessage = "Error al invertir escenas"
    let errorDetail = null

    if (error instanceof Error) {
      errorMessage = error.message
      errorDetail = error.stack
    }

    // Registrar información adicional que podría ser útil para depurar
    console.error("[API_FLIP] Detalles del error:", {
      message: errorMessage,
      stack: errorDetail,
      env: process.env.NODE_ENV,
      time: new Date().toISOString(),
    })

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        detail: process.env.NODE_ENV === "development" ? errorDetail : undefined,
      },
      { status: 500 },
    )
  }
}
