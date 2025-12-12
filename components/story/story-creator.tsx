"use client";

import type React from "react";

import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  CheckSquare,
  Film,
  ImageIcon,
  Music,
  Pause,
  Play,
  Search,
  Type,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { useFirebase } from "@/lib/firebase-provider";
import { User } from "@/types/user";
import { DialogDescription } from "@radix-ui/react-dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { ScrollArea } from "../ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

const BG_COLORS = [
  "bg-gradient-to-br from-purple-500 to-pink-500",
  "bg-gradient-to-br from-cyan-500 to-blue-500",
  "bg-gradient-to-br from-orange-400 to-red-500",
  "bg-gradient-to-br from-emerald-400 to-green-600",
  "bg-gradient-to-br from-slate-800 to-black",
];

export function StoryCreator() {
  const { db, storage, currentUser } = useFirebase();
  const [open, setOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [contacts, setContacts] = useState<User[]>([]);
  const [textContent, setTextContent] = useState("");
  const [selectedBgColor, setSelectedBgColor] = useState(BG_COLORS[0]);
  const [musicSearch, setMusicSearch] = useState("");
  const [musicResults, setMusicResults] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"media" | "text">("media");
  const [selectedMusic, setSelectedMusic] = useState<{
    url: string;
    title: string;
    artist: string;
  } | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [privacy, setPrivacy] = useState<"public" | "contacts" | "selected">(
    "contacts"
  );
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    new Set()
  );
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState({
    isError: false,
    title: "",
    description: "",
  });
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const [allContactIds, setContactIds] = useState<string[]>([]);

  useEffect(() => {
    if (open && currentUser) {
      const fetchContacts = async () => {
        try {
          const contactsQ = query(
            collection(db, "contacts"),
            where("userId", "==", currentUser.uid)
          );
          const contactsSnap = await getDocs(contactsQ);
          const contactIds = contactsSnap.docs.map((d) => d.data().contactId);

          setContactIds(contactIds);

          if (contactIds.length > 0) {
            const usersQ = query(
              collection(db, "users"),
              where("uid", "in", contactIds.slice(0, 10))
            );
            const usersSnap = await getDocs(usersQ);
            const usersData = usersSnap.docs.map((d) => d.data() as User);
            setContacts(usersData);
          }
        } catch (err) {
          console.error("Error fetching contacts", err);
        }
      };
      fetchContacts();
    }
  }, [open, currentUser, db]);

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

  const searchMusic = async () => {
    if (!musicSearch.trim()) return;
    try {
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(
          musicSearch
        )}&media=music&entity=song&limit=5`
      );
      const data = await res.json();
      setMusicResults(data.results);
    } catch (e) {
      console.error("Music search error", e);
    }
  };

  const playMusicPreview = (url: string) => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
    }
    if (isPlayingPreview === url) {
      setIsPlayingPreview(null);
    } else {
      const audio = new Audio(url);
      audio.volume = 0.5;
      audio.play();
      audioPreviewRef.current = audio;
      setIsPlayingPreview(url);

      audio.onended = () => setIsPlayingPreview(null);
    }
  };

  const toggleUserSelection = (uid: string) => {
    setSelectedUserIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(uid)) newSet.delete(uid);
      else newSet.add(uid);
      return newSet;
    });
  };

  const handleCreateStory = async () => {
    if (!currentUser) return;

    if (activeTab === "media" && !mediaFile) return;
    if (activeTab === "text" && !textContent.trim()) return;

    if (privacy === "selected" && selectedUserIds.size === 0) {
      toast({ variant: "destructive", title: "No users found." });
      return;
    }

    setIsUploading(true);

    try {
      let mediaUrl = "";

      if (activeTab === "media" && mediaFile) {
        const storageRefNav = ref(
          storage,
          `stories/${currentUser.uid}/${Date.now()}_${mediaFile.name}`
        );
        await uploadBytes(storageRefNav, mediaFile);
        mediaUrl = await getDownloadURL(storageRefNav);
      }

      const now = new Date();
      const expiresAt = new Date(
        now.getTime() + 24 * 60 * 60 * 1000
      ).toISOString();

      let allowedViewers: string[] = [];

      if (privacy === "contacts") {
        allowedViewers = allContactIds;
      } else if (privacy === "selected") {
        allowedViewers = Array.from(selectedUserIds);
      }

      if (!allowedViewers.includes(currentUser.uid)) {
        allowedViewers.push(currentUser.uid);
      }

      const storyRef = doc(collection(db, "stories"));

      const storyData: any = {
        userId: currentUser.uid,
        type: activeTab,
        createdAt: now.toISOString(),
        expiresAt,
        viewers: [],
        allowedViewers,
        privacy,
        mediaUrl: activeTab === "media" ? mediaUrl : null,
        mediaType: activeTab === "media" ? mediaType : null,
        caption: activeTab === "media" ? textContent : null,
        textContent: activeTab === "text" ? textContent : null,
        backgroundColor: activeTab === "text" ? selectedBgColor : null,
        musicUrl: selectedMusic?.url || null,
        musicTitle: selectedMusic?.title || null,
        musicArtist: selectedMusic?.artist || null,
      };

      await setDoc(storyRef, storyData);

      toast({ title: "Story posted!" });
      handleClose();
    } catch (error) {
      console.error("error create story:", error);
      toast({
        variant: "destructive",
        title: "Failed to create story",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setPreview(null);
    setMediaFile(null);
    setTextContent("");
    setSelectedMusic(null);
    setSelectedUserIds(new Set());
    setMusicSearch("");
    setMusicResults([]);
    if (audioPreviewRef.current) audioPreviewRef.current.pause();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex gap-2"
          onClick={() => setOpen(true)}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
            +
          </span>
          <span>Add Story</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden w-[90%] ">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Create Story</DialogTitle>
          <DialogDescription>{errorMessage.description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-6">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as any)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="media">
                <ImageIcon className="mr-2 h-4 w-4" /> Media
              </TabsTrigger>
              <TabsTrigger value="text">
                <Type className="mr-2 h-4 w-4" /> Text
              </TabsTrigger>
            </TabsList>

            <TabsContent value="media" className="space-y-4">
              {!preview ? (
                <div className="grid grid-cols-2 gap-4">
                  <div
                    className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 hover:bg-muted/50 transition"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground" />
                    <span className="text-xs">Photo</span>
                    <input
                      type="file"
                      ref={imageInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e, "image")}
                    />
                  </div>
                  <div
                    className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 hover:bg-muted/50 transition"
                    onClick={() => videoInputRef.current?.click()}
                  >
                    <Film className="mb-2 h-8 w-8 text-muted-foreground" />
                    <span className="text-xs">Video</span>
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
                <div className="relative rounded-lg overflow-hidden bg-black aspect-video max-h-[300px] flex items-center justify-center group">
                  {mediaType === "image" ? (
                    <img
                      src={preview}
                      className="h-full w-full object-cover"
                      alt="Preview"
                    />
                  ) : (
                    <video
                      src={preview}
                      className="h-full w-full object-contain"
                      controls
                    />
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 rounded-full opacity-0 group-hover:opacity-100 transition"
                    onClick={() => {
                      setPreview(null);
                      setMediaFile(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {preview && (
                <Textarea
                  placeholder="Add a caption..."
                  value={textContent}
                  className="resize-none"
                  onChange={(e) => setTextContent(e.target.value)}
                  rows={2}
                />
              )}
            </TabsContent>

            <TabsContent value="text" className="space-y-4">
              <div
                className={`w-full aspect-square rounded-xl flex items-center justify-center p-6 text-center shadow-inner transition-colors duration-500 ${selectedBgColor}`}
              >
                <textarea
                  className="bg-transparent w-full h-full text-white text-xl font-bold text-center resize-none focus:outline-none placeholder:text-white/50"
                  placeholder="Type something..."
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  maxLength={300}
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {BG_COLORS.map((bg, idx) => (
                  <button
                    key={idx}
                    className={`h-8 w-8 rounded-full ${bg} ${
                      selectedBgColor === bg
                        ? "ring-2 ring-offset-2 ring-black dark:ring-white"
                        : ""
                    }`}
                    onClick={() => setSelectedBgColor(bg)}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-2 pt-2 border-t">
            <Label className="flex items-center gap-2">
              <Music className="h-4 w-4" /> Background Music
            </Label>

            {selectedMusic ? (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg border border-primary/20">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <Music className="h-4 w-4 text-primary" />
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-medium truncate">
                      {selectedMusic.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedMusic.artist}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedMusic(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search song (e.g. Lofi, Pop)..."
                    value={musicSearch}
                    disabled={mediaType === "video"}
                    onChange={(e) => {
                      if (mediaType === "video") return;
                      setMusicSearch(e.target.value);
                    }}
                    className="h-9"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={searchMusic}
                    disabled={!musicSearch}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                {musicResults.length > 0 && (
                  <ScrollArea className="h-32 rounded-md border p-2">
                    {musicResults.map((track: any) => (
                      <div
                        key={track.trackId}
                        className="flex items-center justify-between p-2 hover:bg-accent rounded-sm group"
                      >
                        <div
                          className="flex items-center gap-2 overflow-hidden flex-1 cursor-pointer"
                          onClick={() =>
                            setSelectedMusic({
                              url: track.previewUrl,
                              title: track.trackName,
                              artist: track.artistName,
                            })
                          }
                        >
                          <img
                            src={track.artworkUrl60}
                            className="h-8 w-8 rounded-sm"
                            alt="art"
                          />
                          <div className="truncate">
                            <p className="text-xs font-medium truncate max-w-[120px] md:max-w-none text-ellipsis">
                              {track.trackName}
                            </p>
                            <p className="text-[10px] max-w-[120px] md:max-w-none text-muted-foreground truncate text-ellipsis">
                              {track.artistName}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => playMusicPreview(track.previewUrl)}
                        >
                          {isPlayingPreview === track.previewUrl ? (
                            <Pause className="h-3 w-3" />
                          ) : (
                            <Play className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </ScrollArea>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Privacy
            </Label>
            <div className="flex gap-2 mb-2">
              <Button
                variant={privacy === "public" ? "default" : "outline"}
                size="sm"
                onClick={() => setPrivacy("public")}
                className="flex-1 text-xs"
              >
                Public
              </Button>
              <Button
                variant={privacy === "contacts" ? "default" : "outline"}
                size="sm"
                onClick={() => setPrivacy("contacts")}
                className="flex-1 text-xs"
              >
                Contacts
              </Button>
              <Button
                variant={privacy === "selected" ? "default" : "outline"}
                size="sm"
                onClick={() => setPrivacy("selected")}
                className="flex-1 text-xs"
              >
                Selected
              </Button>
            </div>

            {privacy === "selected" && (
              <ScrollArea className="h-32 border rounded-md p-2 bg-muted/20">
                {contacts.length === 0 ? (
                  <p className="text-xs text-center text-muted-foreground py-4">
                    No contacts found.
                  </p>
                ) : (
                  contacts.map((contact) => (
                    <div
                      key={contact.uid}
                      className="flex items-center gap-2 p-2 hover:bg-accent rounded-sm cursor-pointer"
                      onClick={() => toggleUserSelection(contact.uid)}
                    >
                      <div
                        className={`h-4 w-4 rounded border flex items-center justify-center ${
                          selectedUserIds.has(contact.uid)
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground"
                        }`}
                      >
                        {selectedUserIds.has(contact.uid) && (
                          <CheckSquare className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="h-6 w-6 rounded-full overflow-hidden flex-shrink-0 bg-muted">
                          {contact.photoURL ? (
                            <img
                              src={contact.photoURL}
                              alt={contact.displayName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-[10px] font-bold">
                              {contact.displayName?.charAt(0) || "?"}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col truncate">
                          <span className="text-sm font-medium truncate">
                            {contact.displayName}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {contact.email}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter className="p-6 pt-0 bg-background z-20 gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateStory}
            disabled={
              isUploading ||
              (activeTab === "media" && !mediaFile) ||
              (activeTab === "text" && !textContent)
            }
          >
            {isUploading ? "Posting..." : "Share Story"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
