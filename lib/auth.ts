import { redirect } from "next/navigation"

export const DEV_AUTH_BYPASS = true
export const DEV_DEMO_USER_ID = "local-demo-user"

export type LocalUser = {
  id: string
  email: string
  user_metadata: { display_name: string }
}

export function getDevDemoUser(): LocalUser {
  return { id: DEV_DEMO_USER_ID, email: "demo@storynema.local", user_metadata: { display_name: "Usuario demo" } }
}

export async function getUser(_cookieStore?: unknown) {
  return getDevDemoUser()
}

export async function requireAuth() {
  const user = await getUser()
  if (!user) redirect("/auth")
  return user
}

export async function isResourceOwner(userId: string, resourceUserId: string) {
  return userId === resourceUserId || resourceUserId === DEV_DEMO_USER_ID
}

export async function getUserClient() {
  return getDevDemoUser()
}

export async function signIn() {
  return { user: getDevDemoUser() }
}

export async function signUp() {
  return { user: getDevDemoUser() }
}

export async function signOut() {
  return true
}
