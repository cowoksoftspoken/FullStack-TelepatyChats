"use client";

import { useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { PlusCircle, Search, UserPlus } from "lucide-react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useFirebase } from "@/lib/firebase-provider";
import { toast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import type { User } from "@/types/user";
import { UserAvatar } from "./user-avatar";

export function AddContact() {
  const { currentUser, db } = useFirebase();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !currentUser) return;

    setIsSearching(true);
    setSearchResults([]);

    try {
      const emailQuery = query(
        collection(db, "users"),
        where("email", "==", searchQuery.toLowerCase())
      );

      const nameQuery = query(
        collection(db, "users"),
        where("displayName", ">=", searchQuery),
        where("displayName", "<=", searchQuery + "\uf8ff")
      );

      const [emailResults, nameResults] = await Promise.all([
        getDocs(emailQuery),
        getDocs(nameQuery),
      ]);

      const results: User[] = [];
      const userIds = new Set<string>();

      emailResults.forEach((doc) => {
        const userData = doc.data() as User;
        if (userData.uid !== currentUser.uid && !userIds.has(userData.uid)) {
          results.push(userData);
          userIds.add(userData.uid);
        }
      });

      nameResults.forEach((doc) => {
        const userData = doc.data() as User;
        if (userData.uid !== currentUser.uid && !userIds.has(userData.uid)) {
          results.push(userData);
          userIds.add(userData.uid);
        }
      });

      setSearchResults(results);
    } catch (error) {
      console.error("Error searching for users:", error);
      toast({
        variant: "destructive",
        title: "Search failed",
        description: "Failed to search for users. Please try again.",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddContact = async (contact: User) => {
    if (!currentUser) return;

    setIsAdding((prev) => ({ ...prev, [contact.uid]: true }));

    try {
      const contactRef = doc(
        db,
        "contacts",
        `${currentUser.uid}_${contact.uid}`
      );
      const contactDoc = await getDoc(contactRef);

      if (contactDoc.exists()) {
        toast({
          title: "Contact already exists",
          description: `${contact.displayName} is already in your contacts.`,
        });
        return;
      }

      await setDoc(contactRef, {
        userId: currentUser.uid,
        contactId: contact.uid,
        createdAt: new Date().toISOString(),
      });

      const reverseContactRef = doc(
        db,
        "contacts",
        `${contact.uid}_${currentUser.uid}`
      );

      const reverseContactDoc = await getDoc(reverseContactRef);

      if (!reverseContactDoc.exists()) {
        await setDoc(reverseContactRef, {
          userId: contact.uid,
          contactId: currentUser.uid,
          createdAt: new Date().toISOString(),
        });
      }

      toast({
        title: "Contact added",
        description: `${contact.displayName} has been added to your contacts.`,
      });
    } catch (error) {
      console.error("Error adding contact:", error);
      toast({
        variant: "destructive",
        title: "Failed to add contact",
        description:
          "An error occurred while adding the contact. Please try again.",
        action: <ToastAction altText="Try again">Try again</ToastAction>,
      });
    } finally {
      setIsAdding((prev) => ({ ...prev, [contact.uid]: false }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex gap-2">
          <UserPlus className="h-4 w-4" />
          <span>Add Contact</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
          <DialogDescription>
            Search for users by email or name to add them to your contacts.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2 py-4">
          <div className="grid flex-1 gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or name"
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
              />
            </div>
          </div>
          <Button type="button" onClick={handleSearch} disabled={isSearching}>
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Search"
            )}
          </Button>
        </div>

        {/* Search results */}
        <div className="max-h-60 overflow-y-auto space-y-2">
          {searchResults.length === 0 && !isSearching && (
            <div className="text-center py-4 text-muted-foreground">
              No users found. Try searching by email or name.
            </div>
          )}

          {searchResults.map((user) => (
            <div
              key={user.uid}
              className="flex items-center justify-between p-2 rounded-md hover:bg-accent"
            >
              <div className="flex items-center gap-3">
                <UserAvatar user={user} showEnlargeOnClick={false} />
                <div>
                  <div className="flex items-center gap-1">
                    <p className="font-medium">{user.displayName}</p>
                    {user.isVerified && !user.isAdmin && (
                      <svg
                        aria-label="Sudah Diverifikasi"
                        fill="rgb(0, 149, 246)"
                        height="16"
                        role="img"
                        viewBox="0 0 40 40"
                        width="16"
                      >
                        <title>Verified</title>
                        <path
                          d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z"
                          fillRule="evenodd"
                        ></path>
                      </svg>
                    )}
                    {user.isAdmin && (
                      <svg
                        aria-label="Afiliated Account"
                        height="15"
                        role="img"
                        viewBox="0 0 40 40"
                        width="15"
                      >
                        <defs>
                          <linearGradient
                            id="metallicGold-addcontact-affiliated-account"
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="100%"
                          >
                            <stop offset="0%" stop-color="#fff7b0" />
                            <stop offset="25%" stop-color="#ffd700" />
                            <stop offset="50%" stop-color="#ffa500" />
                            <stop offset="75%" stop-color="#ffd700" />
                            <stop offset="100%" stop-color="#fff7b0" />
                          </linearGradient>
                        </defs>
                        <title>Afiliated Account</title>
                        <path
                          d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z"
                          fill="url(#metallicGold-addcontact-affiliated-account)"
                          fill-rule="evenodd"
                        ></path>
                      </svg>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => handleAddContact(user)}
                disabled={isAdding[user.uid]}
              >
                {isAdding[user.uid] ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PlusCircle className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </div>

        <DialogFooter className="sm:justify-end">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
