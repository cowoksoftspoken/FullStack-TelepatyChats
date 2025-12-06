"use client";

import { LoginForm } from "@/components/login-form";
import { Brain } from "lucide-react";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";

export default function LoginPage() {
  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}
      scriptProps={{
        async: false,
        defer: false,
        appendTo: "head",
        nonce: undefined,
      }}
    >
      <div className="min-h-screen flex bg-background">
        <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
          <div className="w-full max-w-md">
            <LoginForm />
          </div>
        </div>

        <div className="hidden lg:flex flex-1 relative overflow-hidden">
          <div className="absolute inset-0 gradient-primary opacity-95" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary/30" />

          <div className="relative z-10 flex items-center justify-center p-12">
            <div className="text-center space-y-8 max-w-lg">
              <div className="relative">
                <div className="w-40 h-40 mx-auto rounded-3xl bg-black/10 dark:bg-white/10 backdrop-blur-md flex items-center justify-center shadow-2xl">
                  <div className="w-24 h-24 rounded-2xl bg-black/10 dark:bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <div className="w-12 h-12 rounded-xl bg-black/20 dark:bg-white/40 backdrop-blur-sm flex items-center justify-center gradient-primary">
                      <Brain className="w-6 h-6 rounded-lg text-muted dark:bg-white/70 bg-black/10" />
                    </div>
                  </div>
                </div>

                <div className="absolute -top-4 -right-4 w-8 h-8 rounded-full bg-black/10 dark:bg-white/20 backdrop-blur-sm animate-pulse" />
                <div className="absolute -bottom-2 -left-2 w-6 h-6 rounded-full bg-black/5 dark:bg-white/15 backdrop-blur-sm animate-pulse delay-300" />
              </div>

              <div className="space-y-4">
                <h2 className="text-3xl font-bold text-balance leading-tight text-gray-900/20 dark:text-white/90">
                  Join{" "}
                  <span className="dark:text-primary text-black/30">
                    Telepaty
                  </span>{" "}
                  — The Future of Messaging
                </h2>
                <p className="dark:text-white/90 text-black/30 text-pretty text-lg leading-relaxed">
                  Experience seamless, real-time conversations. Connect, share,
                  and collaborate with powerful features designed for a modern
                  messaging experience.
                </p>
              </div>

              <div className="flex justify-center space-x-3 pt-4">
                <div className="w-3 h-3 rounded-full bg-white/80 shadow-lg" />
                <div className="w-3 h-3 rounded-full bg-white/50" />
                <div className="w-3 h-3 rounded-full bg-white/50" />
              </div>
            </div>
          </div>

          <div className="absolute top-20 right-20 w-24 h-24 rounded-full bg-white/5 backdrop-blur-sm animate-pulse delay-700" />
          <div className="absolute bottom-32 right-32 w-16 h-16 rounded-full bg-white/8 backdrop-blur-sm animate-pulse delay-1000" />
          <div className="absolute top-1/2 right-12 w-8 h-8 rounded-full bg-white/6 backdrop-blur-sm animate-pulse delay-500" />
          <div className="absolute top-1/3 right-1/4 w-4 h-4 rounded-full bg-white/10 backdrop-blur-sm animate-pulse delay-200" />
        </div>
      </div>
    </GoogleReCaptchaProvider>
  );
}
