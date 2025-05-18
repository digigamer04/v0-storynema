import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Este middleware captura información sobre el entorno para depuración
export function middleware(request: NextRequest) {
  // Solo aplicar a rutas de API específicas
  if (request.nextUrl.pathname.startsWith("/api/scenes/")) {
    console.log("[MIDDLEWARE] Procesando solicitud a", request.nextUrl.pathname)
    console.log("[MIDDLEWARE] Método:", request.method)
    console.log("[MIDDLEWARE] User-Agent:", request.headers.get("user-agent"))

    // Modificar la respuesta para incluir headers de diagnóstico
    const response = NextResponse.next()

    response.headers.set("x-middleware-time", new Date().toISOString())
    response.headers.set("x-environment", process.env.NODE_ENV || "unknown")

    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: "/api/scenes/:path*",
}
