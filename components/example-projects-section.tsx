"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ProjectCard } from "@/components/project-card"
import { ChevronDown } from "lucide-react"
import { useState } from "react"

interface ExampleProjectsSectionProps {
  isUserLoggedIn: boolean
  sampleProjects: any[]
}

export default function ExampleProjectsSection({ isUserLoggedIn, sampleProjects }: ExampleProjectsSectionProps) {
  const [isOpen, setIsOpen] = useState(!isUserLoggedIn)

  return (
    <section className="mt-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Proyectos de Ejemplo</CardTitle>
            <CardDescription>Explora estos proyectos de ejemplo para inspirarte</CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="w-9 p-0" onClick={() => setIsOpen(!isOpen)}>
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
            <span className="sr-only">Mostrar/Ocultar proyectos de ejemplo</span>
          </Button>
        </CardHeader>
        {isOpen && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sampleProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </section>
  )
}
