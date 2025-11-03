"use client"

import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/types/database"
import { useEffect, useState, useRef, useCallback } from "react"

export function useUser() {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchingRef = useRef(false)
  const initializedRef = useRef(false)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const getUser = useCallback(async () => {
    if (fetchingRef.current) {
      console.log("[v0] Already fetching user, skipping...")
      return
    }

    if (!supabaseRef.current) {
      console.log("[v0] No Supabase client available")
      return
    }

    fetchingRef.current = true

    try {
      console.log("[v0] Getting user from Supabase...")
      const {
        data: { user: authUser },
        error: authError,
      } = await supabaseRef.current.auth.getUser()

      console.log("[v0] Auth user result:", { user: !!authUser, error: authError })

      if (authError) {
        console.error("[v0] Auth error:", authError)
        throw authError
      }

      if (authUser) {
        console.log("[v0] Fetching user profile...")
        const { data: profile, error: profileError } = await supabaseRef.current
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .maybeSingle()

        console.log("[v0] Profile result:", { profile: !!profile, error: profileError })

        if (profileError) {
          console.error("[v0] Profile error:", profileError)
          throw profileError
        }

        if (!profile) {
          console.log("[v0] No profile found for user, setting null user")
          setUser(null)
          return
        }

        if (profile.company_id) {
          console.log("[v0] Fetching company data...")
          const { data: profileWithCompany, error: companyError } = await supabaseRef.current
            .from("profiles")
            .select(`
              *,
              company:companies(*)
            `)
            .eq("id", authUser.id)
            .maybeSingle()

          console.log("[v0] Company result:", { profile: !!profileWithCompany, error: companyError })

          if (companyError) {
            console.error("[v0] Company error:", companyError)
            throw companyError
          }
          setUser(profileWithCompany)
        } else {
          console.log("[v0] User has no company, setting profile only")
          setUser({ ...profile, company: null })
        }
      } else {
        console.log("[v0] No authenticated user found")
        setUser(null)
      }
    } catch (err) {
      console.error("[v0] User loading error:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    try {
      supabaseRef.current = createClient()
      console.log("[v0] Supabase client created successfully")
    } catch (err) {
      console.error("[v0] Failed to create Supabase client:", err)
      setError("Failed to initialize authentication")
      setLoading(false)
      return
    }

    getUser()

    try {
      const {
        data: { subscription },
      } = supabaseRef.current.auth.onAuthStateChange(async (event, session) => {
        console.log("[v0] Auth state change:", event)

        if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user && !fetchingRef.current) {
          setLoading(true)
          await getUser()
        } else if (event === "SIGNED_OUT") {
          setUser(null)
          setLoading(false)
          fetchingRef.current = false
        }
      })

      return () => {
        subscription.unsubscribe()
        fetchingRef.current = false
      }
    } catch (err) {
      console.error("[v0] Error setting up auth state listener:", err)
      setError("Failed to setup authentication listener")
    }
  }, [getUser])

  return { user, loading, error }
}
