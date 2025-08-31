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
  metadataBase: new URL("https://telepaty.vercel.app"),
  title: "Telepaty - Real-time messaging app",
  description:
    "Telepaty is a feature-rich real-time messaging app with location sharing, image & video messaging, voice and video calls, stories, and more — all protected with end-to-end encryption (E2EE).",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Telepaty - Real-time messaging app",
    description:
      "Telepaty is a feature-rich real-time messaging app with location sharing, image & video messaging, voice and video calls, stories, and more — all protected with end-to-end encryption (E2EE).",
    url: "https://telepathy.vercel.app",
    siteName: "Telepaty",
    images: [
      {
        url: "/dark_icon/android-chrome-192x192.png",
        width: 1200,
        height: 630,
        alt: "Telepaty Logo",
      },
    ],
    type: "website",
  },
  other: {
    releaseDate: "2024-7-23",
    author: "Inggrit Setya Budi",
    version: "2.15.8",
  },
  twitter: {
    card: "summary_large_image",
    title: "Telepaty - Real-time messaging app",
    description:
      "Telepaty is a feature-rich real-time messaging app with location sharing, image & video messaging, voice and video calls, stories, and more — all protected with end-to-end encryption (E2EE).",
    images: ["/dark_icon/android-chrome-192x192.png"],
  },
  icons: {
    icon: [
      { url: "/dark_icon/favicon.ico", type: "image/x-icon" },
      {
        url: "/dark_icon/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/dark_icon/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/dark_icon/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/dark_icon/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        url: "/dark_icon/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcut: "/light_icon/favicon.ico",
    apple: "/dark_icon/apple-touch-icon.png",
  },
  manifest: "/manifest/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#121212" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <link
          rel="icon"
          href="/favicon_light.jpg"
          media="(prefers-color-scheme: light)"
        />
        <link
          rel="icon"
          href="/favicon_dark.jpg"
          media="(prefers-color-scheme: dark)"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Telepaty",
              applicationCategory: "MessagingApp",
              operatingSystem: "Web",
              author: {
                "@type": "Person",
                name: metadata.other?.author ?? "Telepaty Team",
              },
              releaseDate: metadata.other?.releaseDate ?? "2024-7-23",
              version: metadata.other?.version ?? "2.15.8",
            }),
          }}
        />
      </head>
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
