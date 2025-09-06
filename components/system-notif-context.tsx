"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

type NotifType = "info" | "success" | "error";

interface SystemNotifState {
  open: boolean;
  title: string;
  description: string;
  message: string;
  type: NotifType;
  forceRelogin?: boolean;
  onRelogin?: () => void;
  storageKey?: string;
}

interface SystemNotifContextProps {
  showNotif: (options: Omit<SystemNotifState, "open">) => void;
  closeNotif: () => void;
}

const SystemNotifContext = createContext<SystemNotifContextProps | undefined>(
  undefined
);

export const SystemNotifProvider = ({ children }: { children: ReactNode }) => {
  const [notif, setNotif] = useState<SystemNotifState | null>(null);

  const showNotif = (options: Omit<SystemNotifState, "open">) => {
    setNotif({ ...options, open: true });
  };

  const closeNotif = () => {
    if (notif) setNotif({ ...notif, open: false });
  };

  return (
    <SystemNotifContext.Provider value={{ showNotif, closeNotif }}>
      {children}
      {notif && (
        <SystemNotif
          open={notif.open}
          title={notif.title}
          description={notif.description}
          message={notif.message}
          type={notif.type}
          forceRelogin={notif.forceRelogin}
          onRelogin={notif.onRelogin}
          storageKey={notif.storageKey}
          onClose={closeNotif}
        />
      )}
    </SystemNotifContext.Provider>
  );
};

export const useSystemNotif = () => {
  const context = useContext(SystemNotifContext);
  if (!context) {
    throw new Error("useSystemNotif must be used within a SystemNotifProvider");
  }
  return context;
};

import SystemNotif from "@/components/system-notif";
