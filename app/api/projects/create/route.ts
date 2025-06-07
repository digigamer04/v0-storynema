import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers" // Importar cookies
import { createProject } from "@/lib/projects" // Importamos createProject

export async function POST(request: NextRequest) {
  try {
    console.log("Creando nuevo proyecto...")

    const projectData = await request.json()
    const cookieStore = cookies() // Obtener las cookies

    // Pasar las cookies a la función createProject
    const newProject = await createProject(projectData, cookieStore)

    console.log("Proyecto creado correctamente:", newProject.id)
    return NextResponse.json(newProject)
  } catch (error: any) {
    console.error("Error en create project API:", error)
    return NextResponse.json({ error: `Error al crear el proyecto: ${error.message}` }, { status: 500 })
  }
}
