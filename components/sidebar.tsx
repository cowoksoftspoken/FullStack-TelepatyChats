"use client";

import { useState, useEffect, useMemo } from "react";
import { signOut } from "firebase/auth";
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  type DocumentData,
  getDocs,
  writeBatch,
  orderBy,
  limit,
} from "firebase/firestore";
import {
  deleteObject as deleteStorageObject,
  ref as storageRef,
} from "firebase/storage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddContact } from "@/components/add-contact";
import type { User } from "@/types/user";
import { useFirebase } from "@/lib/firebase-provider";
import { UserAvatar } from "./user-avatar";
import { StoryCreator } from "./story/story-creator";
import { StoryCircle } from "./story/story-circle";
import {
  Loader2,
  LogOut,
  Phone,
  Search,
  Settings,
  Trash2,
  UserPlus,
  Video,
  X,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

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
  const [blockedContacts, setBlockedContacts] = useState<string[]>([]);
  const [contactsWhoBlockedMe, setContactsWhoBlockedMe] = useState<string[]>(
    []
  );
  const { toast } = useToast();

  const [lastMessageTimestamps, setLastMessageTimestamps] = useState<
    Record<string, string>
  >({});

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
    if (!user?.uid || userContacts.length === 0) return;

    const fetchLastMessages = async () => {
      try {
        // Buat listener untuk setiap kontak
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
              setLastMessageTimestamps((prev) => ({
                ...prev,
                [contactId]: lastMessage.timestamp,
              }));
            }
          });
        });

        // Cleanup function
        return () => {
          unsubscribes.forEach((unsubscribe) => unsubscribe());
        };
      } catch (error) {
        console.error("Error fetching last messages:", error);
      }
    };

    fetchLastMessages();
  }, [user, db, userContacts]);

  // Fetch blocked users and users who blocked the current user
  useEffect(() => {
    if (!user?.uid) return;

    const fetchBlockedUsers = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setBlockedContacts(userData.blockedUsers || []);
        }

        const blockedByList: string[] = [];

        for (const contactId of userContacts) {
          const contactDoc = await getDoc(doc(db, "users", contactId));
          if (contactDoc.exists()) {
            const contactData = contactDoc.data();
            if (contactData.blockedUsers?.includes(user.uid)) {
              blockedByList.push(contactId);
            }
          }
        }

        setContactsWhoBlockedMe(blockedByList);
      } catch (error) {
        console.error("Error fetching blocked users:", error);
      }
    };

    if (userContacts.length > 0) {
      fetchBlockedUsers();
    }
  }, [user, db, userContacts]);

  // Check if current user has stories
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

  // Fetch contacts with stories
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
            // and exclude stories from blocked users
            if (
              storyData.userId !== user.uid && // Not the current user's story
              !isContactBlocked(storyData.userId) && // Not a blocked contact
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
  }, [user, contacts, db, userContacts, blockedContacts, contactsWhoBlockedMe]);

  const handleDeleteContact = async (contactId: string) => {
    // Open the dialog and set the contact to delete
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

      const messagesQuery = query(
        collection(db, "messages"),
        where("participants", "array-contains", user.uid),
        where("senderId", "in", [user.uid, contactToDelete]),
        where("receiverId", "in", [user.uid, contactToDelete])
      );

      const messagesSnapshot = await getDocs(messagesQuery);

      for (const messageDoc of messagesSnapshot.docs) {
        const messageData = messageDoc.data();

        if (messageData.attachments && messageData.attachments.length > 0) {
          for (const attachment of messageData.attachments) {
            const fileRef = storageRef(storage, attachment.path);
            try {
              await deleteStorageObject(fileRef);
            } catch (error) {
              console.error("Error deleting file:", error);
            }
          }
        }

        batch.delete(doc(db, "messages", messageDoc.id));
      }

      await batch.commit();

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

  const isContactBlocked = (contactId: string) => {
    return (
      blockedContacts.includes(contactId) ||
      contactsWhoBlockedMe.includes(contactId)
    );
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
      const timestampA = lastMessageTimestamps[a.uid] || "";
      const timestampB = lastMessageTimestamps[b.uid] || "";

      if (!timestampA && !timestampB) {
        return a.displayName.localeCompare(b.displayName);
      }

      if (!timestampA) return 1;
      if (!timestampB) return -1;

      return new Date(timestampB).getTime() - new Date(timestampA).getTime();
    });
  }, [filteredContacts, lastMessageTimestamps]);

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

          {/* Contact stories - filter out blocked contacts */}
          {contactsWithStories.map((contact) => (
            <div key={contact.uid} className="flex flex-col items-center">
              <StoryCircle user={contact} currentUser={user} />
              <span className="mt-1 text-xs truncate max-w-[64px] flex items-center gap-1">
                {contact.displayName.split(" ")[0]}
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
                const blocked = isContactBlocked(contact.uid);
                return (
                  <div
                    key={contact.uid}
                    className={`flex items-center justify-between rounded-lg p-2 ${
                      selectedContact?.uid === contact.uid
                        ? "bg-accent"
                        : "hover:bg-accent/50"
                    } ${blocked ? "opacity-70" : ""}`}
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
                        {/* Online status indicator */}
                        {contact.online && !blocked && (
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-background"></span>
                        )}
                        {/* Blocked status indicator */}
                        {blocked && (
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-red-500 ring-2 ring-background"></span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <p className="font-medium">{contact.displayName}</p>
                          {contact.isVerified && !blocked && (
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
                          {blocked
                            ? "Blocked"
                            : contact.online
                            ? "Online"
                            : "Offline"}
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
                          } else {
                            initiateCall(contact, false);
                          }
                        }}
                        disabled={blocked}
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
                          } else {
                            initiateCall(contact, true);
                          }
                        }}
                        disabled={blocked}
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
              })
            )}
          </div>
        )}
      </div>
      {/* Delete Contact Confirmation Dialog */}
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
