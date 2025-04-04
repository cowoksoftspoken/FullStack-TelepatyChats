"use client"

import type React from "react"

import { useState, useRef } from "react"
import { addDoc, collection } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { Send, ImageIcon, Film, File, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFirebase } from "@/lib/firebase-provider"
import { toast } from "@/components/ui/use-toast"
import type { User } from "@/types/user"

interface BroadcastMessageProps {
  users?: User[]
}

export function BroadcastMessage({ users = [] }: BroadcastMessageProps) {
  const { db, storage, currentUser } = useFirebase()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [audience, setAudience] = useState<"all" | "verified" | "unverified" | "selected">("all")
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaType, setMediaType] = useState<"image" | "video" | "file" | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "video" | "file") => {
    const file = e.target.files?.[0]
    if (!file) return

    setMediaType(type)
    setMediaFile(file)

    // Create preview for images and videos
    if (type === "image" || type === "video") {
      const url = URL.createObjectURL(file)
      setPreview(url)
    } else {
      setPreview(null)
    }
  }

  const handleSendBroadcast = async () => {
    if (!message.trim() && !mediaFile) return
    if (!currentUser?.isAdmin) {
      toast({
        variant: "destructive",
        title: "Permission denied",
        description: "You don't have permission to send broadcast messages.",
      })
      return
    }

    setIsUploading(true)

    try {
      let mediaUrl = ""
      const finalMediaType = mediaType

      // Upload media if exists
      if (mediaFile && mediaType) {
        const storageRef = ref(storage, `broadcasts/${Date.now()}_${mediaFile.name}`)
        await uploadBytes(storageRef, mediaFile)
        mediaUrl = await getDownloadURL(storageRef)
      }

      // Add broadcast to Firestore
      await addDoc(collection(db, "broadcasts"), {
        senderId: currentUser.uid,
        message: message.trim(),
        mediaUrl: mediaUrl || null,
        mediaType: finalMediaType || null,
        sentAt: new Date().toISOString(),
        sentTo: audience,
        selectedUsers: audience === "selected" ? users.map((user) => user.uid) : [],
      })

      toast({
        title: "Broadcast sent",
        description: "Your message has been sent successfully.",
      })

      // Reset form and close dialog
      setMessage("")
      setMediaFile(null)
      setMediaType(null)
      setPreview(null)
      setAudience("all")
      setOpen(false)
    } catch (error) {
      console.error("Error sending broadcast:", error)
      toast({
        variant: "destructive",
        title: "Failed to send broadcast",
        description: "An error occurred while sending your message. Please try again.",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="flex gap-2">
          <Send className="h-4 w-4" />
          <span>Broadcast Message</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Broadcast Message</DialogTitle>
          <DialogDescription>
            Send a message to multiple users at once. This will appear as a direct message from the system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Textarea
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>

          {preview && (
            <div className="relative">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                {mediaType === "image" ? (
                  <img src={preview || "/placeholder.svg"} alt="Media preview" className="h-full w-full object-cover" />
                ) : mediaType === "video" ? (
                  <video src={preview} className="h-full w-full object-cover" controls muted />
                ) : null}
              </div>
              <Button
                variant="destructive"
                size="icon"
                className="absolute right-2 top-2 h-8 w-8 rounded-full"
                onClick={() => {
                  setPreview(null)
                  setMediaType(null)
                  setMediaFile(null)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {mediaFile && mediaType === "file" && (
            <div className="flex items-center gap-2 rounded-md border p-3">
              <File className="h-6 w-6 text-muted-foreground" />
              <div className="flex-1 truncate">
                <p className="text-sm font-medium">{mediaFile.name}</p>
                <p className="text-xs text-muted-foreground">{(mediaFile.size / 1024).toFixed(2)} KB</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setMediaFile(null)
                  setMediaType(null)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => imageInputRef.current?.click()}>
              <ImageIcon className="h-5 w-5" />
              <input
                type="file"
                ref={imageInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => handleFileSelect(e, "image")}
              />
            </Button>
            <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => videoInputRef.current?.click()}>
              <Film className="h-5 w-5" />
              <input
                type="file"
                ref={videoInputRef}
                className="hidden"
                accept="video/*"
                onChange={(e) => handleFileSelect(e, "video")}
              />
            </Button>
            <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => fileInputRef.current?.click()}>
              <File className="h-5 w-5" />
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="application/*,text/*"
                onChange={(e) => handleFileSelect(e, "file")}
              />
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Send to</label>
            <Select value={audience} onValueChange={(value) => setAudience(value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select audience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="verified">Verified Users Only</SelectItem>
                <SelectItem value="unverified">Unverified Users Only</SelectItem>
                <SelectItem value="selected">Selected Users</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSendBroadcast} disabled={isUploading || (!message.trim() && !mediaFile)}>
            {isUploading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Sending...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                <span>Send Broadcast</span>
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

