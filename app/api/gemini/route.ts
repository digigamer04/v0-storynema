import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: "El prompt es requerido" }, { status: 400 })
    }

    // AI Gateway gestiona la autenticación del preview/deployment.
    // Se usa un modelo explícitamente gratuito para no requerir tarjeta.
    const gatewayKey = process.env.AI_GATEWAY_API_KEY
    if (!gatewayKey) {
      return NextResponse.json({ error: "AI Gateway no está configurado para este proyecto" }, { status: 500 })
    }

    const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${gatewayKey}`,
      },
      body: JSON.stringify({
        model: "minimax/minimax-m2.7-free",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 8192,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Error de Gemini API:", errorData)
      return NextResponse.json(
        {
          error: errorData?.error?.message || "Error al comunicarse con la API de Gemini",
        },
        { status: response.status },
      )
    }

    const data = await response.json()

    // Extraer el texto generado de la respuesta
    const generatedText = data.choices?.[0]?.message?.content || ""

    if (!generatedText) {
      return NextResponse.json({ error: "Gemini no devolvió contenido" }, { status: 502 })
    }

    return NextResponse.json({ text: generatedText })
  } catch (error) {
    console.error("Error en el servidor:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
