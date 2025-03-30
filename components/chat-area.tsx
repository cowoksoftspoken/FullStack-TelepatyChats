"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import {
  collection,
  query,
  addDoc,
  onSnapshot,
  where,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  Phone,
  Send,
  Video,
  Smile,
  Paperclip,
  X,
  Reply,
  Trash2,
  FileText,
  Mic,
} from "lucide-react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User } from "@/types/user";
import type { Message } from "@/types/message";
import { useTheme } from "@/components/theme-provider";
import { useFirebase } from "@/lib/firebase-provider";

interface ChatAreaProps {
  currentUser: any;
  contact: User;
  initiateCall: (isVideo: boolean) => void;
}

let recordingInterval: any = null;

export function ChatArea({
  currentUser,
  contact,
  initiateCall,
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
  const { theme } = useTheme();

  useEffect(() => {
    if (!currentUser || !contact) return;

    const chatId = [currentUser.uid, contact.uid].sort().join("_");

    const q = query(collection(db, "messages"), where("chatId", "==", chatId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageList: Message[] = [];
      snapshot.forEach((doc) => {
        messageList.push({ id: doc.id, ...doc.data() } as Message);
      });

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

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((!message.trim() && !replyTo) || !currentUser || !contact) return;

    const chatId = [currentUser.uid, contact.uid].sort().join("_");

    try {
      await addDoc(collection(db, "messages"), {
        chatId,
        text: message.trim() || (replyTo ? "" : "👍"),
        senderId: currentUser.uid,
        receiverId: contact.uid,
        timestamp: new Date().toISOString(),
        replyTo: replyTo
          ? {
              id: replyTo.id,
              text: replyTo.text,
              senderId: replyTo.senderId,
            }
          : null,
        type: "text",
      });

      setMessage("");
      setReplyTo(null);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleEmojiSelect = (emoji: any) => {
    setMessage((prev) => prev + emoji.native);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser || !contact) return;

    try {
      const storage = getStorage();
      const chatId = [currentUser.uid, contact.uid].sort().join("_");
      const fileRef = ref(
        storage,
        `chats/${chatId}/${Date.now()}_${file.name}`
      );

      await uploadBytes(fileRef, file);

      const downloadURL = await getDownloadURL(fileRef);

      let type = "file";
      if (file.type.startsWith("image/")) {
        type = "image";
      } else if (file.type.startsWith("video/")) {
        type = "video";
      } else if (file.type.startsWith("audio/")) {
        type = "audio";
      }

      await addDoc(collection(db, "messages"), {
        chatId,
        text: file.name,
        senderId: currentUser.uid,
        receiverId: contact.uid,
        timestamp: new Date().toISOString(),
        fileURL: downloadURL,
        fileName: file.name,
        fileType: file.type,
        type,
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
      console.error("Error uploading file:", error);
      alert("Failed to upload file. Please try again.");
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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

        stream.getTracks().forEach((track) => track.stop());
      };

      setMediaRecorder(recorder);
      setAudioChunks([]);
      recorder.start();
      setIsRecording(true);

      recorder.onstart = () => {
        const startTime = Date.now();
        recordingInterval = setInterval(() => {
          setRecordingTime(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
      };

      recorder.onstop = () => {
        clearInterval(recordingInterval);
        recordingInterval = null;
      };

      recorder.onerror = () => {
        clearInterval(recordingInterval);
        recordingInterval = null;
      };
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Could not access microphone. Please check your permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      if (recordingInterval) {
        clearInterval(recordingInterval);
        recordingInterval = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      if (recordingInterval) {
        clearInterval(recordingInterval);
        recordingInterval = null;
      }
      setIsRecording(false);
      setRecordingTime(0);
      setAudioChunks([]);
    }
  };

  const sendAudioMessage = async (audioBlob: Blob) => {
    if (!currentUser || !contact) return;

    try {
      const storage = getStorage();
      const chatId = [currentUser.uid, contact.uid].sort().join("_");
      const fileRef = ref(storage, `chats/${chatId}/audio_${Date.now()}.webm`);

      await uploadBytes(fileRef, audioBlob);

      const downloadURL = await getDownloadURL(fileRef);

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
      alert("Failed to send audio message. Please try again.");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const renderMessageContent = (msg: Message) => {
    switch (msg.type) {
      case "image":
        return (
          <div className="mt-1">
            <img
              src={msg.fileURL || "/placeholder.svg"}
              alt={msg.fileName}
              className="max-w-full rounded-md max-h-60 object-contain"
              onClick={() => window.open(msg.fileURL, "_blank")}
            />
          </div>
        );
      case "video":
        return (
          <div className="mt-1">
            <video
              src={msg.fileURL}
              controls
              className="max-w-full rounded-md max-h-60"
            />
          </div>
        );
      case "audio":
        return (
          <div className="mt-1">
            <audio src={msg.fileURL} controls className="max-w-full" />
            {msg.duration && (
              <div className="text-xs opacity-70 mt-1">
                {formatTime(msg.duration)}
              </div>
            )}
          </div>
        );
      case "file":
        return (
          <div className="mt-1 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <a
              href={msg.fileURL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              {msg.fileName}
            </a>
          </div>
        );
      default:
        return <p>{msg.text}</p>;
    }
  };

  return (
    <div className="flex flex-1 flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage
              src={contact.photoURL || ""}
              alt={contact.displayName || "User"}
            />
            <AvatarFallback>
              {contact.displayName?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{contact.displayName}</p>
            <p className="text-xs text-muted-foreground">
              {contact.online ? "Online" : "Offline"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => initiateCall(false)}
          >
            <Phone className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => initiateCall(true)}
          >
            <Video className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.senderId === currentUser.uid ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                msg.senderId === currentUser.uid
                  ? "bg-primary-foreground text-primary"
                  : "bg-muted"
              }`}
            >
              {msg.replyTo && (
                <div
                  className={`text-xs p-2 rounded mb-2 ${
                    msg.senderId === currentUser.uid
                      ? "bg-slate-100/30 text-primary"
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
                <span>
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>

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

      {replyTo && (
        <div className="px-4 py-2 border-t flex items-center justify-between">
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

      <form onSubmit={sendMessage} className="border-t p-4">
        <div className="flex gap-2 items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-8 w-8" />
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
            accept="image/*,video/*,audio/*,application/*"
          />

          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full"
              >
                <Smile className="h-8 w-8" />
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

          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-full"
          />

          {message.trim() ? (
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 rounded-full"
            >
              <Send className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              className="h-10 w-10 rounded-full"
              onMouseDown={startRecording}
            >
              <Mic className="h-5 w-5" />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
