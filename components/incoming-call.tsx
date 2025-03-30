"use client";

import { useState, useEffect } from "react";
import { Phone, PhoneOff, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@/types/user";

interface IncomingCallProps {
  caller: User;
  isVideo: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCall({
  caller,
  isVideo,
  onAccept,
  onReject,
}: IncomingCallProps) {
  const [ringing, setRinging] = useState<boolean>(true);

  // useEffect(() => {
  //   if (ringing) {
  //     const audio = new Audio("/ringtone.mp3");
  //     audio.loop = true;
  //     audio
  //       .play()
  //       .catch((err) => console.error("Could not play ringtone:", err));

  //     return () => {
  //       audio.pause();
  //       audio.currentTime = 0;
  //     };
  //   }
  // }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md animate-pulse">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage
                  src={caller.photoURL || ""}
                  alt={caller.displayName}
                />
                <AvatarFallback className="text-3xl">
                  {caller.displayName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {isVideo ? (
                <Video className="absolute -right-2 -top-2 h-8 w-8 rounded-full bg-primary p-1.5 text-primary-foreground" />
              ) : (
                <Phone className="absolute -right-2 -top-2 h-8 w-8 rounded-full bg-primary p-1.5 text-primary-foreground" />
              )}
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold">{caller.displayName}</h2>
              <p className="text-muted-foreground">
                Incoming {isVideo ? "video" : "audio"} call...
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center gap-4 pb-6">
          <Button
            variant="destructive"
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={() => {
              setRinging(false);
              onReject();
            }}
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
          <Button
            variant="default"
            size="icon"
            className="h-12 w-12 rounded-full bg-green-600 hover:bg-green-700"
            onClick={() => {
              setRinging(false);
              onAccept();
            }}
          >
            <Phone className="h-6 w-6" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
