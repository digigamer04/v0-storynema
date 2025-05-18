"use client"

import { useRouter } from "next/navigation"

// Añadir esta función al componente de página de timeline

// Dentro del componente TimelinePage
const refreshData = () => {
  const router = useRouter()
  router.refresh()
}

interface TimelinePageProps {
  params: {
    id: string
  }
  searchParams: {
    [key: string]: string | string[] | undefined
  }
}

const TimelinePage = async ({ params, searchParams }: TimelinePageProps) => {
  // Dummy data for scenes - replace with actual data fetching
  const scenes = [{ id: "scene1" }, { id: "scene2" }, { id: "scene3" }]

  // Dummy TimelineControls component - replace with actual component
  const TimelineControls = ({
    projectId,
    sceneIds,
    onReorder,
  }: { projectId: string; sceneIds: string[]; onReorder: () => void }) => {
    return (
      <div>
        Timeline Controls for Project: {projectId}
        <button onClick={onReorder}>Reorder</button>
      </div>
    )
  }

  return (
    <div>
      <h1>Timeline Page for Project: {params.id}</h1>
      <TimelineControls projectId={params.id} sceneIds={scenes.map((scene) => scene.id)} onReorder={refreshData} />
    </div>
  )
}

export default TimelinePage
