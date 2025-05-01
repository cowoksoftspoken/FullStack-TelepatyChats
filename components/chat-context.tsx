"use client";

import { createContext, useContext, useState } from "react";

export const ChatContext = createContext<any | null | {}>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [selectedContact, setSelectedContact] = useState(null);

  return (
    <ChatContext.Provider value={{ selectedContact, setSelectedContact }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider.");
  }
  return context;
};
