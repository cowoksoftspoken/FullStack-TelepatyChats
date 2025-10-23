"use client";

import { AddContact } from "@/components/add-contact";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useFirebase } from "@/lib/firebase-provider";
import type { User } from "@/types/user";
import normalizeName from "@/utils/normalizename";
import { signOut } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import {
  deleteObject as deleteStorageObject,
  ref as storageRef,
} from "firebase/storage";
import { Loader2, LogOut, Search, Settings, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ContactItem } from "./contact-item";
import { StoryCircleWrapper } from "./story-wrapper";
import { StoryCircle } from "./story/story-circle";
import { StoryCreator } from "./story/story-creator";
import { UserAvatar } from "./user-avatar";

interface SidebarProps {
  user: any;
  contacts: User[];
  selectedContact: User | null;
  setSelectedContact: (contact: User | null) => void;
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
  const { auth, db, storage, currentUser } = useFirebase();
  const [searchQuery, setSearchQuery] = useState("");
  const [userContacts, setUserContacts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactsWithStories, setContactsWithStories] = useState<User[]>([]);
  const [currentUserHasStory, setCurrentUserHasStory] = useState(false);
  const [userData, setUserData] = useState<DocumentData | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const [lastMessage, setLastMessage] = useState<
    Record<
      string,
      {
        type: string;
        encryptedText: string;
        encryptedKey: string;
        isSender: boolean;
        encryptedKeyForSelf: string;
        iv: string;
        timestamp: string;
      }
    >
  >({});

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
    if (!user?.uid || userContacts.length === 0) return;

    const fetchLastMessages = async () => {
      try {
        const unsubscribes = userContacts.map((contactId) => {
          const chatId = [user.uid, contactId].sort().join("_");
          const q = query(
            collection(db, "messages"),
            where("chatId", "==", chatId),
            orderBy("timestamp", "desc"),
            limit(1)
          );

          return onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
              const lastMessage = snapshot.docs[0].data();
              setLastMessage((prev) => ({
                ...prev,
                [contactId]: {
                  type: lastMessage.type,
                  encryptedText: lastMessage.encryptedText,
                  encryptedKeyForSelf: lastMessage.encryptedKeyForSelf,
                  encryptedKey: lastMessage.encryptedKey,
                  isSender: lastMessage.senderId === currentUser.uid,
                  iv: lastMessage.iv,
                  timestamp: lastMessage.timestamp,
                },
              }));
            }
          });
        });

        return () => {
          unsubscribes.forEach((unsubscribe) => unsubscribe());
        };
      } catch (error) {
        console.error("Error fetching last messages:", error);
      }
    };

    fetchLastMessages();
  }, [user, db, userContacts]);

  useEffect(() => {
    if (!user?.uid) return;

    const now = new Date();

    const checkCurrentUserStories = async () => {
      try {
        const q = query(
          collection(db, "stories"),
          where("userId", "==", user.uid),
          where("expiresAt", ">", now.toISOString())
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          setCurrentUserHasStory(!snapshot.empty);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Error checking current user stories:", error);
      }
    };

    checkCurrentUserStories();
  }, [user, db]);

  useEffect(() => {
    if (!user?.uid || contacts.length === 0) return;

    const now = new Date();

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

            if (
              storyData.userId !== user.uid &&
              (storyData.privacy === "public" ||
                (storyData.privacy === "contacts" &&
                  userContacts.includes(storyData.userId)) ||
                (storyData.privacy === "selected" &&
                  storyData.allowedViewers?.includes(user.uid)))
            ) {
              storyUserIds.add(storyData.userId);
            }
          });

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

  const handleDeleteContact = async (contactId: string) => {
    setContactToDelete(contactId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteContact = async () => {
    if (!contactToDelete) return;

    try {
      const contactsQuery = query(
        collection(db, "contacts"),
        where("userId", "==", user.uid),
        where("contactId", "==", contactToDelete)
      );
      const contactSnapshot = await getDocs(contactsQuery);

      if (contactSnapshot.empty) {
        console.error("Contact relationship not found");
        return;
      }

      const contactDocId = contactSnapshot.docs[0].id;

      const reverseContactQuery = query(
        collection(db, "contacts"),
        where("userId", "==", contactToDelete),
        where("contactId", "==", user.uid)
      );
      const reverseContactSnapshot = await getDocs(reverseContactQuery);

      const batch = writeBatch(db);

      batch.delete(doc(db, "contacts", contactDocId));

      if (!reverseContactSnapshot.empty) {
        batch.delete(doc(db, "contacts", reverseContactSnapshot.docs[0].id));
      }

      const chatId = [user.uid, contactToDelete].sort().join("_");
      const messagesQuery = query(
        collection(db, "messages"),
        where("chatId", "==", chatId)
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      const storageDeletes: Promise<void>[] = [];
      for (const messageDoc of messagesSnapshot.docs) {
        const messageData = messageDoc.data();

        if (messageData.attachments && messageData.attachments.length > 0) {
          for (const attachment of messageData.attachments) {
            const fileRef = storageRef(storage, attachment.path);
            try {
              storageDeletes.push(deleteStorageObject(fileRef));
            } catch (error) {
              console.error("Error deleting file:", error);
            }
          }
        }

        batch.delete(doc(db, "messages", messageDoc.id));
      }

      await Promise.all([await batch.commit(), ...storageDeletes]);

      if (selectedContact?.uid === contactToDelete) {
        setSelectedContact(null);
        setIsChatActive(false);
      }

      console.log("Contact and all associated data deleted successfully");

      setDeleteDialogOpen(false);
      setContactToDelete(null);
    } catch (error) {
      console.error("Error deleting contact:", error);
      setDeleteDialogOpen(false);
      setContactToDelete(null);
    }
  };

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

  const filteredContacts = contacts.filter(
    (contact) =>
      userContacts.includes(contact.uid) &&
      contact.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAndSortedContacts = useMemo(() => {
    return filteredContacts.slice().sort((a, b) => {
      const timestampA = lastMessage[a.uid] || "";
      const timestampB = lastMessage[b.uid] || "";

      if (!timestampA && !timestampB) {
        return a.displayName.localeCompare(b.displayName);
      }

      if (!timestampA) return 1;
      if (!timestampB) return -1;

      return (
        new Date(timestampB.timestamp).getTime() -
        new Date(timestampA.timestamp).getTime()
      );
    });
  }, [filteredContacts, lastMessage]);

  useEffect(() => {
    const usersData = async () => {
      const users = await getDoc(doc(db, "users", user.uid));
      if (users.exists()) {
        setUserData(users.data());
      }
    };
    usersData();
  }, [user, db]);

  return (
    <div className="flex h-full w-80 relative flex-col border-r dark:bg-[#151516]">
      <Button
        variant="ghost"
        size="icon"
        className="p-1 absolute md:hidden -right-[2.5rem] dark:bg-[#151516] rounded border"
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <X className="h-5 w-5" />
      </Button>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <UserAvatar user={user} />
          <div>
            <div className="flex items-center gap-1">
              <p className="font-medium">
                {user?.displayName
                  ? normalizeName(user?.displayName)
                  : "Loading..."}
              </p>
              {userData?.isVerified && !userData?.isAdmin && (
                <svg
                  aria-label="Sudah Diverifikasi"
                  fill="rgb(0, 149, 246)"
                  height="14"
                  role="img"
                  viewBox="0 0 40 40"
                  width="14"
                >
                  <title>Verified</title>
                  <path
                    d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z"
                    fillRule="evenodd"
                  ></path>
                </svg>
              )}
              {userData?.isAdmin && (
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

      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium">Stories</h2>
          <Link href="/stories">
            <Button variant="ghost" size="sm" className="h-8 text-xs">
              View All
            </Button>
          </Link>
        </div>
        <div className="flex gap-4 items-center overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-[#cbd5e1] scrollbar-track-[#f3f4f6] dark:scrollbar-thumb-[#4e4e4e] dark:scrollbar-track-[#1e1e1e]">
          <div className="flex flex-col items-center">
            {currentUserHasStory ? (
              <>
                <StoryCircle user={user} currentUser={currentUser} />
                <span className="mt-1 text-xs">Your Story</span>
              </>
            ) : (
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
            )}
          </div>

          {contactsWithStories.map((contact) => (
            <>
              <StoryCircleWrapper
                key={contact.uid}
                storyUser={contact}
                currentUser={user}
              />
            </>
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

      <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-[#cbd5e1] scrollbar-track-[#f3f4f6] dark:scrollbar-thumb-[#4e4e4e] dark:scrollbar-track-[#1e1e1e]">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredAndSortedContacts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No contacts found</p>
                <p className="text-xs">Add contacts to start chatting</p>
              </div>
            ) : (
              filteredAndSortedContacts.map((contact) => {
                return (
                  <ContactItem
                    key={contact.uid}
                    contact={contact}
                    user={user}
                    selectedContact={selectedContact}
                    setSelectedContact={setSelectedContact}
                    setIsChatActive={setIsChatActive}
                    handleDeleteContact={handleDeleteContact}
                    initiateCall={initiateCall}
                    toast={toast}
                    lastMessage={lastMessage[contact.uid]}
                    currentUser={currentUser}
                  />
                );
              })
            )}
          </div>
        )}
      </div>
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this contact? All messages and
              shared files will be permanently deleted. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setContactToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteContact}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
