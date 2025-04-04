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
  getDoc,
  DocumentData,
} from "firebase/firestore";
import {
  LogOut,
  Phone,
  Search,
  Video,
  Settings,
  UserPlus,
  Loader2,
  Plus,
  Eye,
  X,
} from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddContact } from "@/components/add-contact";
import type { User } from "@/types/user";
import { useFirebase } from "@/lib/firebase-provider";
import { UserAvatar } from "./user-avatar";
import { StoryCreator } from "./story/story-creator";
import { StoryCircle } from "./story/story-circle";
import { VerificationRequest } from "./admin/verification-request";

interface SidebarProps {
  user: any;
  contacts: User[];
  selectedContact: User | null;
  setSelectedContact: (contact: User) => void;
  initiateCall: (contact: User, isVideo: boolean) => void;
  setIsMobileMenuOpen: (open: boolean) => void;
  setIsChatActive: (open: boolean) => void;
}

export function Sidebar({
  user,
  contacts,
  selectedContact,
  setSelectedContact,
  initiateCall,
  setIsMobileMenuOpen,
  setIsChatActive,
}: SidebarProps) {
  const { auth, db } = useFirebase();
  const [searchQuery, setSearchQuery] = useState("");
  const [userContacts, setUserContacts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactsWithStories, setContactsWithStories] = useState<User[]>([]);
  const [userData, setUserData] = useState<DocumentData | null>(null);

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

  useEffect(() => {
    if (!user?.uid || contacts.length === 0) return;

    // Get current time
    const now = new Date();

    // Find contacts with active stories
    const fetchContactsWithStories = async () => {
      try {
        const q = query(
          collection(db, "stories"),
          where("expiresAt", ">", now.toISOString())
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const storyUserIds = new Set<string>();

          snapshot.forEach((doc) => {
            const storyData = doc.data();

            // Only include stories that the user has permission to view
            if (
              storyData.userId !== user.uid && // Not the current user's story
              (storyData.privacy === "public" ||
                (storyData.privacy === "contacts" &&
                  userContacts.includes(storyData.userId)) ||
                (storyData.privacy === "selected" &&
                  storyData.allowedViewers?.includes(user.uid)))
            ) {
              storyUserIds.add(storyData.userId);
            }
          });

          // Filter contacts to only include those with stories
          const contactsWithActiveStories = contacts.filter((contact) =>
            storyUserIds.has(contact.uid)
          );

          setContactsWithStories(contactsWithActiveStories);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Error fetching stories:", error);
      }
    };

    fetchContactsWithStories();
  }, [user, contacts, db, userContacts]);

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

  useEffect(() => {
    const usersData = async () => {
      const users = await getDoc(doc(db, "users", user.uid));
      if (users.exists()) {
        setUserData(users.data());
      }
    };
    usersData();
  }, [user]);

  return (
    <div className="flex h-full w-80 relative flex-col border-r bg-background">
      <Button
        variant="ghost"
        size="icon"
        className="p-1 absolute md:hidden -right-[2.5rem] rounded border"
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <X className="h-5 w-5" />
      </Button>
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
            <div className="flex items-center gap-1">
              <p className="font-medium">{user?.displayName}</p>
              {userData?.isVerified && (
                <svg
                  aria-label="Sudah Diverifikasi"
                  fill="rgb(0, 149, 246)"
                  height="14"
                  role="img"
                  viewBox="0 0 40 40"
                  width="14"
                >
                  <title>Sudah Diverifikasi</title>
                  <path
                    d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z"
                    fillRule="evenodd"
                  ></path>
                </svg>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Link href="/settings">
            <Button variant="ghost" className="p-1" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
          <Button
            className="p-1"
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Stories section */}
      {/* <div className="border-b p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium">Stories</h2>
          <Link href="/stories">
            <Button variant="ghost" size="sm" className="h-8 text-xs">
              View All
            </Button>
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2">
          <Link href="/stories/create" className="flex flex-col items-center">
            <div className="relative h-12 w-12 rounded-full border-2 border-dashed border-muted-foreground/50 p-[2px]">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-muted">
                <span className="text-xl font-bold text-muted-foreground">
                  +
                </span>
              </div>
            </div>
            <span className="mt-1 text-xs">Your Story</span>
          </Link>
        </div>
      </div> */}

      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium">Stories</h2>
          <Link href="/stories">
            <Button variant="ghost" size="sm" className="h-8 text-xs">
              View All
            </Button>
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {/* Your story */}
          <div className="flex flex-col items-center">
            <div className="relative h-16 w-16 rounded-full border-2 border-dashed border-muted-foreground/50 p-[2px]">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-muted">
                <span className="text-xl font-bold text-muted-foreground">
                  +
                </span>
              </div>
              <div className="absolute inset-0 opacity-0">
                <StoryCreator />
              </div>
            </div>
            <span className="mt-1 text-xs">Your Story</span>
          </div>

          {/* Contact stories */}
          {contactsWithStories.map((contact) => (
            <div
              key={contact.uid}
              className="flex flex-col items-center overflow-auto"
            >
              <StoryCircle user={contact} currentUser={user} />
              <span className="mt-1 text-xs truncate max-w-[64px]">
                {contact.displayName.split(" ")[0]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium">Contacts</h2>
          <div className="flex gap-2">
            <AddContact />
          </div>
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
                  onClick={() => {
                    setSelectedContact(contact);
                    setIsChatActive(true);
                  }}
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
                      <div className="flex items-center gap-1">
                        <p className="font-medium">{contact.displayName}</p>
                        {contact.isVerified && (
                          <span className="">
                            <svg
                              aria-label="Sudah Diverifikasi"
                              fill="rgb(0, 149, 246)"
                              height="14"
                              role="img"
                              viewBox="0 0 40 40"
                              width="14"
                            >
                              <title>Sudah Diverifikasi</title>
                              <path
                                d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z"
                                fillRule="evenodd"
                              ></path>
                            </svg>
                          </span>
                        )}
                      </div>
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
