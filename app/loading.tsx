"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Loading() {
  const [loadingPhrase, setLoadingPhrase] = useState("Loading");
  const [dotCount, setDotCount] = useState(0);

  useEffect(() => {
    const phrases = [
      "Loading",
      "Preparing your chat",
      "Connecting securely",
      "Almost there",
      "Setting things up",
    ];
    let phraseIndex = 0;

    const phraseInterval = setInterval(() => {
      phraseIndex = (phraseIndex + 1) % phrases.length;
      setLoadingPhrase(phrases[phraseIndex]);
    }, 2000);

    return () => clearInterval(phraseInterval);
  }, []);

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4);
    }, 500);

    return () => clearInterval(dotInterval);
  }, []);

  const bubbleVariants = {
    initial: (i: number) => ({
      opacity: 0.3,
      y: 0,
      scale: 0.8,
    }),
    animate: (i: number) => ({
      opacity: 1,
      y: [-10, 0, -10],
      scale: [0.8, 1, 0.8],
      transition: {
        y: {
          repeat: Number.POSITIVE_INFINITY,
          duration: 1.5,
          ease: "easeInOut",
          delay: i * 0.2,
        },
        opacity: {
          duration: 0.2,
        },
        scale: {
          repeat: Number.POSITIVE_INFINITY,
          duration: 1.5,
          ease: "easeInOut",
          delay: i * 0.2,
        },
      },
    }),
  };

  const textVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: {
        duration: 0.3,
      },
    },
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <div className="flex flex-col items-center justify-center max-w-md w-full">
        <div className="relative mb-8">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              className="h-10 w-10 text-primary"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>

            <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse"></div>
          </div>
        </div>

        <div className="flex justify-center space-x-3 mb-6">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              custom={i}
              variants={bubbleVariants}
              initial="initial"
              animate="animate"
              className="w-3 h-3 rounded-full bg-primary"
            ></motion.div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={loadingPhrase}
            variants={textVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="text-center"
          >
            <p className="text-lg font-medium text-foreground">
              {loadingPhrase}
              <span>{".".repeat(dotCount)}</span>
            </p>
          </motion.div>
        </AnimatePresence>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="mt-4 text-sm text-muted-foreground text-center max-w-xs"
        >
          We're preparing your secure chat environment. This might take a
          moment.
        </motion.p>

        <motion.div
          className="w-48 h-1 bg-muted rounded-full mt-6 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.div
            className="h-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{
              duration: 3,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          ></motion.div>
        </motion.div>
      </div>
    </div>
  );
}
