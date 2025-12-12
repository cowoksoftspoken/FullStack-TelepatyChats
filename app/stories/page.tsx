"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  getDoc,
  doc,
} from "firebase/firestore";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StoryCircle } from "@/components/story/story-circle";
import { StoryViewer } from "@/components/story/story-viewer";
import { useFirebase } from "@/lib/firebase-provider";
import type { Story } from "@/types/story";
import type { User } from "@/types/user";
import { useToast } from "@/components/ui/use-toast";

export default function StoriesPage() {
  const { db, currentUser, loading: authLoading } = useFirebase();
  const [loading, setLoading] = useState(true);
  // const [contacts, setContacts] = useState<User[]>([]);
  const [contactsWithStories, setContactsWithStories] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [usersWhoBlockedMe, setUsersWhoBlockedMe] = useState<string[]>([]);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push("/login");
    }
  }, [authLoading, currentUser, router]);

  useEffect(() => {
    if (!currentUser) return;

    const fetchBlockedUsers = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setBlockedUsers(userData.blockedUsers || []);
        }

        const contactsQuery = query(
          collection(db, "contacts"),
          where("userId", "==", currentUser.uid)
        );
        const contactsSnapshot = await getDocs(contactsQuery);
        const contactIds: string[] = [];

        contactsSnapshot.forEach((doc) => {
          contactIds.push(doc.data().contactId);
        });

        if (contactIds.length === 0) return;

        const blockedByList: string[] = [];

        for (const contactId of contactIds) {
          const contactDoc = await getDoc(doc(db, "users", contactId));
          if (contactDoc.exists()) {
            const contactData = contactDoc.data();
            if (contactData.blockedUsers?.includes(currentUser.uid)) {
              blockedByList.push(contactId);
            }
          }
        }

        setUsersWhoBlockedMe(blockedByList);
      } catch (error) {
        console.error("Error fetching blocked users:", error);
      }
    };

    fetchBlockedUsers();
  }, [currentUser, db]);

  const isUserBlocked = (userId: string) => {
    if (userId === currentUser?.uid) return false;

    return blockedUsers.includes(userId) || usersWhoBlockedMe.includes(userId);
  };

  useEffect(() => {
    if (!currentUser) return;

    const fetchContacts = async () => {
      try {
        const contactsQuery = query(
          collection(db, "contacts"),
          where("userId", "==", currentUser.uid)
        );
        const contactsSnapshot = await getDocs(contactsQuery);
        const contactIds: string[] = [];

        contactsSnapshot.forEach((doc) => {
          contactIds.push(doc.data().contactId);
        });

        if (contactIds.length === 0) {
          setLoading(false);
          return;
        }

        const usersQuery = query(
          collection(db, "users"),
          where("uid", "in", contactIds)
        );
        const usersSnapshot = await getDocs(usersQuery);
        const contactsData: User[] = [];
        const usersData: Record<string, User> = {};

        usersSnapshot.forEach((doc) => {
          const userData = doc.data() as User;
          contactsData.push(userData);
          usersData[userData.uid] = userData;
        });

        usersData[currentUser.uid] = currentUser as User;

        // setContacts(contactsData);
        setUsers(usersData);

        await fetchStoriesForContacts(
          [...contactIds, currentUser.uid],
          usersData
        );
      } catch (error) {
        console.error("Error fetching contacts:", error);
        setLoading(false);
      }
    };

    fetchContacts();
  }, [currentUser, db, blockedUsers, usersWhoBlockedMe]);

  // Fetch stories for contacts
  const fetchStoriesForContacts = async (
    userIds: string[],
    usersData: Record<string, User>
  ) => {
    try {
      // Get current time
      const now = new Date();

      // Get stories that haven't expired yet
      const q = query(
        collection(db, "stories"),
        where("expiresAt", ">", now.toISOString()),
        orderBy("expiresAt", "desc")
      );

      const querySnapshot = await getDocs(q);
      const userStories: Record<string, Story[]> = {};
      const usersWithStories = new Set<string>();

      querySnapshot.forEach((doc) => {
        const storyData = { id: doc.id, ...doc.data() } as Story;
        const userId = storyData.userId;

        if (isUserBlocked(userId) && userId !== currentUser?.uid) {
          return;
        }

        if (
          userId === currentUser?.uid ||
          storyData.privacy === "public" ||
          (storyData.privacy === "contacts" && userIds.includes(userId)) ||
          (storyData.privacy === "selected" &&
            storyData.allowedViewers?.includes(currentUser?.uid))
        ) {
          if (!userStories[userId]) {
            userStories[userId] = [];
          }
          userStories[userId].push(storyData);
          usersWithStories.add(userId);
        }
      });

      const contactsWithActiveStories = Object.keys(usersData)
        .filter((uid) => usersWithStories.has(uid))
        .map((uid) => usersData[uid]);

      setContactsWithStories(contactsWithActiveStories);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching stories:", error);
      setLoading(false);
    }
  };

  const handleStoryClick = async (user: User) => {
    if (isUserBlocked(user.uid) && user.uid !== currentUser?.uid) {
      toast({
        variant: "destructive",
        title: "Cannot view stories",
        description: "You cannot view stories from this user due to blocking.",
      });
      return;
    }

    try {
      setSelectedUser(user);

      const now = new Date();

      const q = query(
        collection(db, "stories"),
        where("userId", "==", user.uid),
        where("expiresAt", ">", now.toISOString()),
        orderBy("createdAt", "asc")
      );

      const querySnapshot = await getDocs(q);
      const userStories: Story[] = [];

      querySnapshot.forEach((doc) => {
        userStories.push({ id: doc.id, ...doc.data() } as Story);
      });

      setStories(userStories);
    } catch (error) {
      console.error("Error fetching user stories:", error);
    }
  };

  if (authLoading || !currentUser) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/dashboard"
          className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Chat
        </Link>
        <h1 className="text-2xl font-bold">Stories</h1>
        <Link href="/stories/create">
          <Button variant="outline" size="sm" className="flex gap-2">
            <Plus className="h-4 w-4" />
            <span>Create Story</span>
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : contactsWithStories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 rounded-full bg-muted p-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-muted-foreground"
            >
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold">No Stories Available</h2>
          <p className="mt-2 text-muted-foreground">
            There are no stories to view right now. Create your own or wait for
            your contacts to share.
          </p>
          <Link href="/stories/create" className="mt-4">
            <Button>Create Your Story</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {contactsWithStories.map((user) => (
            <div
              key={user.uid}
              className="flex flex-col items-center cursor-pointer"
              onClick={() => handleStoryClick(user)}
            >
              <StoryCircle user={user} currentUser={currentUser} size="lg" />
              <span className="mt-2 text-sm font-medium truncate max-w-full text-center">
                {user.uid === currentUser.uid ? "Your Story" : user.displayName}
                {isUserBlocked(user.uid) && user.uid !== currentUser.uid && (
                  <span className="block text-xs text-red-500">(Blocked)</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {selectedUser && stories.length > 0 && (
        <StoryViewer
          stories={stories}
          onClose={() => setSelectedUser(null)}
          users={users}
        />
      )}
    </div>
  );
}
