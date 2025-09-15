"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, PhoneOff, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { UserAvatar } from "./user-avatar";
import type { User } from "@/types/user";

interface EnhancedIncomingCallProps {
  caller: User;
  isVideo: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export function EnhancedIncomingCall({
  caller,
  isVideo,
  onAccept,
  onReject,
}: EnhancedIncomingCallProps) {
  useEffect(() => {
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    const playRingtone = () => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.5
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    };

    const interval = setInterval(playRingtone, 2000);
    playRingtone();

    return () => {
      clearInterval(interval);
      if (audioContext.state !== "closed") {
        audioContext.close();
      }
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
              className="relative"
            >
              <div className="w-24 h-24">
                <UserAvatar user={caller} size="lg" />
              </div>

              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                className="absolute -right-2 -top-2"
              >
                {isVideo ? (
                  <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
                    <Video className="h-4 w-4 text-white" />
                  </div>
                ) : (
                  <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <Phone className="h-4 w-4 text-white" />
                  </div>
                )}
              </motion.div>
            </motion.div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <strong>{caller.displayName}</strong>{" "}
                {caller.isVerified && !caller.isAdmin && (
                  <svg
                    aria-label="Verified"
                    fill="rgb(0, 149, 246)"
                    height="16"
                    role="img"
                    viewBox="0 0 40 40"
                    width="16"
                  >
                    <path
                      d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z"
                      fillRule="evenodd"
                    />
                  </svg>
                )}
                {caller.isAdmin && (
                  <svg
                    aria-label="Afiliated Account"
                    height="15"
                    role="img"
                    viewBox="0 0 40 40"
                    width="15"
                  >
                    <defs>
                      <linearGradient
                        id="metallicGold"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop offset="0%" stop-color="#fff7b0" />
                        <stop offset="25%" stop-color="#ffd700" />
                        <stop offset="50%" stop-color="#ffa500" />
                        <stop offset="75%" stop-color="#ffd700" />
                        <stop offset="100%" stop-color="#fff7b0" />
                      </linearGradient>
                    </defs>
                    <title>Afiliated Account</title>
                    <path
                      d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z"
                      fill="url(#metallicGold)"
                      fill-rule="evenodd"
                    ></path>
                  </svg>
                )}
              </div>
              <div className="flex items-center justify-center gap-1 mt-1">
                <p className="text-muted-foreground">
                  Incoming {isVideo ? "video" : "voice"} call
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {caller.email}
              </p>
            </div>

            <div className="absolute inset-0 pointer-events-none">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 border-2 border-primary/30 rounded-full"
                  animate={{
                    scale: [1, 2, 2],
                    opacity: [0.5, 0.2, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: i * 0.6,
                  }}
                />
              ))}
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-center gap-6 pb-6">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button
              variant="destructive"
              size="lg"
              className="rounded-full h-16 w-16"
              onClick={onReject}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            animate={{
              boxShadow: [
                "0 0 0 0 rgba(34, 197, 94, 0.7)",
                "0 0 0 10px rgba(34, 197, 94, 0)",
                "0 0 0 0 rgba(34, 197, 94, 0)",
              ],
            }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
          >
            <Button
              size="lg"
              className="rounded-full h-16 w-16 bg-green-500 hover:bg-green-600"
              onClick={onAccept}
            >
              {isVideo ? (
                <Video className="h-6 w-6" />
              ) : (
                <Phone className="h-6 w-6" />
              )}
            </Button>
          </motion.div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
