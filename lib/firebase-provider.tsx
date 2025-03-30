"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { Loader2 } from "lucide-react"
import { auth, db, storage } from "./firebase"

// Create context
interface FirebaseContextType {
  auth: typeof auth
  db: typeof db
  storage: typeof storage
  currentUser: any
  loading: boolean
}

const FirebaseContext = createContext<FirebaseContextType | null>(null)

// Provider component
export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setCurrentUser(user)
        setLoading(false)
      },
      (error) => {
        console.error("Auth state change error:", error)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [])

  // Show loading screen while Firebase is initializing
  if (loading && !currentUser) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading...</span>
      </div>
    )
  }

  return (
    <FirebaseContext.Provider
      value={{
        auth,
        db,
        storage,
        currentUser,
        loading,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  )
}

// Hook to use the Firebase context
export function useFirebase() {
  const context = useContext(FirebaseContext)
  if (!context) {
    throw new Error("useFirebase must be used within a FirebaseProvider")
  }
  return context
}

