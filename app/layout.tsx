import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { FirebaseProvider } from "@/lib/firebase-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Chat Apps",
  description:
    "A real-time video calling application built with WebRTC and React",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <FirebaseProvider>
          <ThemeProvider defaultTheme="system" storageKey="webrtc-theme">
            {children}
          </ThemeProvider>
        </FirebaseProvider>
      </body>
    </html>
  );
}

import "./globals.css";
