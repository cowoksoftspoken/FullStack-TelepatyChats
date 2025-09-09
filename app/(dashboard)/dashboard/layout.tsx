"use client";

import { SystemNotifProvider } from "@/components/system-notif-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SystemNotifProvider>{children}</SystemNotifProvider>;
}
