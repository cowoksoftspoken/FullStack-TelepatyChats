"use client";

import { useEncryption } from "@/hooks/use-encryption";
import useUserStatus from "@/hooks/use-user-status";
import type { User } from "@/types/user";
import normalizeName from "@/utils/normalizename";
import { Phone, Trash2, Video } from "lucide-react";
import React, { useEffect } from "react";
import { Button } from "./ui/button";
import { UserAvatar } from "./user-avatar";

export function ContactItem({
  contact,
  user,
  selectedContact,
  setSelectedContact,
  setIsChatActive,
  initiateCall,
  toast,
  handleDeleteContact,
  lastMessage,
  currentUser,
  isOnline,
}: {
  contact: User;
  user: any;
  selectedContact: User | null;
  setSelectedContact: (c: User | null) => void;
  setIsChatActive: (b: boolean) => void;
  initiateCall: (c: User, isVideo: boolean) => void;
  toast: any;
  isOnline: boolean;
  handleDeleteContact: (contactUid: string) => void;
  lastMessage: {
    type: string;
    encryptedText: string;
    encryptedKeyForSelf: string;
    iv: string;
    encryptedKey: string;
    isSender: boolean;
    timestamp: string;
  };
  currentUser: any;
}) {
  const { isBlocked, isUserBlockedByContact } = useUserStatus(
    contact.uid,
    user.uid
  );
  const [preview, setPreview] = React.useState<string>("");
  const { decryptLastMessageFromContact } = useEncryption(currentUser);
  const blocked = isBlocked || isUserBlockedByContact;

  useEffect(() => {
    const decryptedLastMessage = async () => {
      if (!lastMessage) {
        setPreview(blocked ? "Blocked" : isOnline ? "Online" : "Offline");
        return;
      }

      if (blocked) {
        setPreview("Blocked");
        return;
      }

      const prefix = lastMessage.isSender ? "You: " : "";

      if (lastMessage.type !== "text") {
        const lastMessageTypes: Record<string, string> = {
          image: "🖼️ Photo",
          video: "🎥 Video",
          audio: "🎧 Audio",
          file: "📁 File",
          location: "📍 Location",
          broadcast: "📣 Broadcast Message",
        };
        setPreview(
          `${prefix}${lastMessageTypes[lastMessage.type]}` ||
            "Locked message 🔒"
        );
        return;
      }

      try {
        const decrypted = await decryptLastMessageFromContact(
          lastMessage.encryptedText,
          lastMessage.encryptedKeyForSelf,
          lastMessage.encryptedKey,
          lastMessage.isSender,
          lastMessage.iv
        );
        const text = decrypted || "Locked message 🔒";
        setPreview(`${prefix}${text}`);
      } catch (e) {
        setPreview("Something went wrong 🔒");
      }
    };

    decryptedLastMessage();
  }, [lastMessage, decryptLastMessageFromContact, isOnline, blocked]);

  return (
    <div
      key={contact.uid}
      className={`flex items-center justify-between rounded-lg p-2 ${
        selectedContact?.uid === contact.uid
          ? "bg-accent"
          : "hover:bg-accent/50"
      } ${blocked ? "opacity-70" : ""}`}
      role="button"
      aria-label={`Open chat with ${contact.displayName}`}
      onClick={() => {
        setSelectedContact(contact);
        setIsChatActive(true);
      }}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <UserAvatar
            user={contact}
            isBlocked={blocked}
            showEnlargeOnClick={false}
          />
          {isOnline && !blocked && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-background"></span>
          )}
          {blocked && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-red-500 ring-2 ring-background"></span>
          )}
        </div>
        <div>
          <div className="flex items-center gap-1">
            <p className="font-medium">
              {contact?.displayName
                ? normalizeName(contact?.displayName)
                : "Loading..."}
            </p>
            {contact.isVerified &&
              !blocked &&
              !isUserBlockedByContact &&
              !contact.isAdmin && (
                <span>
                  <svg
                    aria-label="Sudah Diverifikasi"
                    fill="rgb(0, 149, 246)"
                    height="15"
                    role="img"
                    viewBox="0 0 40 40"
                    width="15"
                  >
                    <title>Verified</title>
                    <path
                      d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z"
                      fillRule="evenodd"
                    ></path>
                  </svg>
                </span>
              )}
            {contact.isAdmin && !isBlocked && !isUserBlockedByContact && (
              <svg
                aria-label="Afiliated Account"
                height="15"
                role="img"
                viewBox="0 0 40 40"
                width="15"
              >
                <defs>
                  <linearGradient
                    id="metallicGold"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#fff7b0" />
                    <stop offset="25%" stopColor="#ffd700" />
                    <stop offset="50%" stopColor="#ffa500" />
                    <stop offset="75%" stopColor="#ffd700" />
                    <stop offset="100%" stopColor="#fff7b0" />
                  </linearGradient>
                </defs>
                <title>Afiliated Account</title>
                <path
                  d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z"
                  fill="url(#metallicGold)"
                  fillRule="evenodd"
                ></path>
              </svg>
            )}
          </div>
          <p
            className="text-xs text-muted-foreground text-ellipsis truncate w-32"
            title={preview}
          >
            {/* {blocked ? "Blocked" : isOnline ? "Online" : "Offline"} */}
            {preview}
          </p>
        </div>
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={(e) => {
            e.stopPropagation();
            if (blocked) {
              toast({
                variant: "destructive",
                title: "Cannot initiate call",
                description:
                  "You cannot call this contact because one of you has blocked the other.",
              });
            } else if (!isOnline) {
              toast({
                variant: "destructive",
                title: "Cannot initiate call",
                description: "This contact is currently offline.",
              });
            } else {
              initiateCall(contact, false);
            }
          }}
          disabled={blocked || !isOnline}
        >
          <Phone className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={(e) => {
            e.stopPropagation();
            if (blocked) {
              toast({
                variant: "destructive",
                title: "Cannot initiate call",
                description:
                  "You cannot call this contact because one of you has blocked the other.",
              });
            } else if (!isOnline) {
              toast({
                variant: "destructive",
                title: "Cannot initiate call",
                description: "This contact is currently offline.",
              });
            } else {
              initiateCall(contact, true);
            }
          }}
          disabled={blocked || !isOnline}
        >
          <Video className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteContact(contact.uid);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
