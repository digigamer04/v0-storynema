import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: "El prompt es requerido" }, { status: 400 })
    }

    // Usar la clave de Gemini únicamente en el servidor. Nunca se expone al navegador.
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "La conexión con Gemini no está configurada" }, { status: 500 })
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
          },
        }),
      },
    )

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
    const generatedText = data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("") || ""

    if (!generatedText) {
      return NextResponse.json({ error: "Gemini no devolvió contenido" }, { status: 502 })
    }

    return NextResponse.json({ text: generatedText })
  } catch (error) {
    console.error("Error en el servidor:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
