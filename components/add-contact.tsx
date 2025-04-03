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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
      // Search by email or display name
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

      // Add email results
      emailResults.forEach((doc) => {
        const userData = doc.data() as User;
        if (userData.uid !== currentUser.uid && !userIds.has(userData.uid)) {
          results.push(userData);
          userIds.add(userData.uid);
        }
      });

      // Add name results
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
      // Check if contact already exists
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

      // Add contact to contacts collection
      await setDoc(contactRef, {
        userId: currentUser.uid,
        contactId: contact.uid,
        createdAt: new Date().toISOString(),
      });

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
                {/* <Avatar>
                  <AvatarImage
                    src={user.photoURL || ""}
                    alt={user.displayName}
                    className="object-cover"
                  />
                  <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
                </Avatar> */}
                <UserAvatar user={user} showEnlargeOnClick={false} />
                <div>
                  <p className="font-medium">{user.displayName}</p>
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
