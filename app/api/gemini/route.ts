import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: "El prompt es requerido" }, { status: 400 })
    }

    // Usar Vercel AI Gateway: autentica automáticamente en el preview y evita
    // depender de una clave Gemini directa que puede estar revocada o limitada.
    const gatewayKey = process.env.AI_GATEWAY_API_KEY
    if (!gatewayKey) {
      return NextResponse.json({ error: "La conexión con la IA no está configurada" }, { status: 500 })
    }

    const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${gatewayKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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

    return NextResponse.json({ text: generatedText })
  } catch (error) {
    console.error("Error en el servidor:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
