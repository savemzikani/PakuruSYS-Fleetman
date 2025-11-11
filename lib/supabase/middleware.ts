import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

type SupabaseCookie = {
  name: string
  value: string
  options?: Parameters<NextResponse["cookies"]["set"]>[2]
}

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[supabase-middleware] Missing Supabase environment variables")
    return NextResponse.next()
  }

  const setCookies: SupabaseCookie[] = []
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options)
          setCookies.push({ name, value, options })
        })
      },
    },
  })

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    console.error("[supabase-middleware] Failed to validate session", error)
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    const redirectResponse = NextResponse.redirect(url)
    setCookies.forEach(({ name, value, options }) => redirectResponse.cookies.set(name, value, options))
    return redirectResponse
  }

  const isAuthRoute = request.nextUrl.pathname.startsWith("/auth") || request.nextUrl.pathname === "/"

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    const redirectResponse = NextResponse.redirect(url)
    setCookies.forEach(({ name, value, options }) => redirectResponse.cookies.set(name, value, options))
    return redirectResponse
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    const redirectResponse = NextResponse.redirect(url)
    setCookies.forEach(({ name, value, options }) => redirectResponse.cookies.set(name, value, options))
    return redirectResponse
  }

  return response
}
