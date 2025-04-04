"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { useFirebase } from "@/lib/firebase-provider"

export default function AdminPage() {
  const { currentUser, loading } = useFirebase()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        router.push("/login")
      } else if (!currentUser.isAdmin) {
        router.push("/dashboard")
      }
    }
  }, [currentUser, loading, router])

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!currentUser?.isAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return <AdminDashboard />
}

