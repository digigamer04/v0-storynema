import AuthForm from "@/components/auth-form"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Iniciar sesión | Storynema",
  description: "Inicia sesión o regístrate en Storynema para crear y gestionar tus proyectos audiovisuales",
}

export default function AuthPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#121212] p-4">
      <div className="w-full max-w-md mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Storynema</h1>
        <p className="text-gray-400">
          Herramienta para hacer guiones y storyboards de manera interactiva asistido por IA
        </p>
      </div>
      <AuthForm />
    </div>
  )
}
