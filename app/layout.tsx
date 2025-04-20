import type React from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { FirebaseProvider } from "@/lib/firebase-provider";
import { Toaster } from "@/components/ui/toaster";
import { ToastProvider } from "@/components/ui/toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://zerochats.vercel.app"),
  title: "ZeroChats - Real time messaging app",
  description: "A real-time messaging app with a variety of features",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ZeroChats - Real time messaging app",
    description: "A real-time messaging app with a variety of features",
    url: "https://zerochats.vercel.app",
    siteName: "ZeroChats",
    images: [
      {
        url: "/logo/8b2dd08b-d439-4116-b798-89421c394982.png",
        width: 1200,
        height: 630,
        alt: "ZeroChats Logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZeroChats - Real time messaging app",
    description: "A real-time messaging app with a variety of features",
    images: ["/logo/8b2dd08b-d439-4116-b798-89421c394982.png"],
  },
  icons: {
    icon: "/logo/8b2dd08b-d439-4116-b798-89421c394982.png",
    shortcut: "/logo/8b2dd08b-d439-4116-b798-89421c394982.png",
    apple: "/logo/8b2dd08b-d439-4116-b798-89421c394982.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#121212" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ToastProvider>
          <ThemeProvider defaultTheme="system" storageKey="zerochats-theme">
            <FirebaseProvider>
              {children}
              <Toaster />
            </FirebaseProvider>
          </ThemeProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
