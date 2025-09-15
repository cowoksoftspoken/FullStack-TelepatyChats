"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Plus } from "lucide-react";
import Link from "next/link";

import { StoryCircle } from "@/components/story/story-circle";
import { useFirebase } from "@/lib/firebase-provider";
import type { User } from "@/types/user";

export function StoriesRow() {
  const { db, currentUser } = useFirebase();
  const [contacts, setContacts] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContacts = async () => {
      if (!currentUser) return;

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

        usersSnapshot.forEach((doc) => {
          contactsData.push(doc.data() as User);
        });

        setContacts(contactsData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching contacts:", error);
        setLoading(false);
      }
    };

    fetchContacts();
  }, [currentUser, db]);

  if (loading) {
    return (
      <div className="flex h-24 w-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-4 p-4">
        <Link href="/stories/create" className="flex flex-col items-center">
          <div className="relative h-16 w-16 rounded-full border-2 border-dashed border-muted-foreground/50 p-[2px]">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-muted">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <span className="mt-1 text-xs">Your Story</span>
        </Link>

        {contacts.map((contact) => (
          <Link
            href="/stories"
            key={contact.uid}
            className="flex flex-col items-center"
          >
            <StoryCircle user={contact} currentUser={currentUser} />
            <span className="mt-1 text-xs truncate max-w-[64px]">
              {contact.displayName.split(" ")[0]}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
