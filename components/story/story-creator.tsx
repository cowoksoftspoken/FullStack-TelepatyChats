"use client";

import type React from "react";

import { useState, useRef } from "react";
import { addDoc, collection } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { X, ImageIcon, Film, Send } from "lucide-react";

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

export function StoryCreator() {
  const { db, storage, currentUser } = useFirebase();
  const [open, setOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [caption, setCaption] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "contacts" | "selected">(
    "contacts"
  );
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState({
    isError: false,
    title: "",
    description: "",
  });

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "video"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage({
        isError: true,
        title: "File too large",
        description: "Please select a file less than 50MB",
      });
      return;
    }

    setMediaType(type);
    setMediaFile(file);

    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const handleCreateStory = async () => {
    if (!mediaFile || !mediaType || !currentUser) return;

    setIsUploading(true);

    try {
      const storageRef = ref(
        storage,
        `stories/${currentUser.uid}/${Date.now()}_${mediaFile.name}`
      );
      await uploadBytes(storageRef, mediaFile);
      const mediaUrl = await getDownloadURL(storageRef);

      const now = new Date();
      const expiresAt = new Date(
        now.getTime() + 24 * 60 * 60 * 1000
      ).toISOString();

      const storyData: {
        userId: string;
        mediaUrl: string;
        mediaType: "image" | "video";
        caption: string | null;
        createdAt: string;
        expiresAt: string;
        viewers: string[];
        privacy: "public" | "contacts" | "selected";
        allowedViewers?: string[];
      } = {
        userId: currentUser.uid,
        mediaUrl,
        mediaType,
        caption: caption.trim() || null,
        createdAt: now.toISOString(),
        expiresAt,
        viewers: [],
        privacy,
      };

      if (privacy === "selected") {
        storyData.allowedViewers = [];
      }

      await addDoc(collection(db, "stories"), storyData);

      toast({
        title: "Story created",
        description: "Your story has been published successfully.",
      });

      setPreview(null);
      setMediaType(null);
      setCaption("");
      setPrivacy("contacts");
      setMediaFile(null);
      setOpen(false);
    } catch (error) {
      console.error("Error creating story:", error);
      toast({
        variant: "destructive",
        title: "Failed to create story",
        description:
          "An error occurred while creating your story. Please try again.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = (): void => {
    setErrorMessage({
      isError: false,
      title: "",
      description: "",
    });

    setMediaFile(null);
    setMediaType(null);
    setPreview(null);

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
    if (videoInputRef.current) {
      videoInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
            +
          </span>
          <span>Add Story</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Story</DialogTitle>
          <DialogDescription>
            Share a photo or video that will be visible for 24 hours.
          </DialogDescription>
        </DialogHeader>

        {errorMessage.isError && (
          <div className="p-3 w-full bg-red-50 dark:bg-red-900/20 rounded-sm">
            <div className="flex items-center justify-between">
              <p>{errorMessage.title}</p>
              <X className="h-4 w-4 cursor-pointer" onClick={handleClose} />
            </div>
            <p className="text-sm mt-2">{errorMessage.description}</p>
          </div>
        )}

        <div className="space-y-4 py-4">
          {!preview ? (
            <div className="grid grid-cols-2 gap-4">
              <div
                className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 hover:border-muted-foreground/50"
                onClick={() => imageInputRef.current?.click()}
              >
                <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Upload Photo</p>
                <input
                  type="file"
                  ref={imageInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e, "image")}
                />
              </div>
              <div
                className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 hover:border-muted-foreground/50"
                onClick={() => videoInputRef.current?.click()}
              >
                <Film className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Upload Video</p>
                <input
                  type="file"
                  ref={videoInputRef}
                  className="hidden"
                  accept="video/*"
                  onChange={(e) => handleFileSelect(e, "video")}
                />
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                {mediaType === "image" ? (
                  <img
                    src={preview || "/placeholder.svg"}
                    alt="Story preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <video
                    src={preview}
                    className="h-full w-full object-cover"
                    controls
                    muted
                  />
                )}
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

          {preview && (
            <>
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Privacy</label>
                <Select
                  value={privacy}
                  onValueChange={(value: "public" | "contacts" | "selected") =>
                    setPrivacy(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Who can see your story" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Everyone</SelectItem>
                    <SelectItem value="contacts">My Contacts</SelectItem>
                    <SelectItem value="selected">Selected Contacts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          {preview && (
            <Button onClick={handleCreateStory} disabled={isUploading}>
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
                  <span>Creating...</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  <span>Share Story</span>
                </span>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
