"use client"

import { useRef, useEffect, useState } from "react"
import { Mic, MicOff, Phone, Video, VideoOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { User } from "@/types/user"

interface CallInterfaceProps {
  isVideo: boolean
  remoteStream: MediaStream | null
  localStream: MediaStream | null
  contact: User | null
  endCall: () => void
  toggleMute: () => void
  toggleVideo: () => void
}

export function CallInterface({
  isVideo,
  remoteStream,
  localStream,
  contact,
  endCall,
  toggleMute,
  toggleVideo,
}: CallInterfaceProps) {
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }

    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [remoteStream, localStream])

  const handleToggleMute = () => {
    setIsMuted(!isMuted)
    toggleMute()
  }

  const handleToggleVideo = () => {
    setIsVideoOff(!isVideoOff)
    toggleVideo()
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-black">
      {/* Remote Video (Full Screen) */}
      {isVideo && (
        <div className="relative flex-1">
          <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />

          {/* Contact name overlay */}
          <div className="absolute top-4 left-4 bg-black/50 px-4 py-2 rounded-lg">
            <p className="text-white">{contact?.displayName || "Unknown"}</p>
          </div>

          {/* Local Video (Picture-in-Picture) */}
          <div className="absolute bottom-24 right-4 h-40 w-60 overflow-hidden rounded-lg border-2 border-white">
            <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            {isVideoOff && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <p className="text-white">Camera Off</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Audio Call UI */}
      {!isVideo && (
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <span className="text-5xl">{contact?.displayName?.charAt(0) || "?"}</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{contact?.displayName}</h2>
          <p className="text-gray-300">Audio Call</p>
        </div>
      )}

      {/* Call Controls */}
      <div className="flex items-center justify-center gap-4 p-6">
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full bg-gray-800 text-white hover:bg-gray-700"
          onClick={handleToggleMute}
        >
          {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </Button>

        <Button variant="destructive" size="icon" className="h-16 w-16 rounded-full" onClick={endCall}>
          <Phone className="h-8 w-8 rotate-135" />
        </Button>

        {isVideo && (
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full bg-gray-800 text-white hover:bg-gray-700"
            onClick={handleToggleVideo}
          >
            {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
          </Button>
        )}
      </div>
    </div>
  )
}

