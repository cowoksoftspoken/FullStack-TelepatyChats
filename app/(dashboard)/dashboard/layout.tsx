"use client";

import { SystemNotifProvider } from "@/components/system-notif-context";
import { Toaster } from "@/components/ui/toaster";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SystemNotifProvider>
      {children}
      <Toaster />
    </SystemNotifProvider>
  );
}
