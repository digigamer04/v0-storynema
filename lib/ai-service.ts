// Tipos para el sistema de generación de guiones
export type ToneOption = "dramático" | "cómico" | "suspense" | "romántico" | "neutral" | "oscuro" | "inspirador"
export type GenreOption =
  | "drama"
  | "comedia"
  | "thriller"
  | "ciencia ficción"
  | "romance"
  | "terror"
  | "acción"
  | "documental"
export type FormatOption = "largometraje" | "cortometraje" | "serie" | "webserie" | "comercial" | "videoclip"

export interface ScriptGenerationParams {
  title?: string
  description: string
  genre?: GenreOption
  format?: FormatOption
  tone?: ToneOption
  numScenes?: number
  characters?: string
  additionalNotes?: string
}

export interface GeneratedScript {
  fullText: string
  scenes: {
    title: string
    content: string
  }[]
}

// Sistema de prompteo interno
function buildScriptPrompt(params: ScriptGenerationParams): string {
  // Prompt base con instrucciones específicas de formato
  let prompt = `Genera un guion cinematográfico profesional basado en la siguiente descripción: "${params.description}".

INSTRUCCIONES DE FORMATO IMPORTANTES:
1. Separa cada escena con una línea de guiones: "-------------------------------------"
2. Coloca el título de cada escena entre dobles paréntesis, así: "((" y "))"
3. Usa el formato estándar de guion cinematográfico para las descripciones y diálogos
4. Incluye descripciones visuales detalladas de las locaciones y acciones
5. Escribe los nombres de los personajes en MAYÚSCULAS antes de sus diálogos
6. Incluye acotaciones entre paréntesis cuando sea necesario

`

  // Añadir parámetros específicos si están disponibles
  if (params.title) {
    prompt += `El título del guion es: "${params.title}"\n`
  }

  if (params.genre) {
    prompt += `Género: ${params.genre}\n`
  }

  if (params.format) {
    prompt += `Formato: ${params.format}\n`
  }

  if (params.tone) {
    prompt += `Tono: ${params.tone}\n`
  }

  if (params.numScenes) {
    prompt += `Número aproximado de escenas: ${params.numScenes}\n`
  }

  if (params.characters) {
    prompt += `Personajes principales: ${params.characters}\n`
  }

  if (params.additionalNotes) {
    prompt += `Notas adicionales: ${params.additionalNotes}\n`
  }

  // Instrucciones finales
  prompt += `
Asegúrate de que cada escena tenga un título descriptivo entre dobles paréntesis y que esté separada de las demás por una línea de guiones.
Ejemplo de formato:

(( ESCENA 1 - INTERIOR. APARTAMENTO DE JUAN - DÍA ))

Descripción de la escena...

PERSONAJE
Diálogo del personaje.

-------------------------------------

(( ESCENA 2 - EXTERIOR. CALLE PRINCIPAL - NOCHE ))

Y así sucesivamente...`

  return prompt
}

// Función para generar un guion completo
export async function generateScript(params: ScriptGenerationParams): Promise<GeneratedScript> {
  try {
    const prompt = buildScriptPrompt(params)

    // Llamada a la API de Gemini
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error al conectar con la API de Gemini")
    }

    const data = await response.json()

    if (!data.text) {
      throw new Error("La respuesta de la API no contiene texto generado")
    }

    // Procesar el texto generado para extraer escenas
    const parsedScript = parseGeneratedScript(data.text)

    return parsedScript
  } catch (error) {
    console.error("Error generating script:", error)
    throw error
  }
}

// Función para regenerar un guion con el mismo prompt pero diferente resultado
export async function regenerateScript(params: ScriptGenerationParams): Promise<GeneratedScript> {
  // Añadir una nota para obtener una versión diferente
  const newParams = {
    ...params,
    additionalNotes: `${params.additionalNotes || ""} Por favor, genera una versión completamente diferente a la anterior.`,
  }

  return generateScript(newParams)
}

// Función para cambiar el tono de un guion existente
export async function changeScriptTone(params: ScriptGenerationParams, newTone: ToneOption): Promise<GeneratedScript> {
  // Crear nuevos parámetros con el tono cambiado
  const newParams = {
    ...params,
    tone: newTone,
    additionalNotes: `${params.additionalNotes || ""} Mantén la misma historia y sucesos, pero cambia el tono a ${newTone}.`,
  }

  return generateScript(newParams)
}

// Función para parsear el texto generado y extraer las escenas
export function parseGeneratedScript(text: string): GeneratedScript {
  // Dividir el texto por la línea de separación
  const scenesRaw = text.split("-------------------------------------")

  // Procesar cada escena
  const scenes = scenesRaw
    .map((sceneText) => sceneText.trim())
    .filter((sceneText) => sceneText.length > 0) // Eliminar elementos vacíos
    .map((sceneText) => {
      // Extraer el título entre dobles paréntesis (( y ))
      // Usamos una expresión regular que busca cualquier texto entre (( y ))
      const titleRegex = /$$$$(.*?)$$$$/s
      const titleMatch = sceneText.match(titleRegex)

      let title = "ESCENA SIN TÍTULO"
      let content = sceneText

      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].trim()
        // Eliminar el título del contenido
        content = sceneText.replace(titleMatch[0], "").trim()
      }

      return { title, content }
    })

  return {
    fullText: text,
    scenes,
  }
}
