"use client";

import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import {
  LogOut,
  Phone,
  Search,
  Video,
  Settings,
  UserPlus,
  Loader2,
} from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddContact } from "@/components/add-contact";
import type { User } from "@/types/user";
import { useFirebase } from "@/lib/firebase-provider";
import { UserAvatar } from "./user-avatar";

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
  const [userContacts, setUserContacts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user's contacts
  useEffect(() => {
    if (!user?.uid) return;

    setLoading(true);

    const q = query(
      collection(db, "contacts"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const contactIds: string[] = [];
      snapshot.forEach((doc) => {
        contactIds.push(doc.data().contactId);
      });
      setUserContacts(contactIds);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, db]);

  const handleSignOut = async () => {
    try {
      // Update user status to offline
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

  // Filter contacts to only show added contacts
  const filteredContacts = contacts.filter(
    (contact) =>
      userContacts.includes(contact.uid) &&
      contact.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full w-80 flex-col border-r bg-background">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          {/* <Avatar>
            <AvatarImage
              src={user?.photoURL || ""}
              alt={user?.displayName || "User"}
              className="object-cover"
              referrerPolicy="no-referrer"
            />
            <AvatarFallback>
              {user?.displayName?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar> */}
          <UserAvatar user={user} />
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
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium">Contacts</h2>
          <AddContact />
        </div>
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
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredContacts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No contacts found</p>
                <p className="text-xs">Add contacts to start chatting</p>
              </div>
            ) : (
              filteredContacts.map((contact) => (
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
                      {/* <Avatar>
                        <AvatarImage
                          src={contact.photoURL || ""}
                          alt={contact.displayName || "User"}
                          className="object-cover"
                        />
                        <AvatarFallback>
                          {contact.displayName?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar> */}
                      <UserAvatar user={contact} showEnlargeOnClick={false} />
                      {/* Online status indicator */}
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
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
