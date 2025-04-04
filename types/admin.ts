export interface Broadcast {
    id: string
    senderId: string
    message: string
    mediaUrl?: string
    mediaType?: "image" | "video" | "audio" | "file"
    sentAt: string
    sentTo: "all" | "verified" | "unverified" | "selected"
    selectedUsers?: string[] // Array of user IDs if sentTo is "selected"
  }
  
  export interface VerificationRequest {
    id: string
    userId: string
    requestedAt: string
    status: "pending" | "approved" | "rejected"
    reviewedBy?: string
    reviewedAt?: string
    reason?: string
  }
  
  