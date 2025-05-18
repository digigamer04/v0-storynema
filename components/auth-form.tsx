"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, AlertCircle } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/context/auth-context"
import { Switch } from "@/components/ui/switch"

export default function AuthForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const router = useRouter()
  const { signIn, signUp, loading, error: authError } = useAuth()
  const [localError, setLocalError] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState(false)

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    try {
      await signIn(email, password, rememberMe)
      toast({
        title: "Inicio de sesión exitoso",
        description: "Has iniciado sesión correctamente.",
      })

      // Redirección mejorada
      // Usar replace en lugar de push para evitar problemas con el historial
      router.replace("/")
    } catch (error) {
      console.error("Error signing in:", error)
      setLocalError("Error al iniciar sesión. Verifica tus credenciales.")
      toast({
        title: "Error",
        description: "Error al iniciar sesión. Verifica tus credenciales.",
        variant: "destructive",
      })
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    try {
      await signUp(email, password)
      toast({
        title: "Registro exitoso",
        description: "Te has registrado correctamente. Verifica tu correo electrónico para confirmar tu cuenta.",
      })
    } catch (error) {
      console.error("Error signing up:", error)
      setLocalError("Error al registrarse. Inténtalo de nuevo.")
      toast({
        title: "Error",
        description: "Error al registrarse. Inténtalo de nuevo.",
        variant: "destructive",
      })
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <Tabs defaultValue="signin">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Acceso a Storynema</CardTitle>
          <CardDescription className="text-center">
            Inicia sesión o regístrate para acceder a todas las funcionalidades
          </CardDescription>
          <TabsList className="grid grid-cols-2 mt-4">
            <TabsTrigger value="signin">Iniciar sesión</TabsTrigger>
            <TabsTrigger value="signup">Registrarse</TabsTrigger>
          </TabsList>
        </CardHeader>

        <CardContent>
          {(localError || authError) && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {localError || (authError instanceof Error ? authError.message : String(authError))}
              </AlertDescription>
            </Alert>
          )}

          <TabsContent value="signin">
            <form onSubmit={handleSignIn}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email-signin">Correo electrónico</Label>
                  <Input
                    id="email-signin"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password-signin">Contraseña</Label>
                  <Input
                    id="password-signin"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <Switch id="remember-me" checked={rememberMe} onCheckedChange={setRememberMe} />
                  <Label htmlFor="remember-me" className="text-sm text-gray-300">
                    Mantener sesión iniciada
                  </Label>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Iniciando sesión...
                    </>
                  ) : (
                    "Iniciar sesión"
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email-signup">Correo electrónico</Label>
                  <Input
                    id="email-signup"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password-signup">Contraseña</Label>
                  <Input
                    id="password-signup"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    "Registrarse"
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-gray-500">
            Al registrarte, aceptas nuestros términos y condiciones.
          </div>
        </CardFooter>
      </Tabs>
    </Card>
  )
}
