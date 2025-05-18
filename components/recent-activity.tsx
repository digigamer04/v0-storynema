import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { FileEdit, Film, MessageSquare, PenSquare } from "lucide-react"

// Datos de ejemplo para actividad reciente
const activities = [
  {
    id: "1",
    user: "María G.",
    action: "editó el guión",
    project: "El Camino del Héroe",
    time: "Hace 2 horas",
    icon: <FileEdit className="h-4 w-4" />,
  },
  {
    id: "2",
    user: "Carlos R.",
    action: "añadió imágenes al storyboard",
    project: "Sombras del Pasado",
    time: "Hace 5 horas",
    icon: <Film className="h-4 w-4" />,
  },
  {
    id: "3",
    user: "Ana L.",
    action: "comentó en la escena 5",
    project: "Amanecer en París",
    time: "Ayer",
    icon: <MessageSquare className="h-4 w-4" />,
  },
  {
    id: "4",
    user: "Tú",
    action: "creaste un nuevo proyecto",
    project: "Proyecto sin título",
    time: "Hace 2 días",
    icon: <PenSquare className="h-4 w-4" />,
  },
]

export function RecentActivity() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {activity.user
                    .split(" ")
                    .map((name) => name[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="font-medium">{activity.user}</span> {activity.action} en{" "}
                  <span className="font-medium">{activity.project}</span>
                </p>
                <div className="flex items-center text-xs text-muted-foreground">
                  {activity.icon}
                  <span className="ml-1">{activity.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
