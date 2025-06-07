import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getProject, updateProject, deleteProject } from "@/lib/projects" // Importamos updateProject y deleteProject

export async function GET(request: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const projectId = params.projectId
    const cookieStore = cookies()

    // Verificar que el proyecto existe y el usuario tiene acceso
    const project = await getProject(projectId, cookieStore)

    return NextResponse.json(project)
  } catch (error: any) {
    console.error("Error en GET project by ID API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const projectId = params.projectId
    const cookieStore = cookies()
    const data = await request.json()

    // Llamar a la función de actualización de proyecto, pasando las cookies
    const updatedProject = await updateProject(projectId, data, cookieStore)

    return NextResponse.json(updatedProject)
  } catch (error: any) {
    console.error("Error en PUT project API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const projectId = params.projectId
    const cookieStore = cookies()

    // Llamar a la función de eliminación de proyecto, pasando las cookies
    await deleteProject(projectId, cookieStore)

    return NextResponse.json({ message: "Project deleted successfully" })
  } catch (error: any) {
    console.error("Error en DELETE project API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
