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
  title: "ZeroChats - Real-time messaging app",
  description:
    "ZeroChats is a feature-rich real-time messaging app with location sharing, image & video messaging, voice and video calls, stories, and more — all protected with end-to-end encryption (E2EE).",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ZeroChats - Real-time messaging app",
    description:
      "ZeroChats is a feature-rich real-time messaging app with location sharing, image & video messaging, voice and video calls, stories, and more — all protected with end-to-end encryption (E2EE).",
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
    title: "ZeroChats - Real-time messaging app",
    description:
      "ZeroChats is a feature-rich real-time messaging app with location sharing, image & video messaging, voice and video calls, stories, and more — all protected with end-to-end encryption (E2EE).",
    images: ["/logo/8b2dd08b-d439-4116-b798-89421c394982.png"],
  },
  icons: {
    icon: [
      { url: "/logo/favicon.ico", type: "image/x-icon" },
      { url: "/logo/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/logo/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      {
        url: "/logo/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/logo/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        url: "/logo/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcut: "/logo/favicon.ico",
    apple: "/logo/apple-touch-icon.png",
  },
  manifest: "/manifest/site.webmanifest",
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
  if (typeof window !== "undefined") {
    const styleTitle =
      "color: red; font-size: 32px; font-weight: bold; text-shadow: 1px 1px black;";
    const styleBody =
      "color: white; background-color: red; font-size: 14px; padding: 10px; font-family: monospace;";
    const styleHighlight =
      "color: yellow; background-color: black; font-size: 16px; padding: 8px; font-weight: bold; font-family: monospace;";

    console.log("%c⚠️ WARNING! ⚠️", styleTitle);
    console.log(
      "%cThis is a browser feature intended for developers. If someone told you to copy and paste something here, it is a scam and will give them access to your messages, private keys, or account.",
      styleBody
    );
    console.log(
      "%cThis console is not a playground.\nIf someone told you to paste something here, they are trying to scam you. Pasting code here can give attackers FULL access to your account, private messages, and identity.",
      styleBody
    );
    console.log(
      "%cDO NOT paste code here if you don’t fully understand what it does.",
      styleHighlight
    );
  }

  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
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
