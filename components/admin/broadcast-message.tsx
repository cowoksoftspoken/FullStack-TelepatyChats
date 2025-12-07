"use client";

import type React from "react";

import { useState, useRef, useMemo } from "react";
import { addDoc, collection, doc, writeBatch } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Send, ImageIcon, Film, File, X, CheckSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFirebase } from "@/lib/firebase-provider";
import { toast } from "@/components/ui/use-toast";
import type { User } from "@/types/user";
import { Label } from "../ui/label";
import { useEncryption } from "@/hooks/use-encryption";

interface BroadcastMessageProps {
  users?: User[];
  isAdmin?: boolean;
}

export function BroadcastMessage({
  users = [],
  isAdmin,
}: BroadcastMessageProps) {
  const { db, storage, currentUser } = useFirebase();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [audience, setAudience] = useState<
    "all" | "verified" | "unverified" | "selected"
  >("all");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | "file" | null>(
    null
  );
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    new Set()
  );
  const { encryptMessageForContact, isInitialized } =
    useEncryption(currentUser);
  const [preview, setPreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "video" | "file"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaType(type);
    setMediaFile(file);

    if (type === "image" || type === "video") {
      const url = URL.createObjectURL(file);
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const selectableUsers = useMemo(() => {
    return users.filter((u) => u.uid !== currentUser?.uid);
  }, [users, currentUser]);

  const toggleUserSelection = (uid: string) => {
    setSelectedUserIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(uid)) {
        newSet.delete(uid);
      } else {
        newSet.add(uid);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedUserIds.size === selectableUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(selectableUsers.map((u) => u.uid)));
    }
  };

  const handleSendBroadcast = async () => {
    // if (!message.trim() && !mediaFile) return;
    if (!isAdmin) {
      toast({
        variant: "destructive",
        title: "Permission denied",
        description: "You don't have permission to send broadcast messages.",
      });
      console.log("[BroadcastMessage] Permission denied", isAdmin);
      return;
    }

    if (audience === "selected" && selectedUserIds.size === 0) {
      toast({
        variant: "destructive",
        title: "No users selected",
        description: "Please select at least one user to broadcast to.",
      });
      console.log(
        "[Broadcast] Please select at least one user to broadcast to."
      );
      return;
    }

    setIsUploading(true);

    try {
      let mediaUrl = "";
      const finalMediaType = mediaType;

      if (mediaFile && mediaType) {
        const storageRef = ref(
          storage,
          `broadcasts/${Date.now()}_${mediaFile.name}`
        );
        await uploadBytes(storageRef, mediaFile);
        mediaUrl = await getDownloadURL(storageRef);
      }

      let targetUsers: User[] = [];
      if (audience === "all") targetUsers = users;
      else if (audience === "verified")
        targetUsers = users.filter((u) => u.isVerified);
      else if (audience === "unverified")
        targetUsers = users.filter((u) => !u.isVerified);
      else if (audience === "selected") {
        targetUsers = users.filter((u) => selectedUserIds.has(u.uid));
      }

      targetUsers = targetUsers.filter(
        (target) => target.uid !== currentUser.uid
      );

      if (targetUsers.length === 0) {
        toast({
          title: "No users found",
          description: "No users match the selected audience",
        });
        setIsUploading(false);
        return;
      }

      await addDoc(collection(db, "broadcasts"), {
        senderId: currentUser.uid,
        message: message.trim(),
        mediaUrl: mediaUrl || null,
        mediaType: finalMediaType || null,
        sentAt: new Date().toISOString(),
        sentTo: audience,
        recipientCount: targetUsers.length,
        recipients: targetUsers.map((u) => u.uid),
      });

      const batch = writeBatch(db);
      // targetUsers.forEach((target) => {
      //   const chatId = [currentUser.uid, target.uid].sort().join("_");
      //   const newMessageRef = doc(collection(db, "messages"));

      //   const messageData: any = {
      //     chatId: chatId,
      //     senderId: currentUser.uid,
      //     receiverId: target.uid,
      //     text:
      //     message.trim() ||
      //     (finalMediaType ? `[${finalMediaType}]` : "BroadcastMessage"),
      //     timestamp: new Date().toISOString(),
      //     isSeen: false,
      //     type: "broadcast",
      //     isEncrypted: true,
      //     isBroadcast: true,
      //   };

      //   if (mediaUrl) {
      //     messageData.fileURL = mediaUrl;
      //     messageData.fileType = mediaFile?.type || "unknown";
      //     messageData.fileName = mediaFile?.name || "file";

      //     if (finalMediaType === "image") messageData.type = "image";
      //     if (finalMediaType === "video") messageData.type = "video";
      //     if (finalMediaType === "file") messageData.type = "file";
      //   }

      //   batch.set(newMessageRef, messageData);
      // });

      const baseMessageText =
        message.trim() ||
        (finalMediaType ? `[${finalMediaType}]` : "Broadcast Message");

      for (const targetUser of targetUsers) {
        const chatId = [currentUser.uid, targetUser.uid].sort().join("_");
        const newMessageRef = doc(collection(db, "messages"));

        let messageData: any = {
          chatId: chatId,
          senderId: currentUser.uid,
          receiverId: targetUser.uid,
          timestamp: new Date().toISOString(),
          isSeen: false,
          type: "broadcast",
          isBroadcast: true,
        };

        if (isInitialized) {
          try {
            const encryptedBroadcastData = await encryptMessageForContact(
              baseMessageText,
              targetUser.uid
            );
            if (encryptedBroadcastData.isEncrypted) {
              messageData = {
                ...messageData,
                text: "🔒 Encrypted Broadcast",
                encryptedText: encryptedBroadcastData.encryptedText,
                encryptedKey: encryptedBroadcastData.encryptedKeyForContact,
                encryptedKeyForSelf: encryptedBroadcastData.encryptedKeyForSelf,
                iv: encryptedBroadcastData.iv,
                isEncrypted: true,
              };
            } else {
              messageData.text = baseMessageText;
            }
          } catch (error) {
            console.error(
              `Failed to encrypt for ${targetUser.displayName}`,
              error
            );
            messageData.text = baseMessageText;
          }
        } else {
          messageData.text = baseMessageText;
        }

        batch.set(newMessageRef, messageData);
      }

      await batch.commit();

      toast({
        title: "Broadcast sent",
        description: `Message sent successfully to ${targetUsers.length} users.`,
      });

      setMessage("");
      setMediaFile(null);
      setMediaType(null);
      setPreview(null);
      setAudience("all");
      setOpen(false);
    } catch (error) {
      console.error("Error sending broadcast:", error);
      toast({
        variant: "destructive",
        title: "Failed to send broadcast",
        description:
          "An error occurred while sending your message. Please try again.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="flex gap-2">
          <Send className="h-4 w-4" />
          <span>Broadcast Message</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] rounded flex flex-col p-2 gap-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Send Broadcast Message</DialogTitle>
          <DialogDescription>
            Send a message to multiple users at once. This will appear as a
            direct message from the system.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder="Type your message here..."
              value={message}
              className="resize-none"
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>

          {preview && (
            <div className="relative">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                {mediaType === "image" ? (
                  <img
                    src={preview || "/placeholder.svg"}
                    alt="Media preview"
                    className="h-full w-full object-cover"
                  />
                ) : mediaType === "video" ? (
                  <video
                    src={preview}
                    className="h-full w-full object-cover"
                    controls
                    muted
                  />
                ) : null}
              </div>
              <Button
                variant="destructive"
                size="icon"
                className="absolute right-2 top-2 h-8 w-8 rounded-full"
                onClick={() => {
                  setPreview(null);
                  setMediaType(null);
                  setMediaFile(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {mediaFile && mediaType === "file" && (
            <div className="flex items-center gap-2 rounded-md border p-3">
              <File className="h-6 w-6 text-muted-foreground" />
              <div className="flex-1 truncate">
                <p className="text-sm font-medium">{mediaFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(mediaFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setMediaFile(null);
                  setMediaType(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10"
              onClick={() => imageInputRef.current?.click()}
            >
              <ImageIcon className="h-5 w-5" />
              <input
                type="file"
                ref={imageInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => handleFileSelect(e, "image")}
              />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10"
              onClick={() => videoInputRef.current?.click()}
            >
              <Film className="h-5 w-5" />
              <input
                type="file"
                ref={videoInputRef}
                className="hidden"
                accept="video/*"
                onChange={(e) => handleFileSelect(e, "video")}
              />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10"
              onClick={() => fileInputRef.current?.click()}
            >
              <File className="h-5 w-5" />
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="application/*,text/*"
                onChange={(e) => handleFileSelect(e, "file")}
              />
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Send to</label>
            <Select
              value={audience}
              onValueChange={(value) => setAudience(value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select audience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="verified">Verified Users Only</SelectItem>
                <SelectItem value="unverified">
                  Unverified Users Only
                </SelectItem>
                <SelectItem value="selected">Selected Users</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {audience === "selected" && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">
                  Selected: {selectedUserIds.size} users
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={handleSelectAll}
                >
                  {selectedUserIds.size === selectableUsers.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
              </div>

              <div className="border rounded-md max-h-[100px] overflow-y-auto p-1 bg-background">
                {selectableUsers.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    No users found.
                  </p>
                ) : (
                  selectableUsers.map((user) => {
                    const isSelected = selectedUserIds.has(user.uid);
                    return (
                      <div
                        key={user.uid}
                        onClick={() => toggleUserSelection(user.uid)}
                        className={`flex items-center gap-3 p-2 rounded-sm cursor-pointer transition-colors hover:bg-accent ${
                          isSelected ? "bg-accent/50" : ""
                        }`}
                      >
                        <div
                          className={`flex items-center justify-center w-5 h-5 rounded border ${
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground"
                          }`}
                        >
                          {isSelected && (
                            <CheckSquare className="h-3.5 w-3.5" />
                          )}
                        </div>

                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className="h-6 w-6 rounded-full overflow-hidden flex-shrink-0 bg-muted">
                            {user.photoURL ? (
                              <img
                                src={user.photoURL}
                                alt={user.displayName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-[10px] font-bold">
                                {user.displayName?.charAt(0) || "?"}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col truncate">
                            <span className="text-sm font-medium truncate">
                              {user.displayName}
                            </span>
                            <span className="text-[10px] text-muted-foreground truncate">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSendBroadcast}
            disabled={isUploading || (!message.trim() && !mediaFile)}
          >
            {isUploading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Sending...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                <span>Send Broadcast</span>
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
