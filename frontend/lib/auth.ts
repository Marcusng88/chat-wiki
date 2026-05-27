import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}

export async function getSession() {
  const supabase = await getSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getUserId(): Promise<string | null> {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function getAuthHeader(): Promise<{ Authorization: string } | null> {
  const session = await getSession()
  if (!session?.access_token) return null
  return { Authorization: `Bearer ${session.access_token}` }
}
