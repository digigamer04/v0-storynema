import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers" // Importar cookies
import { cloneProject } from "@/lib/projects" // Importamos cloneProject

export async function POST(request: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const projectId = params.projectId
    const cookieStore = cookies() // Obtener las cookies

    // Obtener el nuevo título del cuerpo de la solicitud
    const { newTitle } = await request.json()

    // Llamar a la función cloneProject, pasando las cookies
    const clonedProject = await cloneProject(projectId, newTitle, cookieStore)

    return NextResponse.json(clonedProject)
  } catch (error: any) {
    console.error("Error en clone project API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
