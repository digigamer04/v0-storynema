import { Suspense } from "react"
import HomeClient from "@/components/home-client"

const SAMPLE_PROJECT_DATE = "2026-08-28T00:00:00.000Z"

// Proyectos de ejemplo para usuarios no autenticados
const sampleProjects = [
  {
    id: "sample-1",
    title: "Ejemplo: El viaje del héroe",
    description: "Un guion de ejemplo basado en la estructura clásica del viaje del héroe",
    created_at: SAMPLE_PROJECT_DATE,
    updated_at: SAMPLE_PROJECT_DATE,
    user_id: "sample",
    is_sample: true,
    thumbnail: "/placeholder.svg?height=200&width=300",
    progress: 100,
  },
  {
    id: "sample-2",
    title: "Ejemplo: Estructura en tres actos",
    description: "Un guion de ejemplo basado en la estructura clásica de tres actos",
    created_at: SAMPLE_PROJECT_DATE,
    updated_at: SAMPLE_PROJECT_DATE,
    user_id: "sample",
    is_sample: true,
    thumbnail: "/placeholder.svg?height=200&width=300",
    progress: 100,
  },
]

export default async function Home() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <HomeClient sampleProjects={sampleProjects} />
    </Suspense>
  )
}
