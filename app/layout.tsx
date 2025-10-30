import type React from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { FirebaseProvider } from "@/lib/firebase-provider";
import { Toaster } from "@/components/ui/toaster";
import { ToastProvider } from "@/components/ui/toast";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  fallback: ["system-ui", "Arial"],
  adjustFontFallback: true,
  variable: "--tpy-inter-font",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://chat.telepaty.my.id"),
  title: "Telepaty - Real-time messaging app",
  description:
    "Telepaty is a feature-rich real-time messaging app with location sharing, image & video messaging, voice and video calls, stories, and more — all protected with end-to-end encryption (E2EE).",
  alternates: {
    canonical: "https://chat.telepaty.my.id",
  },
  keywords: [
    "chat app",
    "messaging",
    "video calls",
    "voice calls",
    "encrypted messaging",
    "telepaty chat",
    "location sharing",
    "real-time messages",
    "social chat app",
    "private communication",
  ],
  openGraph: {
    title: "Telepaty - Real-time messaging app",
    description:
      "Telepaty is a feature-rich real-time messaging app with location sharing, image & video messaging, voice and video calls, stories, and more — all protected with end-to-end encryption (E2EE).",
    url: "https://chat.telepaty.my.id",
    siteName: "Telepaty",
    images: [
      {
        url: "https://chat.telepaty.my.id/favicon_dark.jpg",
        width: 1024,
        height: 1024,
        alt: "Telepaty Dark Mode Logo",
      },
    ],
    type: "website",
  },
  other: {
    author: "Inggrit Setya Budi",
    encryption: "End-to-End Encryption (E2EE)",
    privacy:
      "User data stored securely with encryption and never shared with third parties",
  },
  twitter: {
    card: "summary_large_image",
    title: "Telepaty - Real-time messaging app",
    description:
      "Telepaty is a feature-rich real-time messaging app with location sharing, image & video messaging, voice and video calls, stories, and more — all protected with end-to-end encryption (E2EE).",
    images: ["https://chat.telepaty.my.id/favicon_dark.jpg"],
  },
  icons: {
    icon: [
      {
        url: "https://chat.telepaty.my.id/light_icon/favicon-16x16.png",
        type: "image/png",
        sizes: "16x16",
      },
      {
        url: "https://chat.telepaty.my.id/light_icon/favicon-32x32.png",
        type: "image/png",
        sizes: "32x32",
      },
      {
        url: "https://chat.telepaty.my.id/light_icon/android-chrome-192x192.png",
        type: "image/png",
        sizes: "192x192",
      },
      {
        url: "https://chat.telepaty.my.id/light_icon/android-chrome-512x512.png",
        type: "image/png",
        sizes: "512x512",
      },
      {
        url: "https://chat.telepaty.my.id/light_icon/apple-touch-icon.png",
        type: "image/png",
        sizes: "180x180",
      },

      {
        url: "https://chat.telepaty.my.id/dark_icon/favicon-16x16.png",
        type: "image/png",
        sizes: "16x16",
      },
      {
        url: "https://chat.telepaty.my.id/dark_icon/favicon-32x32.png",
        type: "image/png",
        sizes: "32x32",
      },
      {
        url: "https://chat.telepaty.my.id/dark_icon/android-chrome-192x192.png",
        type: "image/png",
        sizes: "192x192",
      },
      {
        url: "https://chat.telepaty.my.id/dark_icon/android-chrome-512x512.png",
        type: "image/png",
        sizes: "512x512",
      },
      {
        url: "https://chat.telepaty.my.id/dark_icon/apple-touch-icon.png",
        type: "image/png",
        sizes: "180x180",
      },
    ],
    shortcut: "https://chat.telepaty.my.id/light_icon/favicon.ico",
    apple: "https://chat.telepaty.my.id/dark_icon/apple-touch-icon.png",
  },
  manifest: "/manifest/site.webmanifest",
  category: "communication",
  applicationName: "Telepaty",
  appleWebApp: {
    capable: true,
    title: "Telepaty",
    statusBarStyle: "default",
  },
  referrer: "origin-when-cross-origin",
  robots:
    "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
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
          href="https://chat.telepaty.my.id/light_icon/favicon-16x16.png"
          media="(prefers-color-scheme: light)"
          type="image/png"
          sizes="16x16"
        />
        <link
          rel="icon"
          href="https://chat.telepaty.my.id/light_icon/favicon-32x32.png"
          media="(prefers-color-scheme: light)"
          type="image/png"
          sizes="32x32"
        />
        <link
          rel="icon"
          href="https://chat.telepaty.my.id/dark_icon/favicon-16x16.png"
          media="(prefers-color-scheme: dark)"
          type="image/png"
          sizes="16x16"
        />
        <link
          rel="icon"
          href="https://chat.telepaty.my.id/dark_icon/favicon-32x32.png"
          media="(prefers-color-scheme: dark)"
          type="image/png"
          sizes="32x32"
        />

        <link
          rel="shortcut icon"
          href="https://chat.telepaty.my.id/light_icon/favicon.ico"
          type="image/x-icon"
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
                name: metadata.other?.author ?? "Inggrit Setya Budi",
              },
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              featureList: [
                "Real-time chat & media sharing",
                "Voice & video calls",
                "End-to-end encryption",
                "Location sharing",
                "Stories & status updates",
              ],
              image: "https://chat.telepaty.my.id/favicon_dark.jpg",
            }),
          }}
        />
      </head>
      <body className={`${inter.className} ${inter.variable} antialiased`}>
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
