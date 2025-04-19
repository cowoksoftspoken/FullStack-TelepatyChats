"use client";

import type React from "react";

import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  ArrowLeft,
  File,
  FileText,
  Film,
  Image,
  Loader2,
  Mic,
  MoreVertical,
  Music,
  Paperclip,
  Phone,
  Reply,
  Send,
  Smile,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useFirebase } from "@/lib/firebase-provider";
import type { Message } from "@/types/message";
import type { User } from "@/types/user";
import { AudioMessage } from "./audio-message";
import { UserAvatar } from "./user-avatar";
import { UserProfilePopup } from "./user-profile-popup";
import VideoPlayer from "./video-message";
import { YoutubeEmbed } from "./yt-embed";

interface ChatAreaProps {
  currentUser: any;
  contact: User;
  initiateCall: (isVideo: boolean) => void;
  setIsMobileMenuOpen?: (isOpen: boolean) => void;
}

export function ChatArea({
  currentUser,
  contact,
  initiateCall,
  setIsMobileMenuOpen,
}: ChatAreaProps) {
  const { db, storage } = useFirebase();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const timerIntervalRef = useRef<number | null>(null); // Store interval ID in a ref instead
  const { theme } = useTheme();
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const { toast } = useToast();

  // Media preview state
  const [previewFile, setPreviewFile] = useState<{
    file: File;
    type: "image" | "video" | "file" | "audio";
    preview: string;
    duration?: number;
  } | null>(null);
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [audioPreviewDuration, setAudioPreviewDuration] = useState<
    number | null
  >(null);
  const [isTyping, setIsTyping] = useState(false);
  const [contactIsTyping, setContactIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!currentUser || !contact) return;

    const chatId = [currentUser.uid, contact.uid].sort().join("_");
    const typingStatusRef = doc(db, "typingStatus", chatId);

    const unsubscribe = onSnapshot(typingStatusRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data[contact.uid] === true) {
          setContactIsTyping(true);
        } else {
          setContactIsTyping(false);
        }
      } else {
        setContactIsTyping(false);
      }
    });

    return () => unsubscribe();
  }, [currentUser, contact, db]);

  // Check if either user has blocked the other
  useEffect(() => {
    if (!currentUser || !contact) return;

    const checkBlockStatus = async () => {
      try {
        // Check if contact has blocked current user
        const [contactDoc, currentUserDoc] = await Promise.all([
          getDoc(doc(db, "users", contact.uid)),
          getDoc(doc(db, "users", currentUser.uid)),
        ]);

        if (contactDoc.exists() && currentUserDoc.exists()) {
          const contactData = contactDoc.data();
          const currentUserData = currentUserDoc.data();

          const contactBlockedUser =
            contactData.blockedUsers?.includes(currentUser.uid) || false;
          const userBlockedContact =
            currentUserData.blockedUsers?.includes(contact.uid) || false;

          setIsBlocked(contactBlockedUser || userBlockedContact);
        }
      } catch (error) {
        console.error("Error checking block status:", error);
      }
    };

    checkBlockStatus();
  }, [currentUser, contact, db]);

  useEffect(() => {
    if (!currentUser || !contact) return;

    const chatId = [currentUser.uid, contact.uid].sort().join("_");

    const q = query(collection(db, "messages"), where("chatId", "==", chatId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageList: Message[] = [];
      snapshot.forEach((doc) => {
        messageList.push({ id: doc.id, ...doc.data() } as Message);
      });

      // Sort messages by timestamp in memory
      messageList.sort((a, b) => {
        return (
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });

      setMessages(messageList);
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [currentUser, contact, db]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement> | string
  ) => {
    const value = typeof e === "string" ? e : e.target.value;
    setMessage(value);

    if (currentUser && contact) {
      const chatId = [currentUser.uid, contact.uid].sort().join("_");
      const typingStatusRef = doc(db, "typingStatus", chatId);

      if (!isTyping) {
        setIsTyping(true);

        getDoc(typingStatusRef)
          .then((docSnap) => {
            if (docSnap.exists()) {
              const currentData = docSnap.data();
              updateDoc(typingStatusRef, {
                ...currentData,
                [currentUser.uid]: true,
                timestamp: new Date().toISOString(),
              });
            } else {
              setDoc(typingStatusRef, {
                [currentUser.uid]: true,
                timestamp: new Date().toISOString(),
              });
            }
          })
          .catch(console.error);
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        if (isTyping) {
          setIsTyping(false);

          getDoc(typingStatusRef)
            .then((docSnap) => {
              if (docSnap.exists()) {
                const currentData = docSnap.data();
                updateDoc(typingStatusRef, {
                  ...currentData,
                  [currentUser.uid]: false,
                  timestamp: new Date().toISOString(),
                });
              }
            })
            .catch(console.error);
        }
      }, 2000); // 2 detik setelah pengguna berhenti mengetik
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((!message.trim() && !replyTo) || !currentUser || !contact) return;

    if (isBlocked) {
      toast({
        variant: "destructive",
        title: "Cannot send message",
        description:
          "You cannot send messages to this user because one of you has blocked the other.",
      });
      return;
    }

    const chatId = [currentUser.uid, contact.uid].sort().join("_");

    try {
      await addDoc(collection(db, "messages"), {
        chatId,
        text: message.trim() || (replyTo ? "" : "👍"),
        senderId: currentUser.uid,
        receiverId: contact.uid,
        timestamp: new Date().toISOString(),
        isSeen: false,
        replyTo: replyTo
          ? {
              id: replyTo.id,
              text: replyTo.text,
              senderId: replyTo.senderId,
            }
          : null,
        type: "text",
      });

      if (isTyping) {
        setIsTyping(false);
        updateDoc(doc(db, "typingStatus", chatId), {
          userId: currentUser.uid,
          isTyping: false,
          timestamp: new Date().toISOString(),
        }).catch(console.error);
      }

      setMessage("");
      setReplyTo(null);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleEmojiSelect = (emoji: any) => {
    setMessage((prev) => prev + emoji.native);
  };

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "video" | "file" | "audio"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    if (type === "image") {
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewFile({
          file,
          type,
          preview: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    } else if (type === "video") {
      const url = URL.createObjectURL(file);
      setPreviewFile({
        file,
        type,
        preview: url,
      });
    } else if (type === "audio") {
      const url = URL.createObjectURL(file);

      // Get audio duration
      const audio = new Audio(url);
      audio.onloadedmetadata = () => {
        setAudioPreviewDuration(Math.round(audio.duration));
        setPreviewFile({
          file,
          type,
          preview: url,
          duration: Math.round(audio.duration),
        });
      };
    } else {
      setPreviewFile({
        file,
        type,
        preview: "",
      });
    }

    // Reset caption
    setCaption("");
  };

  const handleSendMedia = async () => {
    if (!previewFile || !currentUser || !contact) return;

    // Check if either user has blocked the other
    if (isBlocked) {
      toast({
        variant: "destructive",
        title: "Cannot send media",
        description:
          "You cannot send media to this user because one of you has blocked the other.",
      });
      setPreviewFile(null);
      return;
    }

    setIsUploading(true);

    try {
      const chatId = [currentUser.uid, contact.uid].sort().join("_");
      const fileRef = ref(
        storage,
        `chats/${chatId}/${Date.now()}_${previewFile.file.name}`
      );

      // Upload file
      await uploadBytes(fileRef, previewFile.file);

      // Get download URL
      const downloadURL = await getDownloadURL(fileRef);

      // Add message to Firestore
      await addDoc(collection(db, "messages"), {
        chatId,
        text: caption || previewFile.file.name,
        senderId: currentUser.uid,
        receiverId: contact.uid,
        timestamp: new Date().toISOString(),
        fileURL: downloadURL,
        fileName: previewFile.file.name,
        fileType: previewFile.file.type,
        type: previewFile.type,
        ...(previewFile.type === "audio" && {
          duration: previewFile.duration || 0,
        }),
        replyTo: replyTo
          ? {
              id: replyTo.id,
              text: replyTo.text,
              senderId: replyTo.senderId,
            }
          : null,
      });

      // Clear preview and caption
      setPreviewFile(null);
      setCaption("");
      setReplyTo(null);
      setAudioPreviewDuration(null);
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload file. Please try again.",
      });
    } finally {
      setIsUploading(false);

      // Clear the inputs
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (videoInputRef.current) videoInputRef.current.value = "";
      if (audioInputRef.current) audioInputRef.current.value = "";
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      await deleteDoc(doc(db, "messages", messageId));
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const startRecording = async () => {
    if (isBlocked) {
      toast({
        variant: "destructive",
        title: "Cannot record audio",
        description:
          "You cannot send audio messages to this user because one of you has blocked the other.",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        await sendAudioMessage(audioBlob);
        setAudioChunks([]);
        setIsRecording(false);
        setRecordingTime(0);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      setMediaRecorder(recorder);
      setAudioChunks([]);
      recorder.start();
      setIsRecording(true);

      // Start timer
      const startTime = Date.now();
      // Store interval ID in the ref instead of on the MediaRecorder object
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      recorder.onerror = () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      };
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        variant: "destructive",
        title: "Microphone access denied",
        description:
          "Could not access microphone. Please check your permissions.",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      // Clear the timer interval
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      // Clear the timer interval
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setIsRecording(false);
      setRecordingTime(0);
      setAudioChunks([]);
    }
  };

  const sendAudioMessage = async (audioBlob: Blob) => {
    if (!currentUser || !contact) return;

    if (isBlocked) {
      toast({
        variant: "destructive",
        title: "Cannot send audio",
        description:
          "You cannot send audio messages to this user because one of you has blocked the other.",
      });
      return;
    }

    try {
      const chatId = [currentUser.uid, contact.uid].sort().join("_");
      const fileRef = ref(storage, `chats/${chatId}/audio_${Date.now()}.webm`);

      // Upload audio
      await uploadBytes(fileRef, audioBlob);

      // Get download URL
      const downloadURL = await getDownloadURL(fileRef);

      // Add message to Firestore
      await addDoc(collection(db, "messages"), {
        chatId,
        text: "Audio message",
        senderId: currentUser.uid,
        receiverId: contact.uid,
        timestamp: new Date().toISOString(),
        fileURL: downloadURL,
        fileName: "Audio message",
        fileType: "audio/webm",
        type: "audio",
        duration: recordingTime,
        replyTo: replyTo
          ? {
              id: replyTo.id,
              text: replyTo.text,
              senderId: replyTo.senderId,
            }
          : null,
      });

      setReplyTo(null);
    } catch (error) {
      console.error("Error sending audio message:", error);
      toast({
        variant: "destructive",
        title: "Failed to send audio",
        description: "Failed to send audio message. Please try again.",
      });
    }
  };

  useEffect(() => {
    if (!currentUser || !contact || messages.length === 0) return;

    // Tandai pesan yang diterima sebagai telah dibaca
    const markMessagesAsSeen = async () => {
      try {
        const unreadMessages = messages.filter(
          (msg) => msg.senderId === contact.uid && !msg.isSeen
        );

        // Update semua pesan yang belum dibaca
        const updatePromises = unreadMessages.map((msg) =>
          updateDoc(doc(db, "messages", msg.id), { isSeen: true })
        );

        await Promise.all(updatePromises);
      } catch (error) {
        console.error("Error marking messages as seen:", error);
      }
    };

    markMessagesAsSeen();
  }, [currentUser, contact, messages, db]);

  const renderSeenIndicator = (msg: Message) => {
    if (msg.senderId !== currentUser.uid) return null;

    return (
      <span
        className={`ml-1 ${msg.isSeen ? "text-blue-500" : "text-gray-500"}`}
        title={msg.isSeen ? "Seen" : "Not seen"}
        aria-label={msg.isSeen ? "Seen" : "Not seen"}
        aria-live="assertive"
        role="status"
      >
        {/* Indikator centang dua */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6L7 17L2 12"></path>
          <path d="M22 10L13 19L11 17"></path>
        </svg>
      </span>
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  function extractYouTubeId(text: string): string | null {
    const regex =
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = text.match(regex);
    return match ? match[1] : null;
  }

  const checkingMessage = (text: string) => {
    const urlPattern =
      /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/g;
    const youtubeRegex =
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

    if (urlPattern.test(text)) {
      return text.replace(urlPattern, (url) => {
        if (youtubeRegex.test(url)) {
          return `<a href="${url}" class="text-indigo-500 underline max-w-full" target="_blank" rel="noopener noreferrer" role="button">YouTube Link</a>`;
        } else {
          return `<a href="${url}" class="text-indigo-500 underline max-w-full" target="_blank" rel="noopener noreferrer" role="button">${url}</a>`;
        }
      });
    } else {
      return text;
    }
  };

  const renderMessageContent = (msg: Message) => {
    switch (msg.type) {
      case "image":
        return (
          <div className="mt-1">
            <img
              src={msg.fileURL || "/placeholder.svg"}
              alt={msg.fileName}
              className="w-full rounded-md max-h-60 object-cover"
              onClick={() => window.open(msg.fileURL, "_blank")}
            />
            {msg.text !== msg.fileName && (
              <p className="mt-1 text-sm">{msg.text}</p>
            )}
          </div>
        );
      case "video":
        return (
          <div className="mt-1 w-full">
            {/* <video
              src={msg.fileURL}
              controls
              className="max-w-full rounded-md h-full object-cover"
            /> */}
            <VideoPlayer fileURL={msg.fileURL || ""} />
            {msg.text !== msg.fileName && (
              <p className="mt-1 text-sm">{msg.text}</p>
            )}
          </div>
        );
      case "audio":
        return (
          <div className="mt-1">
            <AudioMessage
              src={msg.fileURL || ""}
              duration={msg.duration}
              fileName={msg.fileName}
              isDark={theme === "dark" ? false : true}
              className="max-w-full"
            />
            {msg.text !== "Audio message" && msg.text !== msg.fileName && (
              <p className="mt-1 text-sm w-full">{msg.text}</p>
            )}
          </div>
        );
      case "file":
        return (
          <div className="mt-1 flex items-center flex-col gap-2">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <a
                href={msg.fileURL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 text-sm hover:underline"
              >
                {msg.fileName}
              </a>
            </div>
            {msg.text !== msg.fileName && (
              <p className="mt-1 text-base flex">{msg.text}</p>
            )}
          </div>
        );
      default:
        const youtubeId = extractYouTubeId(msg.text);
        return (
          <>
            {youtubeId && <YoutubeEmbed videoId={youtubeId} />}
            <p
              className="w-full text-sm md:text-base break-words"
              dangerouslySetInnerHTML={{
                __html: checkingMessage(msg.text),
              }}
            />
          </>
        );
    }
  };

  return (
    <div className="flex flex-1 flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b dark:bg-[#1c1c1d]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen?.(true)}
            className="md:hidden cursor-pointer"
          >
            <ArrowLeft className="h-6 w-6 dark:text-white text-black" />
          </button>

          <UserAvatar user={contact} isBlocked={isBlocked} />
          <div>
            <div className="flex items-center gap-1">
              <p className="font-medium">{contact.displayName}</p>
              {contact.isVerified && !isBlocked && (
                <svg
                  aria-label="Sudah Diverifikasi"
                  fill="rgb(0, 149, 246)"
                  height="16"
                  role="img"
                  viewBox="0 0 40 40"
                  width="16"
                >
                  <title>Sudah Diverifikasi</title>
                  <path
                    d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z"
                    fillRule="evenodd"
                  ></path>
                </svg>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isBlocked
                ? "You cannot interact with this user"
                : contactIsTyping && !isBlocked && contact.online
                ? "Typing..."
                : contact.online
                ? "Online"
                : "Offline"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            disabled={isBlocked}
            onClick={() => initiateCall(false)}
          >
            <Phone className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={isBlocked}
            onClick={() => initiateCall(true)}
          >
            <Video className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsUserProfileOpen(true)}
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {isBlocked && (
        <div className="px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-center">
          You cannot send messages because one of you has blocked the other.
        </div>
      )}

      <div
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-[#cbd5e1] scrollbar-track-[#f3f4f6] dark:scrollbar-thumb-[#4e4e4e] dark:scrollbar-track-[#1e1e1e]"
        style={{
          backgroundImage: `url("${
            theme === "dark"
              ? "https://i.ibb.co.com/m5p2Ttrf/wp-132-dark.jpg"
              : "https://i.ibb.co.com/qLvfqFLR/wp-132.jpg"
          }")`,
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.senderId === currentUser.uid ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] md:max-w-[70%] rounded-lg px-3 py-2 ${
                msg.senderId === currentUser.uid
                  ? "dark:bg-[#131418] bg-slate-200"
                  : "dark:bg-muted bg-slate-100"
              }`}
            >
              {msg.replyTo && (
                <div
                  className={`text-xs p-2 rounded mb-2 ${
                    msg.senderId === currentUser.uid
                      ? "bg-slate-300/25"
                      : "bg-background text-foreground"
                  }`}
                >
                  <div className="font-semibold">
                    {msg.replyTo.senderId === currentUser.uid
                      ? "You"
                      : contact.displayName}
                  </div>
                  <div className="truncate">{msg.replyTo.text}</div>
                </div>
              )}

              {renderMessageContent(msg)}

              <div className="flex items-center justify-between text-xs opacity-70 mt-1">
                <div className="flex items-center">
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {renderSeenIndicator(msg)}
                </div>

                {/* Message actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="19" cy="12" r="1"></circle>
                        <circle cx="5" cy="12" r="1"></circle>
                      </svg>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setReplyTo(msg)}>
                      <Reply className="mr-2 h-4 w-4" />
                      Reply
                    </DropdownMenuItem>
                    {msg.senderId === currentUser.uid && (
                      <DropdownMenuItem onClick={() => deleteMessage(msg.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div className="px-4 py-2 border-t flex items-center justify-between dark:bg-[#151516]">
          <div className="flex items-center gap-2">
            <Reply className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <span className="text-muted-foreground">Replying to </span>
              <span className="font-medium">
                {replyTo.senderId === currentUser.uid
                  ? "yourself"
                  : contact.displayName}
              </span>
              <p className="text-xs truncate max-w-[200px] md:max-w-md">
                {replyTo.text}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setReplyTo(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Recording UI */}
      {isRecording && (
        <div className="px-4 py-2 border-t flex items-center justify-between bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-sm font-medium">
              Recording... {formatTime(recordingTime)}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={cancelRecording}>
              <X className="h-4 w-4" />
            </Button>
            <Button variant="default" size="sm" onClick={stopRecording}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Message input */}
      <form
        onSubmit={sendMessage}
        className="border-t p-4 px-2 md:px-4 dark:bg-[#151516]"
      >
        <div className="flex gap-2 items-center">
          {/* File upload dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full"
                disabled={isBlocked}
              >
                <Paperclip className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
                <Image className="mr-2 h-4 w-4" />
                <span>Image</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => videoInputRef.current?.click()}>
                <Film className="mr-2 h-4 w-4" />
                <span>Video</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => audioInputRef.current?.click()}>
                <Music className="mr-2 h-4 w-4" />
                <span>Audio</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <File className="mr-2 h-4 w-4" />
                <span>File</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Hidden file inputs */}
          <input
            type="file"
            ref={imageInputRef}
            className="hidden"
            accept="image/*"
            onChange={(e) => handleFileSelect(e, "image")}
          />
          <input
            type="file"
            ref={videoInputRef}
            className="hidden"
            accept="video/*"
            onChange={(e) => handleFileSelect(e, "video")}
          />
          <input
            type="file"
            ref={audioInputRef}
            className="hidden"
            accept="audio/*"
            onChange={(e) => handleFileSelect(e, "audio")}
          />
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="application/*,text/*"
            onChange={(e) => handleFileSelect(e, "file")}
          />

          {/* Emoji picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5 rounded-full"
                disabled={isBlocked}
              >
                <Smile className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Picker
                data={data}
                onEmojiSelect={handleEmojiSelect}
                theme={theme}
              />
            </PopoverContent>
          </Popover>

          {/* Text input */}
          <Input
            value={message}
            onChange={(e) => handleInputChange(e)}
            placeholder={
              isBlocked
                ? "You cannot send messages to this user"
                : "Type a message..."
            }
            className="flex-1 rounded-full dark:bg-[#000000]/30"
            disabled={isBlocked}
          />

          {/* Send or record button */}
          {message.trim() ? (
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 rounded-full"
              disabled={isBlocked}
            >
              <Send className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              className="h-10 w-10 rounded-full"
              onMouseDown={startRecording}
              disabled={isBlocked}
            >
              <Mic className="h-5 w-5" />
            </Button>
          )}
        </div>
      </form>

      {/* Media preview dialog */}
      <Dialog
        open={!!previewFile}
        onOpenChange={(open) => !open && setPreviewFile(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {previewFile?.type === "image"
                ? "Send Image"
                : previewFile?.type === "video"
                ? "Send Video"
                : previewFile?.type === "audio"
                ? "Send Audio"
                : "Send File"}
            </DialogTitle>
            <DialogDescription>
              Preview your media before sending
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Preview content */}
            {previewFile?.type === "image" && (
              <div className="flex justify-center">
                <img
                  src={previewFile.preview || "/placeholder.svg"}
                  alt="Preview"
                  className="max-h-60 max-w-full rounded-md object-contain"
                />
              </div>
            )}

            {previewFile?.type === "video" && (
              <div className="flex justify-center">
                <video
                  src={previewFile.preview}
                  controls
                  className="max-h-60 max-w-full rounded-md"
                />
              </div>
            )}

            {previewFile?.type === "audio" && (
              <div className="flex justify-center flex-col items-center gap-2 p-4 border rounded-md">
                <Music className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium">{previewFile.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {previewFile.file.size < 1024 * 1024
                      ? `${(previewFile.file.size / 1024).toFixed(2)} KB`
                      : `${(previewFile.file.size / (1024 * 1024)).toFixed(
                          2
                        )} MB`}
                  </p>
                </div>
                <audio
                  src={previewFile.preview}
                  controls
                  className="w-full mt-2"
                />
                {previewFile.duration && (
                  <p className="text-xs text-muted-foreground">
                    Duration: {formatTime(previewFile.duration)}
                  </p>
                )}
              </div>
            )}

            {previewFile?.type === "file" && (
              <div className="flex items-center gap-2 p-4 border rounded-md">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">{previewFile.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(previewFile.file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
            )}

            {/* Caption input */}
            <div className="space-y-2">
              <Label htmlFor="caption">Caption (optional)</Label>
              <Textarea
                id="caption"
                placeholder="Add a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewFile(null)}>
              Cancel
            </Button>
            <Button onClick={handleSendMedia} disabled={isUploading}>
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Send"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Profile Popup */}
      <UserProfilePopup
        user={contact}
        currentUser={currentUser}
        initiateCall={initiateCall}
        open={isUserProfileOpen}
        onClose={() => setIsUserProfileOpen(false)}
      />
    </div>
  );
}
