import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createServerSupabaseClientWithCookies } from "@/lib/supabase"

export async function GET(request: Request) {
  const cookieStore = cookies()
  const supabase = createServerSupabaseClientWithCookies(cookieStore)

  // Resto de la lógica del endpoint...

  return NextResponse.json({ success: true })
}
