"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Download, FileText } from "lucide-react"
import Link from "next/link"
import MarkdownRenderer from "@/components/markdown-renderer"

// Datos de ejemplo para los proyectos de muestra
const sampleProjects = {
  "sample-1": {
    title: "Ejemplo: El viaje del héroe",
    description: "Un guion de ejemplo basado en la estructura clásica del viaje del héroe",
    content: `# El viaje del héroe

## ESCENA 1 - EXTERIOR. PUEBLO PEQUEÑO - DÍA

Un tranquilo pueblo de montaña. Casas de piedra y madera se alinean en calles estrechas. ALEX (25), de aspecto común pero mirada intensa, camina cargando leña hacia su modesta cabaña.

NARRADOR (V.O.)
Cada héroe comienza en algún lugar ordinario, sin saber que el destino tiene otros planes.

## ESCENA 2 - INTERIOR. CABAÑA DE ALEX - NOCHE

Alex cena solo junto al fuego. Un GOLPE en la puerta lo sobresalta. Al abrir, encuentra a un ANCIANO (70s) empapado por la lluvia.

ANCIANO
(respirando con dificultad)
Necesito tu ayuda. Solo tú puedes detener lo que se avecina.

ALEX
¿De qué habla? Ni siquiera lo conozco.

ANCIANO
Pero yo te conozco a ti, hijo de Elena. El medallón que llevas al cuello no es una simple reliquia familiar.

Alex toca instintivamente el MEDALLÓN que siempre ha llevado.

## ESCENA 3 - EXTERIOR. BOSQUE - AMANECER

Alex y el Anciano caminan por un sendero apenas visible. El bosque parece observarlos.

ANCIANO
El mundo que conoces está a punto de cambiar. Más allá de estas montañas, el Señor de las Sombras ha despertado.

ALEX
(escéptico)
Suena a cuento para niños.

ANCIANO
Todos los cuentos tienen algo de verdad.

Un RUGIDO distante hace que ambos se detengan. El Anciano mira a Alex con gravedad.

ANCIANO
Y ahora comienza tu viaje.`,
    scenes: [
      {
        title: "ESCENA 1 - EXTERIOR. PUEBLO PEQUEÑO - DÍA",
        content:
          "Un tranquilo pueblo de montaña. Casas de piedra y madera se alinean en calles estrechas. ALEX (25), de aspecto común pero mirada intensa, camina cargando leña hacia su modesta cabaña.\n\nNARRADOR (V.O.)\nCada héroe comienza en algún lugar ordinario, sin saber que el destino tiene otros planes.",
      },
      {
        title: "ESCENA 2 - INTERIOR. CABAÑA DE ALEX - NOCHE",
        content:
          "Alex cena solo junto al fuego. Un GOLPE en la puerta lo sobresalta. Al abrir, encuentra a un ANCIANO (70s) empapado por la lluvia.\n\nANCIANO\n(respirando con dificultad)\nNecesito tu ayuda. Solo tú puedes detener lo que se avecina.\n\nALEX\n¿De qué habla? Ni siquiera lo conozco.\n\nANCIANO\nPero yo te conozco a ti, hijo de Elena. El medallón que llevas al cuello no es una simple reliquia familiar.\n\nAlex toca instintivamente el MEDALLÓN que siempre ha llevado.",
      },
      {
        title: "ESCENA 3 - EXTERIOR. BOSQUE - AMANECER",
        content:
          "Alex y el Anciano caminan por un sendero apenas visible. El bosque parece observarlos.\n\nANCIANO\nEl mundo que conoces está a punto de cambiar. Más allá de estas montañas, el Señor de las Sombras ha despertado.\n\nALEX\n(escéptico)\nSuena a cuento para niños.\n\nANCIANO\nTodos los cuentos tienen algo de verdad.\n\nUn RUGIDO distante hace que ambos se detengan. El Anciano mira a Alex con gravedad.\n\nANCIANO\nY ahora comienza tu viaje.",
      },
    ],
  },
  "sample-2": {
    title: "Ejemplo: Estructura en tres actos",
    description: "Un guion de ejemplo basado en la estructura clásica de tres actos",
    content: `# Estructura en tres actos

## ACTO I - PLANTEAMIENTO

### ESCENA 1 - INTERIOR. APARTAMENTO DE LAURA - MAÑANA

LAURA (32), ejecutiva de marketing, se prepara para ir al trabajo. Su apartamento es impecable, minimalista. Revisa su teléfono: 15 correos sin leer, 5 mensajes de su jefe.

LAURA
(para sí misma)
Otro día, otra batalla.

### ESCENA 2 - INTERIOR. OFICINA - DÍA

Laura presenta una campaña frente a EJECUTIVOS de aspecto serio. Su presentación es perfecta, pero nadie sonríe.

JEFE
(interrumpiendo)
Necesitamos algo más... arriesgado. Algo que nadie haya visto antes.

Laura asiente, pero su expresión revela preocupación.

## ACTO II - CONFRONTACIÓN

### ESCENA 3 - INTERIOR. CAFETERÍA - TARDE

Laura, frustrada, toma café. En la mesa de al lado, MIGUEL (35), artista callejero, dibuja en su cuaderno. Laura observa fascinada sus dibujos surrealistas.

LAURA
Eso es... diferente.

MIGUEL
(sonriendo)
¿Diferente bueno o diferente malo?

LAURA
Diferente... perfecto.

### ESCENA 4 - EXTERIOR. CALLES DE LA CIUDAD - ATARDECER

Laura y Miguel caminan por la ciudad. Él le muestra su arte urbano: instalaciones sorprendentes que interactúan con el entorno.

MIGUEL
El arte no debe estar encerrado. Debe vivir donde vive la gente.

Laura toma fotos, su mente trabajando a toda velocidad.

## ACTO III - RESOLUCIÓN

### ESCENA 5 - INTERIOR. SALA DE JUNTAS - DÍA

Laura presenta una nueva campaña: marketing guerrilla inspirado en el arte de Miguel. Proyecta imágenes de instalaciones artísticas con el logo del cliente integrado en espacios urbanos.

JEFE
(impresionado)
Esto es... exactamente lo que pedí. ¿Cómo lo conseguiste?

LAURA
Aprendí a mirar fuera de la caja. Literalmente.

### ESCENA 6 - EXTERIOR. INAUGURACIÓN DE CAMPAÑA - NOCHE

Una multitud se reúne alrededor de una instalación artística. Laura y Miguel observan orgullosos. Sus manos se encuentran y se entrelazan.

MIGUEL
¿Sabes qué es lo mejor de salir de tu zona de confort?

LAURA
¿Qué?

MIGUEL
Que nunca sabes qué otras cosas maravillosas encontrarás.

Laura sonríe, por primera vez en mucho tiempo, completamente relajada.

FIN`,
    scenes: [
      {
        title: "ESCENA 1 - INTERIOR. APARTAMENTO DE LAURA - MAÑANA",
        content:
          "LAURA (32), ejecutiva de marketing, se prepara para ir al trabajo. Su apartamento es impecable, minimalista. Revisa su teléfono: 15 correos sin leer, 5 mensajes de su jefe.\n\nLAURA\n(para sí misma)\nOtro día, otra batalla.",
      },
      {
        title: "ESCENA 2 - INTERIOR. OFICINA - DÍA",
        content:
          "Laura presenta una campaña frente a EJECUTIVOS de aspecto serio. Su presentación es perfecta, pero nadie sonríe.\n\nJEFE\n(interrumpiendo)\nNecesitamos algo más... arriesgado. Algo que nadie haya visto antes.\n\nLaura asiente, pero su expresión revela preocupación.",
      },
      {
        title: "ESCENA 3 - INTERIOR. CAFETERÍA - TARDE",
        content:
          "Laura, frustrada, toma café. En la mesa de al lado, MIGUEL (35), artista callejero, dibuja en su cuaderno. Laura observa fascinada sus dibujos surrealistas.\n\nLAURA\nEso es... diferente.\n\nMIGUEL\n(sonriendo)\n¿Diferente bueno o diferente malo?\n\nLAURA\nDiferente... perfecto.",
      },
      {
        title: "ESCENA 4 - EXTERIOR. CALLES DE LA CIUDAD - ATARDECER",
        content:
          "Laura y Miguel caminan por la ciudad. Él le muestra su arte urbano: instalaciones sorprendentes que interactúan con el entorno.\n\nMIGUEL\nEl arte no debe estar encerrado. Debe vivir donde vive la gente.\n\nLaura toma fotos, su mente trabajando a toda velocidad.",
      },
      {
        title: "ESCENA 5 - INTERIOR. SALA DE JUNTAS - DÍA",
        content:
          "Laura presenta una nueva campaña: marketing guerrilla inspirado en el arte de Miguel. Proyecta imágenes de instalaciones artísticas con el logo del cliente integrado en espacios urbanos.\n\nJEFE\n(impresionado)\nEsto es... exactamente lo que pedí. ¿Cómo lo conseguiste?\n\nLAURA\nAprendí a mirar fuera de la caja. Literalmente.",
      },
      {
        title: "ESCENA 6 - EXTERIOR. INAUGURACIÓN DE CAMPAÑA - NOCHE",
        content:
          "Una multitud se reúne alrededor de una instalación artística. Laura y Miguel observan orgullosos. Sus manos se encuentran y se entrelazan.\n\nMIGUEL\n¿Sabes qué es lo mejor de salir de tu zona de confort?\n\nLAURA\n¿Qué?\n\nMIGUEL\nQue nunca sabes qué otras cosas maravillosas encontrarás.\n\nLaura sonríe, por primera vez en mucho tiempo, completamente relajada.\n\nFIN",
      },
    ],
  },
}

export default function SampleProjectPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState("script")
  const [activeSceneIndex, setActiveSceneIndex] = useState(0)

  const projectId = params.id
  const project = sampleProjects[projectId]

  if (!project) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Proyecto no encontrado</h1>
          </div>
          <Card>
            <CardContent className="p-6">
              <p>El proyecto de ejemplo solicitado no existe.</p>
              <Link href="/">
                <Button className="mt-4">Volver al inicio</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const activeScene = project.scenes[activeSceneIndex]

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">{project.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>

        <p className="text-gray-400">{project.description}</p>

        <div className="grid grid-cols-1 gap-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="script">Guión</TabsTrigger>
              <TabsTrigger value="full">Guión completo</TabsTrigger>
            </TabsList>

            <TabsContent value="script">
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
                    <div className="md:col-span-1">
                      <h3 className="font-medium text-gray-200 mb-4">Escenas</h3>
                      <div className="space-y-2">
                        {project.scenes.map((scene, index) => (
                          <div
                            key={index}
                            className={`p-2 rounded-md cursor-pointer ${
                              index === activeSceneIndex ? "bg-[#3A3A3A]" : "hover:bg-[#2A2A2A]"
                            }`}
                            onClick={() => setActiveSceneIndex(index)}
                          >
                            <div className="truncate text-sm text-gray-200">
                              {scene.title.length > 30 ? scene.title.substring(0, 30) + "..." : scene.title}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="md:col-span-3">
                      <h3 className="font-medium text-gray-200 mb-4">{activeScene.title}</h3>
                      <div className="min-h-[400px] p-4 font-mono bg-[#2A2A2A] border border-[#444444] rounded-md text-gray-200 overflow-auto">
                        <MarkdownRenderer content={activeScene.content} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="full">
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-gray-200">Guión completo</h3>
                    <Button variant="outline" size="sm" className="flex items-center gap-1">
                      <FileText className="h-4 w-4 mr-2" />
                      Imprimir
                    </Button>
                  </div>
                  <div className="min-h-[600px] p-4 font-mono bg-[#2A2A2A] border border-[#444444] rounded-md text-gray-200 overflow-auto">
                    <MarkdownRenderer content={project.content} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
