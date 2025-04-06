import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { FirebaseProvider } from "@/lib/firebase-provider";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ZeroChats - Real time messaging app",
  description: "A real-time messaging app with a variety of features",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider defaultTheme="system" storageKey="zerochats-theme">
          <FirebaseProvider>
            {children}
            <Toaster />
          </FirebaseProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
