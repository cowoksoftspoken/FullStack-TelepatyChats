"use client";

import { useState } from "react";
import { signOut } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { LogOut, Phone, Search, Video, Settings } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { User } from "@/types/user";
import { useFirebase } from "@/lib/firebase-provider";

interface SidebarProps {
  user: any;
  contacts: User[];
  selectedContact: User | null;
  setSelectedContact: (contact: User) => void;
  initiateCall: (contact: User, isVideo: boolean) => void;
}

export function Sidebar({
  user,
  contacts,
  selectedContact,
  setSelectedContact,
  initiateCall,
}: SidebarProps) {
  const { auth, db } = useFirebase();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSignOut = async () => {
    try {
      if (user?.uid) {
        await updateDoc(doc(db, "users", user.uid), {
          online: false,
        });
      }

      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const filteredContacts = contacts.filter((contact) =>
    contact.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full w-80 flex-col border-r bg-background">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Avatar>
            <AvatarImage
              src={user?.photoURL || ""}
              alt={user?.displayName || "User"}
            />
            <AvatarFallback>
              {user?.displayName?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user?.displayName}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search contacts..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="space-y-1 p-2">
          {filteredContacts.map((contact) => (
            <div
              key={contact.uid}
              className={`flex items-center justify-between rounded-lg p-2 ${
                selectedContact?.uid === contact.uid
                  ? "bg-accent"
                  : "hover:bg-accent/50"
              }`}
              onClick={() => setSelectedContact(contact)}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar>
                    <AvatarImage
                      src={contact.photoURL || ""}
                      alt={contact.displayName || "User"}
                    />
                    <AvatarFallback>
                      {contact.displayName?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  {contact.online && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-background"></span>
                  )}
                </div>
                <div>
                  <p className="font-medium">{contact.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {contact.online ? "Online" : "Offline"}
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
                    initiateCall(contact, false);
                  }}
                >
                  <Phone className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    initiateCall(contact, true);
                  }}
                >
                  <Video className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
