"use client";

import type React from "react";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  FileText,
  Loader2,
  MapPin,
  MoreVertical,
  Pencil,
  Phone,
  Reply,
  Send,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEncryption } from "@/hooks/use-encryption";
import { useToast } from "@/hooks/use-toast";
import useUserStatus from "@/hooks/use-user-status";
import { useFirebase } from "@/lib/firebase-provider";
import {
  EXTENDED_REACTIONS,
  formatAccuracy,
  formatDateLabel,
  toggleReaction,
} from "@/lib/utils";
import type { Message } from "@/types/message";
import type { User } from "@/types/user";
import normalizeName from "@/utils/normalizename";
import { AudioPreview } from "./audio-preview";
import { CameraDialog } from "./camera-dialog";
import ContactStatus from "./contact-status";
import { EditMessageDialog } from "./edit-message-dialog";
import { ImageViewer } from "./image-viewer";
import { MessageContent } from "./message-content";
import MessageInput from "./message-input";
import { ReactionDisplay } from "./reactions-display";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { UserAvatar } from "./user-avatar";
import { UserProfilePopup } from "./user-profile-popup";
import VideoPlayer from "./video-message";
import { Story } from "@/types/story";
import { StoryViewer } from "./story/story-viewer";

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [decryptedMessages, setDecryptedMessages] = useState<
    Record<string, string>
  >({});
  const [decryptedLocationMessages, setDecryptedLocationMessages] = useState<
    Record<string, { lat: number; lng: number }>
  >({});
  const [expanded, setExpanded] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingMessage, setEditingMessage] = useState<{
    msg: Message;
    initialText: string;
  } | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const isSelectionMode = selectedIds.size > 0;
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    message: Message;
  } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  // const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const { isOnline, isBlocked, isUserBlockedByContact } = useUserStatus(
    contact.uid,
    currentUser?.uid
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const { theme } = useTheme();
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const { toast } = useToast();
  const [accuracy, setAccuracy] = useState(0);
  const {
    isInitialized,
    encryptMessageForContact,
    decryptMessageFromContact,
    encryptFile,
  } = useEncryption(currentUser);
  // const [decryptedImageCache, setDecryptedImageCache] = useState<
  //   Record<string, string>
  // >({});
  const [previewFile, setPreviewFile] = useState<{
    file: File;
    type: "image" | "video" | "file" | "audio";
    preview: string;
    size?: number;
    duration?: number;
  } | null>(null);
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  // const [audioPreviewDuration, setAudioPreviewDuration] = useState<
  //   number | null
  // >(null);
  const [contactIsTyping, setContactIsTyping] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  // const prevCount = useRef(0);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isCameraDialogOpen, setIsCameraDialogOpen] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const isCanceledRef = useRef<boolean>(null);
  const [currentViewingImage, setCurrentViewingImage] = useState<{
    url: string;
    messageId: string;
    fileName?: string;
    isEncrypted: boolean;
    encryptedKey?: string;
    encryptedKeyForSelf?: string;
    iv?: string;
    fileType?: string;
    isSender: boolean;
    currentUserId: string;
    text: string;
  } | null>(null);
  const [viewingStory, setViewingStory] = useState<{
    story: Story;
    user: User;
  } | null>(null);
  const [isLoadingStory, setIsLoadingStory] = useState(false);

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

  const toggleSelection = (messageId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const handleContextMenu = (e: React.MouseEvent, msg: Message) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, message: msg });
  };

  const handleTouchStart = (e: React.TouchEvent, msg: Message) => {
    const touch = e.touches[0];
    longPressTimerRef.current = setTimeout(() => {
      setContextMenu({ x: touch.clientX, y: touch.clientY, message: msg });
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  };

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  const startSelection = (messageId: string) => {
    setSelectedIds(new Set([messageId]));
    setContextMenu(null);
  };

  const cancelSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const deletableIds = Array.from(selectedIds).filter((id) => {
      const msg = messages.find((m) => m.id === id);
      return msg && msg.senderId === currentUser.uid;
    });

    if (deletableIds.length === 0) {
      toast({
        variant: "destructive",
        title: "Action Denied",
        description: "You can only delete your own messages.",
      });
      setIsDeleteAlertOpen(false);
      return;
    }

    try {
      const batch = writeBatch(db);

      deletableIds.forEach((id) => {
        const msgRef = doc(db, "messages", id);
        batch.delete(msgRef);
      });

      await batch.commit();

      const skippedCount = selectedIds.size - deletableIds.length;
      const descText =
        skippedCount > 0
          ? `Deleted ${deletableIds.length} messages. (${skippedCount} others were skipped)`
          : `Successfully deleted ${deletableIds.length} messages.`;

      toast({
        title: "Deleted",
        description: descText,
      });

      setSelectedIds(new Set());
      setIsDeleteAlertOpen(false);
    } catch (error) {
      console.error("Bulk delete failed:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete messages.",
      });
    }
  };

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
      // if (prevCount.current > messageList.length) {
      //   scrollToBottom();
      // }
      // prevCount.current = messageList.length;

      setTimeout(() => {
        scrollToBottom();
      }, 100);
    });

    return () => unsubscribe();
  }, [currentUser, contact, db]);

  useEffect(() => {
    if (!isInitialized || messages.length === 0) return;

    const decryptMessages = async () => {
      const newDecryptedMessages = { ...decryptedMessages };
      const newDecryptedLocationMessages = { ...decryptedLocationMessages };

      let hasNewDecryptions = false;

      for (const msg of messages) {
        const isSender = msg.senderId === currentUser.uid;

        if (
          msg.isEncrypted &&
          msg.encryptedText &&
          msg.encryptedKey &&
          msg.iv &&
          !newDecryptedMessages[msg.id]
        ) {
          try {
            const decrypted = await decryptMessageFromContact(
              msg.encryptedText,
              msg.encryptedKey,
              msg.encryptedKeyForSelf,
              msg.iv,
              isSender
            );

            newDecryptedMessages[msg.id] = decrypted;
            hasNewDecryptions = true;
          } catch (err) {
            console.error(`Error decrypting message ${msg.id}:`, err);
            newDecryptedMessages[msg.id] = "Locked message";
            hasNewDecryptions = true;
          }
        }

        if (
          msg.type === "location" &&
          msg.encryptedLocation &&
          msg.locationKey &&
          msg.locationIv &&
          !newDecryptedLocationMessages[msg.id]
        ) {
          try {
            const decryptedJSON = await decryptMessageFromContact(
              msg.encryptedLocation,
              msg.locationKey,
              msg.locationKeyForSelf,
              msg.locationIv,
              isSender
            );

            newDecryptedLocationMessages[msg.id] = JSON.parse(decryptedJSON);
            hasNewDecryptions = true;
          } catch (err) {
            console.error(`Error decrypting location ${msg.id}:`, err);
          }
        }

        if (
          msg.replyTo &&
          msg.replyTo.isEncrypted &&
          msg.replyTo.encryptedText &&
          msg.replyTo.encryptedKey &&
          msg.replyTo.iv &&
          !newDecryptedMessages[`reply_${msg.id}`]
        ) {
          try {
            const replyIsSender = msg.replyTo.senderId === currentUser.uid;

            const decryptedReply = await decryptMessageFromContact(
              msg.replyTo.encryptedText,
              msg.replyTo.encryptedKey,
              msg.replyTo.encryptedKeyForSelf,
              msg.replyTo.iv,
              replyIsSender
            );

            newDecryptedMessages[`reply_${msg.id}`] = decryptedReply;
            hasNewDecryptions = true;
          } catch (err) {
            console.error(`Error decrypting reply ${msg.id}:`, err);

            newDecryptedMessages[`reply_${msg.id}`] =
              "Locked message - unable to decrypt";
            hasNewDecryptions = true;
          }
        }
      }

      if (hasNewDecryptions) {
        setDecryptedMessages(newDecryptedMessages);
        setDecryptedLocationMessages(newDecryptedLocationMessages);
      }
    };

    decryptMessages();
  }, [
    messages,
    isInitialized,
    currentUser,
    decryptedMessages,
    decryptedLocationMessages,
    decryptMessageFromContact,
  ]);

  const handleViewStory = async (storyId: string) => {
    if (isLoadingStory) return;
    setIsLoadingStory(true);

    try {
      const storyRef = doc(db, "stories", storyId);
      const storySnap = await getDoc(storyRef);

      if (!storySnap.exists()) {
        toast({
          variant: "destructive",
          title: "Story unavailable",
          description: "This story has been deleted or expired.",
        });
        return;
      }

      const storyData = { id: storySnap.id, ...storySnap.data() } as Story;

      let storyUser: User | null = null;

      if (storyData.userId === currentUser.uid) {
        storyUser = currentUser;
      } else if (storyData.userId === contact.uid) {
        storyUser = contact;
      } else {
        const userRef = doc(db, "users", storyData.userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          storyUser = userSnap.data() as User;
        }
      }

      if (storyUser) {
        setViewingStory({ story: storyData, user: storyUser });
      } else {
        toast({
          variant: "destructive",
          title: "User not found",
          description: "Could not retrieve story owner details.",
        });
      }
    } catch (error) {
      console.error("Error fetching story:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to open story.",
      });
    } finally {
      setIsLoadingStory(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleShareLocation = async () => {
    if (isBlocked) {
      toast({
        variant: "destructive",
        title: "Cannot share location",
        description:
          "You cannot share location with this user because one of you has blocked the other.",
      });
      return;
    }

    setIsGettingLocation(true);

    try {
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const accuracy = position.coords.accuracy;
            setAccuracy(accuracy);

            if (accuracy <= 20) {
              setLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              });
              setIsLocationDialogOpen(true);
              resolve(position);
            } else {
              setLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              });
              setIsLocationDialogOpen(true);

              toast({
                variant: accuracy <= 80 ? "default" : "destructive",
                title:
                  accuracy <= 80
                    ? "Location might be a bit off"
                    : "Location accuracy too low",
                description: `Current accuracy: ${accuracy}m. You can still share the location, but it might not be precise.`,
              });

              resolve(position);
            }
          },
          (error) => {
            console.error("Error getting location:", error);
            toast({
              variant: "destructive",
              title: "Location access denied",
              description:
                "Could not access your location. Please check your permissions.",
            });
            reject(error);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      });
    } catch (error) {
      console.log("Error:", error);
    } finally {
      setIsGettingLocation(false);
    }
  };

  const sendLocationMessage = async () => {
    if (!location || !currentUser || !contact) return;

    try {
      const chatId = [currentUser.uid, contact.uid].sort().join("_");
      const locationText = caption || "📍 Location";

      let replyToData = null;
      if (replyTo) {
        const replyText =
          decryptedMessages[replyTo.id] ||
          replyTo.text ||
          "[Encrypted message]";

        if (isInitialized) {
          try {
            const encryptedReplyData = await encryptMessageForContact(
              replyText,
              contact.uid
            );

            replyToData = {
              id: replyTo.id,
              senderId: replyTo.senderId,
              isEncrypted: true,
              encryptedText: encryptedReplyData.encryptedText,
              encryptedKey: encryptedReplyData.encryptedKeyForContact,
              encryptedKeyForSelf: encryptedReplyData.encryptedKeyForSelf,
              iv: encryptedReplyData.iv,
            };
          } catch (error) {
            console.error("Error encrypting reply text:", error);
            replyToData = {
              id: replyTo.id,
              text: replyText,
              senderId: replyTo.senderId,
              isEncrypted: false,
            };
          }
        } else {
          replyToData = {
            id: replyTo.id,
            text: replyText,
            senderId: replyTo.senderId,
            isEncrypted: false,
          };
        }
      }

      let messageData: any = {
        chatId,
        senderId: currentUser.uid,
        receiverId: contact.uid,
        timestamp: new Date().toISOString(),
        isSeen: false,
        type: "location",
        accuracy,
        replyTo: replyToData,
      };

      if (isInitialized) {
        // @Deprecated: Using Promise.all to encrypt captions and coordinates in parallel
        // const encryptedData = await encryptMessageForContact(
        //   locationText,
        //   contact.uid
        // );
        // const encryptedCoordsData = await encryptMessageForContact(
        //   coordsPayload,
        //   contact.uid
        // )

        const coordsPayload = JSON.stringify({
          lat: location.lat,
          lng: location.lng,
        });

        const [encryptedCaptionsData, encryptedLocationData] =
          await Promise.all([
            encryptMessageForContact(locationText, contact.uid),
            encryptMessageForContact(coordsPayload, contact.uid),
          ]);

        messageData = {
          ...messageData,
          isEncrypted: true,
          encryptedText: encryptedCaptionsData.encryptedText,
          encryptedKey: encryptedCaptionsData.encryptedKeyForContact,
          encryptedKeyForSelf: encryptedCaptionsData.encryptedKeyForSelf,
          iv: encryptedCaptionsData.iv,
          text: "📍 Location",

          encryptedLocation: encryptedLocationData.encryptedText,
          locationKey: encryptedLocationData.encryptedKeyForContact,
          locationKeyForSelf: encryptedLocationData.encryptedKeyForSelf,
          locationIv: encryptedLocationData.iv,

          location: null,
        };

        //   if (encryptedData.isEncrypted) {
        //     messageData = {
        //       ...messageData,
        //       isEncrypted: true,
        //       encryptedText: encryptedData.encryptedText,
        //       encryptedKey: encryptedData.encryptedKeyForContact,
        //       encryptedKeyForSelf: encryptedData.encryptedKeyForSelf,
        //       iv: encryptedData.iv,
        //     };
        //   } else {
        //     messageData.isEncrypted = false;
        //     messageData.text = locationText;
        //   }
      } else {
        messageData.isEncrypted = false;
        messageData.text = locationText;
        messageData.location = {
          lat: location.lat,
          lng: location.lng,
        };
      }

      await addDoc(collection(db, "messages"), messageData);

      setIsLocationDialogOpen(false);
      setLocation(null);
      setReplyTo(null);
    } catch (error) {
      console.error("Error sending location:", error);
      toast({
        variant: "destructive",
        title: "Failed to send location",
        description: "Failed to send location. Please try again.",
      });
    }
  };

  const handleSendCapture = async (blob: Blob, caption?: string) => {
    if (!currentUser || !contact) return;

    if (isBlocked) {
      toast({
        variant: "destructive",
        title: "Cannot send image",
        description:
          "You cannot send images to this user because one of you has blocked the other.",
      });
      return;
    }

    setIsUploading(true);
    try {
      const chatId = [currentUser.uid, contact.uid].sort().join("_");
      const imageFile = new File([blob], `camera_captured_${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      let fileToUpload = imageFile;
      let encryptionData = {
        isEncrypted: false,
        encryptedKey: "",
        encryptedKeyForSelf: "",
        iv: "",
      };

      if (isInitialized) {
        try {
          const encryptedFileData = await encryptFile(imageFile, contact.uid);

          if (encryptedFileData.isEncrypted) {
            fileToUpload = new File(
              [encryptedFileData.encryptedFile],
              imageFile.name,
              {
                type: imageFile.type,
                lastModified: Date.now(),
              }
            );
            encryptionData = {
              isEncrypted: true,
              encryptedKey: encryptedFileData.encryptedKey,
              encryptedKeyForSelf: encryptedFileData.encryptedKeyForSelf,
              iv: encryptedFileData.iv,
            };
          }
        } catch (error) {
          console.error("Error encrypting camera image:", error);
        }
      }

      const encryptedFilename = encryptionData.isEncrypted
        ? `encrypted_camera_captured_${Date.now()}.jpg`
        : `camera_captured_${Date.now()}.jpg`;

      const fileRef = ref(
        storage,
        `/chats/${chatId}/${btoa(encryptedFilename)}`
      );

      await uploadBytes(fileRef, fileToUpload);

      const downloadURL = await getDownloadURL(fileRef);
      const captionText = caption || "Photo";

      let replyToData = null;
      if (replyTo) {
        const replyText =
          decryptedMessages[replyTo.id] ||
          replyTo.text ||
          "[Encrypted message]";

        if (isInitialized) {
          try {
            const encryptedReplyData = await encryptMessageForContact(
              replyText,
              contact.uid
            );

            replyToData = {
              id: replyTo.id,
              senderId: replyTo.senderId,
              isEncrypted: true,
              encryptedText: encryptedReplyData.encryptedText,
              encryptedKey: encryptedReplyData.encryptedKeyForContact,
              encryptedKeyForSelf: encryptedReplyData.encryptedKeyForSelf,
              iv: encryptedReplyData.iv,
            };
          } catch (error) {
            console.error("Error encrypting reply text:", error);
            replyToData = {
              id: replyTo.id,
              text: replyText,
              senderId: replyTo.senderId,
              isEncrypted: false,
            };
          }
        } else {
          replyToData = {
            id: replyTo.id,
            text: replyText,
            senderId: replyTo.senderId,
            isEncrypted: false,
          };
        }
      }

      let messageData: any = {
        chatId,
        senderId: currentUser.uid,
        receiverId: contact.uid,
        timestamp: new Date().toISOString(),
        isSeen: false,
        fileURL: downloadURL,
        fileName: imageFile.name,
        fileType: "image/jpeg",
        type: "image",
        replyTo: replyToData,
        fileIsEncrypted: encryptionData.isEncrypted,
        fileEncryptedKey: encryptionData.encryptedKey,
        fileEncryptedKeyForSelf: encryptionData.encryptedKeyForSelf,
        fileIv: encryptionData.iv,
      };

      if (isInitialized) {
        const encryptedData = await encryptMessageForContact(
          captionText,
          contact.uid
        );

        if (encryptedData.isEncrypted) {
          messageData = {
            ...messageData,
            isEncrypted: true,
            encryptedText: encryptedData.encryptedText,
            encryptedKey: encryptedData.encryptedKeyForContact,
            encryptedKeyForSelf: encryptedData.encryptedKeyForSelf,
            iv: encryptedData.iv,
          };
        } else {
          messageData.isEncrypted = false;
          messageData.text = captionText;
        }
      } else {
        messageData.isEncrypted = false;
        messageData.text = captionText;
      }

      await addDoc(collection(db, "messages"), messageData);
      setReplyTo(null);
    } catch (error) {
      console.error("Error sending camera image:", error);
      toast({
        variant: "destructive",
        title: "Failed to send image",
        description: "Failed to send camera image. Please try again.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const sendMessage = async (message: string) => {
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
    const messageText = message.trim() || (replyTo ? "" : "👍");

    try {
      let replyToData = null;
      if (replyTo) {
        const replyText =
          decryptedMessages[replyTo.id] ||
          replyTo.text ||
          "[Encrypted message]";

        if (isInitialized) {
          try {
            const encryptedReplyData = await encryptMessageForContact(
              replyText,
              contact.uid
            );

            replyToData = {
              id: replyTo.id,
              senderId: replyTo.senderId,
              isEncrypted: true,
              encryptedText: encryptedReplyData.encryptedText,
              encryptedKey: encryptedReplyData.encryptedKeyForContact,
              encryptedKeyForSelf: encryptedReplyData.encryptedKeyForSelf,
              iv: encryptedReplyData.iv,
            };
          } catch (error) {
            console.error("Error encrypting reply text:", error);
            replyToData = {
              id: replyTo.id,
              text: replyText,
              senderId: replyTo.senderId,
              isEncrypted: false,
            };
          }
        } else {
          replyToData = {
            id: replyTo.id,
            text: replyText,
            senderId: replyTo.senderId,
            isEncrypted: false,
          };
        }
      }

      let messageData: any = {
        chatId,
        senderId: currentUser.uid,
        receiverId: contact.uid,
        timestamp: new Date().toISOString(),
        isSeen: false,
        replyTo: replyToData,
        type: "text",
      };

      if (isInitialized) {
        const encryptedData = await encryptMessageForContact(
          messageText,
          contact.uid
        );

        if (encryptedData.isEncrypted) {
          messageData = {
            ...messageData,
            isEncrypted: true,
            encryptedText: encryptedData.encryptedText,
            encryptedKey: encryptedData.encryptedKeyForContact,
            encryptedKeyForSelf: encryptedData.encryptedKeyForSelf,
            iv: encryptedData.iv,
          };
        } else {
          messageData.isEncrypted = false;
          messageData.text = messageText;
        }
      } else {
        messageData.isEncrypted = false;
        messageData.text = messageText;
      }

      await addDoc(collection(db, "messages"), messageData);

      if (contactIsTyping) {
        setContactIsTyping(false);
        updateDoc(doc(db, "typingStatus", chatId), {
          userId: currentUser.uid,
          isTyping: false,
          timestamp: new Date().toISOString(),
        }).catch(console.error);
      }

      setReplyTo(null);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "video" | "file" | "audio"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) return;

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

      const audio = new Audio(url);
      audio.onloadedmetadata = () => {
        // setAudioPreviewDuration(Math.round(audio.duration));
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

    setCaption("");
  };

  const handleSendMedia = async () => {
    if (!previewFile || !currentUser || !contact) return;

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

      let fileToUpload = previewFile.file;
      let encryptionData = {
        isEncrypted: false,
        encryptedKey: "",
        encryptedKeyForSelf: "",
        iv: "",
      };

      if (isInitialized) {
        try {
          const encryptedFileData = await encryptFile(
            previewFile.file,
            contact.uid
          );

          if (encryptedFileData.isEncrypted) {
            fileToUpload = new File(
              [encryptedFileData.encryptedFile],
              previewFile.file.name,
              {
                type: previewFile.file.type,
                lastModified: Date.now(),
              }
            );
            encryptionData = {
              isEncrypted: true,
              encryptedKey: encryptedFileData.encryptedKey,
              encryptedKeyForSelf: encryptedFileData.encryptedKeyForSelf,
              iv: encryptedFileData.iv,
            };
          }
        } catch (error) {
          console.error("Error encrypting file:", error);
        }
      }

      const encryptedFilename = encryptionData.isEncrypted
        ? `tpy_encrypted_media_${Date.now()}`
        : `telepaty_media_${Date.now()}`;

      const fileRef = ref(
        storage,
        `chats/${chatId}/${btoa(encryptedFilename)}`
      );

      await uploadBytes(fileRef, fileToUpload);

      const downloadURL = await getDownloadURL(fileRef);
      const captionText = caption || previewFile.file.name;

      let replyToData = null;
      if (replyTo) {
        const replyText =
          decryptedMessages[replyTo.id] ||
          replyTo.text ||
          "[Encrypted message]";

        if (isInitialized) {
          try {
            const encryptedReplyData = await encryptMessageForContact(
              replyText,
              contact.uid
            );

            replyToData = {
              id: replyTo.id,
              senderId: replyTo.senderId,
              isEncrypted: true,
              encryptedText: encryptedReplyData.encryptedText,
              encryptedKey: encryptedReplyData.encryptedKeyForContact,
              encryptedKeyForSelf: encryptedReplyData.encryptedKeyForSelf,
              iv: encryptedReplyData.iv,
            };
          } catch (error) {
            console.error("Error encrypting reply text:", error);
            replyToData = {
              id: replyTo.id,
              text: replyText,
              senderId: replyTo.senderId,
              isEncrypted: false,
            };
          }
        } else {
          replyToData = {
            id: replyTo.id,
            text: replyText,
            senderId: replyTo.senderId,
            isEncrypted: false,
          };
        }
      }

      let messageData: any = {
        chatId,
        senderId: currentUser.uid,
        receiverId: contact.uid,
        timestamp: new Date().toISOString(),
        fileURL: downloadURL,
        fileName: previewFile.file.name,
        fileType: previewFile.file.type,
        size: previewFile.file.size,
        type: previewFile.type,
        ...(previewFile.type === "audio" && {
          duration: previewFile.duration || 0,
        }),
        replyTo: replyToData,
        fileIsEncrypted: encryptionData.isEncrypted,
        fileEncryptedKey: encryptionData.encryptedKey,
        fileEncryptedKeyForSelf: encryptionData.encryptedKeyForSelf,
        fileIv: encryptionData.iv,
      };

      if (isInitialized) {
        const encryptedData = await encryptMessageForContact(
          captionText,
          contact.uid
        );

        if (encryptedData.isEncrypted) {
          messageData = {
            ...messageData,
            isEncrypted: true,
            encryptedText: encryptedData.encryptedText,
            encryptedKey: encryptedData.encryptedKeyForContact,
            encryptedKeyForSelf: encryptedData.encryptedKeyForSelf,
            iv: encryptedData.iv,
          };
        } else {
          messageData.isEncrypted = false;
          messageData.text = captionText;
        }
      } else {
        messageData.isEncrypted = false;
        messageData.text = captionText;
      }

      await addDoc(collection(db, "messages"), messageData);

      setPreviewFile(null);
      setCaption("");
      setReplyTo(null);
      // setAudioPreviewDuration(null);
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload file. Please try again.",
      });
    } finally {
      setIsUploading(false);

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

    if (isRecording) return;

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
        if (isCanceledRef.current) {
          isCanceledRef.current = false;
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const finalDuration = Math.floor(
          (Date.now() - (startTimeRef.current || Date.now())) / 1000
        );
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        try {
          await sendAudioMessage(audioBlob, finalDuration);
        } catch (err) {
          console.error("Error sending audio:", err);
        }
        // setAudioChunks([]);
        setIsRecording(false);
        setRecordingTime(0);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.onerror = () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      };

      setMediaRecorder(recorder);
      // setAudioChunks([]);
      recorder.start();
      setIsRecording(true);

      startTimeRef.current = Date.now();
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime(
          Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000)
        );
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
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      isCanceledRef.current = true;
      mediaRecorder.stop();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setIsRecording(false);
      setRecordingTime(0);
      // setAudioChunks([]);
    }
  };

  const sendAudioMessage = async (audioBlob: Blob, finalDuration: number) => {
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

      const audioFile = new File([audioBlob], `audio_${Date.now()}.webm`, {
        type: "audio/webm",
      });

      let fileToUpload = audioFile;
      let encryptionData = {
        isEncrypted: false,
        encryptedKey: "",
        encryptedKeyForSelf: "",
        iv: "",
      };

      if (isInitialized) {
        try {
          const encryptedFileData = await encryptFile(audioFile, contact.uid);

          if (encryptedFileData.isEncrypted) {
            fileToUpload = new File(
              [encryptedFileData.encryptedFile],
              audioFile.name,
              {
                type: audioFile.type,
                lastModified: Date.now(),
              }
            );
            encryptionData = {
              isEncrypted: true,
              encryptedKey: encryptedFileData.encryptedKey,
              encryptedKeyForSelf: encryptedFileData.encryptedKeyForSelf,
              iv: encryptedFileData.iv,
            };
          }
        } catch (error) {
          console.error("Error encrypting audio:", error);
        }
      }

      const encryptedFilename = encryptionData.isEncrypted
        ? `encrypted_audio_${Date.now()}.webm`
        : `audio_${Date.now()}.webm`;

      const fileRef = ref(storage, `chats/${chatId}/${encryptedFilename}`);

      await uploadBytes(fileRef, fileToUpload);

      const downloadURL = await getDownloadURL(fileRef);
      const captionText = "Audio message";

      let replyToData = null;
      if (replyTo) {
        const replyText =
          decryptedMessages[replyTo.id] || replyTo.text || "Locked Message";

        if (isInitialized) {
          try {
            const encryptedReplyData = await encryptMessageForContact(
              replyText,
              contact.uid
            );

            replyToData = {
              id: replyTo.id,
              senderId: replyTo.senderId,
              isEncrypted: true,
              encryptedText: encryptedReplyData.encryptedText,
              encryptedKey: encryptedReplyData.encryptedKeyForContact,
              encryptedKeyForSelf: encryptedReplyData.encryptedKeyForSelf,
              iv: encryptedReplyData.iv,
            };
          } catch (error) {
            console.error("Error encrypting reply text:", error);
            replyToData = {
              id: replyTo.id,
              text: replyText,
              senderId: replyTo.senderId,
              isEncrypted: false,
            };
          }
        } else {
          replyToData = {
            id: replyTo.id,
            text: replyText,
            senderId: replyTo.senderId,
            isEncrypted: false,
          };
        }
      }

      let messageData: any = {
        chatId,
        senderId: currentUser.uid,
        receiverId: contact.uid,
        timestamp: new Date().toISOString(),
        fileURL: downloadURL,
        fileName: "Audio message",
        fileType: "audio/webm",
        type: "audio",
        duration: finalDuration,
        replyTo: replyToData,
        fileIsEncrypted: encryptionData.isEncrypted,
        fileEncryptedKey: encryptionData.encryptedKey,
        fileEncryptedKeyForSelf: encryptionData.encryptedKeyForSelf,
        fileIv: encryptionData.iv,
      };

      if (isInitialized) {
        const encryptedData = await encryptMessageForContact(
          captionText,
          contact.uid
        );

        if (encryptedData.isEncrypted) {
          messageData = {
            ...messageData,
            isEncrypted: true,
            encryptedText: encryptedData.encryptedText,
            encryptedKey: encryptedData.encryptedKeyForContact,
            encryptedKeyForSelf: encryptedData.encryptedKeyForSelf,
            iv: encryptedData.iv,
          };
        } else {
          messageData.isEncrypted = false;
          messageData.text = captionText;
        }
      } else {
        messageData.isEncrypted = false;
        messageData.text = captionText;
      }

      await addDoc(collection(db, "messages"), messageData);

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

  const handleSaveEdit = async (messageId: string, newText: string) => {
    setIsSavingEdit(true);

    try {
      const messageRef = doc(db, "messages", messageId);

      let updateData: any = {
        isEdited: true,
        updatedAt: new Date().toISOString(),
      };

      if (isInitialized && currentUser && contact) {
        const encryptedData = await encryptMessageForContact(
          newText,
          contact.uid
        );

        if (encryptedData.isEncrypted) {
          updateData = {
            ...updateData,
            encryptedText: encryptedData.encryptedText,
            encryptedKey: encryptedData.encryptedKeyForContact,
            encryptedKeyForSelf: encryptedData.encryptedKeyForSelf,
            iv: encryptedData.iv,
            text: "",
          };
        } else {
          updateData.text = newText;
        }
      } else {
        updateData.text = newText;
      }

      await updateDoc(messageRef, updateData);
      if (isInitialized) {
        setDecryptedMessages((prev) => ({
          ...prev,
          [messageId]: newText,
        }));
      }

      toast({ description: "Message updated successfully." });
    } catch (error) {
      console.error("Error updating message:", error);
      toast({
        variant: "destructive",
        description: "Failed to update message.",
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  useEffect(() => {
    if (!currentUser || !contact || messages.length === 0) return;

    const markMessagesAsSeen = async () => {
      try {
        const unreadMessages = messages.filter(
          (msg) => msg.senderId === contact.uid && !msg.isSeen
        );

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

  const imageMessages = useMemo(() => {
    return messages.filter((msg) => msg.type === "image");
  }, [messages]);

  const handleOpenImageViewer = (messageId: string) => {
    const messageIndex = imageMessages.findIndex((msg) => msg.id === messageId);
    if (messageIndex === -1) return;

    const message = imageMessages[messageIndex];
    const decryptedCaption = getMessageText(message);
    setCurrentImageIndex(messageIndex);
    // const cachedBlobUrl = decryptedImageCache[message.id] || null;
    setCurrentViewingImage({
      url: message.fileURL || "",
      messageId: message.id,
      fileName: message.fileName,
      isEncrypted: message.fileIsEncrypted || false,
      encryptedKey: message.fileEncryptedKey || "",
      encryptedKeyForSelf: message.fileEncryptedKeyForSelf || "",
      iv: message.fileIv || "",
      fileType: message.fileType || "image/jpeg",
      isSender: message.senderId === currentUser.uid,
      currentUserId: currentUser.uid,
      text: decryptedCaption || message.text || message.fileName || "",
    });
    setIsImageViewerOpen(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const getMessageText = useCallback(
    (msg: Message) => {
      return msg.isEncrypted && decryptedMessages[msg.id]
        ? decryptedMessages[msg.id]
        : msg.text || "";
    },
    [decryptedMessages]
  );

  return (
    <div className="flex flex-1 flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b dark:bg-[#1c1c1d]">
        {isSelectionMode ? (
          <div className="flex items-center justify-between w-full animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={cancelSelection}>
                <X className="h-6 w-6" />
              </Button>
              <span className="font-semibold text-lg">
                {selectedIds.size} Selected
              </span>
            </div>

            <Button
              variant="destructive"
              size="icon"
              onClick={() => setIsDeleteAlertOpen(true)}
              className="rounded-full w-10 h-10"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileMenuOpen?.(true)}
                className="md:hidden cursor-pointer"
              >
                <ArrowLeft className="h-6 w-6 dark:text-white text-black" />
              </button>

              <UserAvatar
                user={contact}
                isBlocked={isBlocked || isUserBlockedByContact}
              />
              <div>
                <div className="flex items-center gap-1">
                  <p className="font-medium">
                    {normalizeName(contact.displayName)}
                  </p>
                  {contact.isVerified &&
                    !isBlocked &&
                    !isUserBlockedByContact &&
                    !contact.isAdmin && (
                      <svg
                        aria-label="Verified"
                        fill="rgb(0, 149, 246)"
                        height="15"
                        role="img"
                        viewBox="0 0 40 40"
                        width="15"
                      >
                        <title>Verified</title>
                        <path
                          d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z"
                          fillRule="evenodd"
                        ></path>
                      </svg>
                    )}
                  {contact.isAdmin && !isBlocked && !isUserBlockedByContact && (
                    <svg
                      aria-label="Afiliated Account"
                      height="15"
                      width="15"
                      role="img"
                      viewBox="0 0 40 40"
                    >
                      <defs>
                        <linearGradient
                          id="metallicGold-verified-icon"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop offset="0%" stopColor="#fff7b0" />
                          <stop offset="25%" stopColor="#ffd700" />
                          <stop offset="50%" stopColor="#ffa500" />
                          <stop offset="75%" stopColor="#ffd700" />
                          <stop offset="100%" stopColor="#fff7b0" />
                        </linearGradient>
                      </defs>
                      <title>Affiliated Account</title>
                      <path
                        d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z"
                        fill="url(#metallicGold-verified-icon)"
                        fillRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ContactStatus
                    isBlocked={isBlocked || isUserBlockedByContact}
                    contact={contact}
                    onlineStatus={isOnline}
                    isAdmin={contact.isAdmin}
                    isVerified={contact.isVerified}
                    contactIsTyping={contactIsTyping}
                  />
                </div>
              </div>
            </div>
            <div className="flex md:gap-2 gap-1">
              <Button
                variant="ghost"
                size="icon"
                disabled={isBlocked || isUserBlockedByContact}
                title="Start voice call"
                onClick={() => {
                  if (isOnline && !isBlocked && !isUserBlockedByContact) {
                    initiateCall(false);
                  } else {
                    toast({
                      variant: "destructive",
                      title: "Cannot start call",
                      description: "User is offline.",
                    });
                  }
                }}
              >
                <Phone className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Start video call"
                disabled={isBlocked || isUserBlockedByContact}
                onClick={() => {
                  if (isOnline && !isBlocked && !isUserBlockedByContact) {
                    initiateCall(true);
                  } else {
                    toast({
                      variant: "destructive",
                      title: "Cannot start call",
                      description: "User is offline.",
                    });
                  }
                }}
              >
                <Video className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Open user profile"
                onClick={() => setIsUserProfileOpen(true)}
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </div>
          </>
        )}
      </div>

      {isBlocked ||
        (isUserBlockedByContact && (
          <div className="px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-center">
            You cannot send messages because one of you has blocked the other.
          </div>
        ))}

      <div
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-[#cbd5e1] scrollbar-track-[#f3f4f6] dark:scrollbar-thumb-[#4e4e4e] dark:scrollbar-track-[#1e1e1e]"
        style={{
          backgroundImage: `url("${
            theme === "dark" ||
            (theme === "system" &&
              typeof window !== "undefined" &&
              window.matchMedia("(prefers-color-scheme: dark)").matches)
              ? "/tpy_chat_bg.jpg"
              : "/tpy_chat_bg_l.jpg"
          }")`,
        }}
      >
        <div className="mb-3">
          <div className="bg-yellow-100 dark:bg-yellow-900/20 p-2 rounded-md text-center">
            <p className="md:text-sm text-[11px] leading-4 text-yellow-800 dark:text-yellow-200">
              This conversation is protected by{" "}
              <a
                href="https://en.wikipedia.org/wiki/End-to-end_encryption"
                className="underline"
                target="_blank"
                rel="noreferrer"
              >
                end-to-end
              </a>{" "}
              encryption. Do not clear cookies or website data, or you will lose
              access to your messages.
              {expanded && (
                <>
                  {" "}
                  If you switch browsers, you will lose access to your previous
                  messages. Please understand that I try to keep your data as
                  safe as possible.
                </>
              )}{" "}
              <span
                className="underline cursor-pointer"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? "Read less" : "Read more"}
              </span>
            </p>
          </div>
        </div>

        {messages.map((msg, index) => {
          const isSender = msg.senderId === currentUser.uid;
          const isFirstInSequence =
            index === 0 || messages[index - 1].senderId !== msg.senderId;

          const cornerStyle = isFirstInSequence
            ? isSender
              ? "rounded-tr-none"
              : "rounded-tl-none"
            : "";

          const isSelected = selectedIds.has(msg.id);

          const interactionProperty = isSelectionMode
            ? { onClick: () => toggleSelection(msg.id) }
            : {
                onContextMenu: (e: any) => handleContextMenu(e, msg),
                onTouchStart: (e: any) => handleTouchStart(e, msg),
                onTouchEnd: handleTouchEnd,
                onTouchMove: handleTouchEnd,
              };

          const marginTop = isFirstInSequence ? "mt-2" : "mt-0.5";
          const dateLabel = formatDateLabel(msg.timestamp);
          const prevDateLabel =
            index > 0 ? formatDateLabel(messages[index - 1].timestamp) : null;
          const showDateHeader = dateLabel !== prevDateLabel;

          return (
            <div key={msg.id} className="flex flex-col w-full">
              {showDateHeader && (
                <div className="flex justify-center my-4 sticky top-2 z-10">
                  <span className="bg-gray-200 dark:bg-[#1f1f1f] text-xs font-medium px-3 py-1 rounded-full text-gray-600 dark:text-gray-300 shadow-sm opacity-90 backdrop-blur-sm border dark:border-white/5">
                    {dateLabel}
                  </span>
                </div>
              )}
              <div
                className={`flex ${
                  msg.senderId === currentUser.uid
                    ? "justify-end"
                    : "justify-start"
                } ${marginTop} _${index + 1}+_`}
              >
                {isSelectionMode && (
                  <div
                    onClick={() => toggleSelection(msg.id)}
                    className={`flex items-center justify-center px-3 cursor-pointer animate-in fade-in zoom-in duration-200 ${
                      isSender ? "order-first" : "order-last"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-indigo-500 border-indigo-500"
                          : "border-gray-400 bg-transparent hover:border-indigo-400"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                  </div>
                )}
                <div
                  {...interactionProperty}
                  className={`relative max-w-[85%] md:max-w-[70%] break-words rounded-lg px-3 py-2 ${cornerStyle} ${
                    msg.senderId === currentUser.uid
                      ? "dark:bg-[#131418] bg-slate-200"
                      : "dark:bg-muted/90 bg-slate-100"
                  }
                     ${
                       isSelected
                         ? "bg-indigo-100 dark:bg-indigo-900/40 ring-2 ring-indigo-500 z-10"
                         : isSender
                         ? "dark:bg-[#131418] bg-slate-200"
                         : "dark:bg-muted bg-slate-100"
                     }
                      ${
                        isSelectionMode ? "cursor-pointer hover:opacity-90" : ""
                      }
                      ${
                        contextMenu?.message?.id === msg.id
                          ? "ring-2 ring-indigo-500/50"
                          : ""
                      } 
                  `}
                  id={msg.id}
                >
                  {isFirstInSequence &&
                    (isSender ? (
                      <div
                        className={`absolute top-0 -right-[12px] w-[12px] h-[15px] bg-slate-200 dark:bg-[#131418] [clip-path:polygon(0_0,100%_0,0_100%)] ${
                          isSelected
                            ? "bg-indigo-100 dark:bg-indigo-900/40 ring-2 ring-indigo-500 z-10"
                            : isSender
                            ? "dark:bg-[#131418] bg-slate-200"
                            : "dark:bg-muted bg-slate-100"
                        }
                      ${
                        isSelectionMode ? "cursor-pointer hover:opacity-90" : ""
                      }
                      ${
                        contextMenu?.message?.id === msg.id
                          ? "ring-2 ring-indigo-500/50"
                          : ""
                      } `}
                      />
                    ) : (
                      <div
                        className={`absolute top-0 -left-[12px] w-[12px] h-[15px] bg-slate-100 dark:bg-muted [clip-path:polygon(0_0,100%_0,100%_100%)] ${
                          isSelected
                            ? "bg-indigo-100 dark:bg-indigo-900/40 ring-2 ring-indigo-500 z-10"
                            : isSender
                            ? "dark:bg-[#131418] bg-slate-200"
                            : "dark:bg-muted bg-slate-100"
                        }
                      ${
                        isSelectionMode ? "cursor-pointer hover:opacity-90" : ""
                      }
                      ${
                        contextMenu?.message?.id === msg.id
                          ? "ring-2 ring-indigo-500/50"
                          : ""
                      } `}
                      />
                    ))}

                  {msg.replyTo && (
                    <a
                      href={"#" + msg.replyTo.id}
                      id={btoa(msg.replyTo.id)}
                      className={`block rounded-md mb-2 p-2 border-l-4 ${
                        msg.senderId === currentUser.uid
                          ? "border-l-blue-500 bg-blue-50 dark:bg-blue-900/30"
                          : "border-l-green-500 bg-green-50 dark:bg-green-900/30"
                      }`}
                    >
                      <div className="text-xs font-semibold mb-1">
                        {msg.replyTo.senderId === currentUser.uid
                          ? "You"
                          : contact.displayName}
                      </div>

                      <div className="truncate text-sm text-slate-700 dark:text-slate-300 max-w-[200px] md:max-w-md">
                        {msg.replyTo.id && decryptedMessages[msg.replyTo.id]
                          ? decryptedMessages[msg.replyTo.id]
                          : msg.replyTo.isEncrypted
                          ? msg.replyTo.encryptedText
                            ? "[Encrypted message]"
                            : msg.replyTo.text || "[Encrypted message]"
                          : msg.replyTo.text || "[Message unavailable]"}
                      </div>
                    </a>
                  )}

                  {msg.replyContext?.type === "story" && (
                    <div
                      className={`flex items-center gap-2 rounded-md mb-2 p-1 border-l-4 overflow-hidden cursor-pointer transition-opacity hover:opacity-80 ${
                        msg.senderId === currentUser.uid
                          ? "border-l-pink-500 bg-pink-50 dark:bg-pink-900/20"
                          : "border-l-purple-500 bg-purple-50 dark:bg-purple-900/20"
                      }`}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleViewStory(msg.replyContext?.storyId as string);
                      }}
                    >
                      <div className="h-12 w-10 bg-black/20 dark:bg-white/10 rounded flex items-center justify-center overflow-hidden shrink-0 relative">
                        {msg.replyContext.mediaType === "video" ? (
                          <video
                            src={msg.replyContext.storyUrl}
                            className="h-full w-full object-cover opacity-80"
                            muted
                            preload="metadata"
                          />
                        ) : msg.replyContext.storyUrl ? (
                          <img
                            src={msg.replyContext.storyUrl}
                            alt="Story"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="text-[8px] p-1 text-center break-words leading-tight">
                            Story Text
                          </div>
                        )}

                        {msg.replyContext.mediaType === "video" && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                            <svg
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="w-4 h-4 text-white drop-shadow-md"
                            >
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col justify-center pr-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                          Status Update
                        </span>
                        <span className="text-xs italic opacity-90 truncate max-w-[150px]">
                          {msg.replyContext.mediaType === "video"
                            ? "Replied to a video"
                            : "Replied to a story"}
                        </span>
                      </div>
                    </div>
                  )}

                  <MessageContent
                    msg={msg}
                    messageText={getMessageText(msg)}
                    currentUserId={currentUser.uid}
                    theme={theme}
                    onImageClick={(messageId) =>
                      handleOpenImageViewer(messageId)
                    }
                    decryptedLocation={decryptedLocationMessages[msg.id]}
                    // setDecryptedImageCache={setDecryptedImageCache}
                  />

                  <ReactionDisplay
                    message={msg}
                    currentUserUid={currentUser.uid}
                  />

                  <div className="flex items-center justify-between text-xs opacity-70 mt-1">
                    <div className="flex items-center">
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {msg.isEdited && (
                        <span className="text-[10px] italic opacity-80">
                          (edited)
                        </span>
                      )}
                      {msg.isBroadcast && (
                        <span className="text-[10px] italic opacity-80">
                          (Broadcast Message)
                        </span>
                      )}
                      {renderSeenIndicator(msg)}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                        >
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
                      <DropdownMenuContent
                        align={isSender ? "end" : "start"}
                        className="w-72"
                      >
                        <div className="p-2">
                          <p className="text-xs text-muted-foreground mb-2 px-1">
                            Reactions
                          </p>

                          <div className="grid grid-cols-7 gap-1 h-32 overflow-y-auto scrollbar-thin pr-1">
                            {EXTENDED_REACTIONS.map((emoji, index) => {
                              const isActive = msg.reactions?.[emoji]?.includes(
                                currentUser.uid
                              );

                              return (
                                <button
                                  key={index}
                                  data-tpy-emoji={emoji}
                                  data-tpy-emoji-index={index}
                                  data-tpy-emoji-name={`reactions._${emoji}_`}
                                  onClick={() =>
                                    toggleReaction(msg, currentUser.uid, emoji)
                                  }
                                  className={`text-xl h-8 w-8 rounded flex items-center justify-center transition-colors hover:bg-accent ${
                                    isActive
                                      ? "bg-indigo-100 dark:bg-indigo-900 border border-indigo-500/50"
                                      : ""
                                  }`}
                                >
                                  {emoji}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <DropdownMenuItem onClick={() => setReplyTo(msg)}>
                          <Reply className="mr-2 h-4 w-4" />
                          Reply
                        </DropdownMenuItem>

                        {msg.senderId === currentUser.uid &&
                          msg.type === "text" && (
                            <DropdownMenuItem
                              onClick={() => {
                                const currentText =
                                  decryptedMessages[msg.id] || msg.text || "";
                                setEditingMessage({
                                  msg: msg,
                                  initialText: currentText,
                                });
                              }}
                              className="cursor-pointer"
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          )}

                        {msg.senderId === currentUser.uid && (
                          <DropdownMenuItem
                            onClick={() => deleteMessage(msg.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {contextMenu && (
        <div className="bg-white dark:bg-[#1f1f1f]/50 rounded-t-md shadow-xl border dark:border-white/10 p-1 flex flex-col min-w-[140px] overflow-hidden">
          <button
            onClick={() => startSelection(contextMenu.message.id)}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-2 text-gray-700 dark:text-gray-200"
          >
            <CheckCircle2 className="h-4 w-4" /> Select Message
          </button>
        </div>
      )}

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
                {replyTo && decryptedMessages[replyTo.id]
                  ? decryptedMessages[replyTo.id]
                  : replyTo?.text || "Locked message"}
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

      <MessageInput
        currentUser={currentUser}
        contact={contact}
        isBlocked={isBlocked || isUserBlockedByContact}
        sendMessage={sendMessage}
        handleFileSelect={handleFileSelect}
        handleShareLocation={handleShareLocation}
        startRecording={startRecording}
        setIsCameraDialogOpen={setIsCameraDialogOpen}
        isGettingLocation={isGettingLocation}
        imageInputRef={imageInputRef}
        videoInputRef={videoInputRef}
        audioInputRef={audioInputRef}
        fileInputRef={fileInputRef}
        isRecording={isRecording}
        isEncryptionEnabled={isInitialized}
      />

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
              Preview your {previewFile?.type} before sending
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {previewFile?.type === "image" && (
              <div className="flex justify-center">
                <div
                  className="relative max-h-60 max-w-full rounded-xl overflow-hidden
        border border-gray-200 dark:border-neutral-800
        bg-gray-50 dark:bg-neutral-900/40
        shadow-sm hover:shadow-md transition-all duration-300
        animate-in fade-in-80 zoom-in-90"
                >
                  <img
                    src={previewFile.preview || "/placeholder.svg"}
                    alt="Preview"
                    className="h-full w-full object-contain rounded-xl"
                  />

                  <div
                    className="absolute inset-0 pointer-events-none bg-gradient-to-t
        from-black/20 via-transparent to-transparent opacity-0 
        group-hover:opacity-100 transition-opacity duration-300"
                  />
                </div>
              </div>
            )}

            {previewFile?.type === "video" && (
              <div className="flex justify-center">
                <div
                  className="relative group max-h-64 max-w-full overflow-hidden rounded-xl
        border border-gray-200 dark:border-neutral-800
        bg-gray-50 dark:bg-neutral-900/40
        shadow-sm transition-all duration-300
        animate-in fade-in-80 zoom-in-90"
                >
                  <VideoPlayer
                    fileURL={previewFile.preview}
                    messageId={String(Math.random() * 100)}
                  />
                </div>
              </div>
            )}

            {previewFile?.type === "audio" && (
              <div
                className="flex flex-col items-center gap-4 p-5 rounded-xl
      bg-white dark:bg-neutral-900
      border border-gray-200 dark:border-neutral-800
      shadow-sm transition-colors animate-in fade-in-80 slide-in-from-bottom-2"
              >
                <div className="relative flex items-center justify-center">
                  <div
                    className="absolute -inset-6 rounded-full bg-gradient-to-tr 
        from-blue-400/20 via-blue-500/10 to-transparent blur-2xl animate-pulse"
                  />

                  <div className="absolute -left-5 top-2 text-blue-400/60 dark:text-blue-500/60 text-lg animate-bounce">
                    🎵
                  </div>

                  <div className="absolute -right-5 bottom-2 text-blue-400/60 dark:text-blue-500/60 text-lg animate-bounce delay-200">
                    🎶
                  </div>

                  <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 shadow-lg shadow-blue-200/30 dark:shadow-blue-900/30">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8 text-blue-600 dark:text-blue-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19V6l-2 2H4v8h3l2 2zm8-3a4 4 0 00-4 4m0-4a4 4 0 014-4"
                      />
                    </svg>
                  </div>
                </div>

                <div className="w-full">
                  <AudioPreview previewFile={previewFile} />
                </div>
              </div>
            )}

            {previewFile?.type === "file" && (
              <div className="flex items-center gap-3 p-4 rounded-xl border bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800 shadow-sm transition-colors">
                <div className="flex-shrink-0">
                  <FileText className="h-10 w-10 text-blue-500 dark:text-blue-400" />
                </div>

                <div className="flex flex-col overflow-hidden">
                  <p className="font-medium text-gray-800 dark:text-gray-100 truncate max-w-[180px]">
                    {previewFile.file.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {previewFile.file.size < 1024 * 1024
                      ? `${(previewFile.file.size / 1024).toFixed(2)} KB`
                      : `${(previewFile.file.size / (1024 * 1024)).toFixed(
                          2
                        )} MB`}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="caption">Caption (optional)</Label>
              <Textarea
                id="caption"
                placeholder="Add a caption..."
                value={caption}
                className="resize-none"
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

      <Dialog
        open={isLocationDialogOpen}
        onOpenChange={setIsLocationDialogOpen}
      >
        <DialogContent className="sm:max-w-md rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl p-0 overflow-hidden">
          <div className="px-6 pt-2 pb-4 border-b border-gray-100 dark:border-neutral-800">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Share Location
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
                Preview your current location before sharing it.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="relative mx-6 mt-4">
            {location ? (
              <div className="relative h-64 w-full overflow-hidden rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm">
                <iframe
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  src={`https://www.google.com/maps?q=${location.lat},${location.lng}&z=15&output=embed`}
                  className="rounded-xl"
                ></iframe>

                <div className="absolute top-2 right-2 flex items-center justify-center w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white shadow-lg">
                  <MapPin className="h-5 w-5" />
                </div>

                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 via-black/10 to-transparent pointer-events-none" />
              </div>
            ) : (
              <div className="flex h-64 w-full items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800/50">
                <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
                  Fetching your location...
                </p>
              </div>
            )}
          </div>

          {location && (
            <div className="flex items-center mt-2 px-6 text-sm font-medium text-indigo-600 dark:text-indigo-400">
              <MapPin className="mr-2 h-5 w-5 text-indigo-500 dark:text-indigo-400" />
              Distance: <span className="ml-1">{formatAccuracy(accuracy)}</span>
            </div>
          )}

          <div className="px-6 mt-2 mb-2 space-y-2">
            <Label
              htmlFor="caption"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Caption (optional)
            </Label>
            <Textarea
              id="caption"
              placeholder="Add a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              className="resize-none rounded-lg border-gray-300 dark:border-neutral-700 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            />
          </div>

          <div className="px-6 py-2 border-t border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900/50 flex justify-end gap-3">
            <Button
              variant="outline"
              className="rounded-lg border-gray-300 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-800"
              onClick={() => setIsLocationDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={sendLocationMessage}
              className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-600 shadow-sm"
            >
              Share Location
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CameraDialog
        open={isCameraDialogOpen}
        onClose={() => setIsCameraDialogOpen(false)}
        onCapture={handleSendCapture}
      />

      <UserProfilePopup
        user={contact}
        currentUser={currentUser}
        initiateCall={initiateCall}
        open={isUserProfileOpen}
        onClose={() => setIsUserProfileOpen(false)}
      />

      {isImageViewerOpen && currentViewingImage && (
        <ImageViewer
          key={currentViewingImage.messageId}
          isOpen={isImageViewerOpen}
          onClose={() => setIsImageViewerOpen(false)}
          currentImage={currentViewingImage}
          images={imageMessages}
          currentIndex={currentImageIndex}
          setCurrentIndex={setCurrentImageIndex}
          setCurrentViewingImage={setCurrentViewingImage}
          currentUser={currentUser}
          // decryptedImageCache={decryptedImageCache}
          getMessageText={getMessageText}
        />
      )}

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="rounded-xl bg-white dark:bg-black/80 border dark:border-white/10 w-[90%] max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Messages?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const myMessagesCount = Array.from(selectedIds).filter(
                  (id) =>
                    messages.find((m) => m.id === id)?.senderId ===
                    currentUser.uid
                ).length;

                const othersCount = selectedIds.size - myMessagesCount;

                if (myMessagesCount === 0) {
                  return "You selected messages that belong to others. You cannot delete them.";
                }

                return (
                  <span>
                    Are you sure? You are about to permanently delete{" "}
                    <span className="font-bold text-red-500">
                      {myMessagesCount} message{myMessagesCount > 1 ? "s" : ""}
                    </span>
                    {othersCount > 0 && (
                      <span className="text-muted-foreground">
                        {" "}
                        ({othersCount} other message{othersCount > 1 ? "s" : ""}{" "}
                        will be ignored)
                      </span>
                    )}
                    . This action cannot be undone.
                  </span>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg border-none hover:bg-gray-100 dark:hover:bg-white/10">
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={
                Array.from(selectedIds).some(
                  (id) =>
                    messages.find((m) => m.id === id)?.senderId ===
                    currentUser.uid
                ) === false
              }
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete for Everyone
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditMessageDialog
        isOpen={!!editingMessage}
        message={editingMessage?.msg || null}
        initialText={editingMessage?.initialText || ""}
        onClose={() => setEditingMessage(null)}
        onSave={handleSaveEdit}
      />

      {viewingStory && (
        <StoryViewer
          stories={[viewingStory.story]}
          initialStoryIndex={0}
          onClose={() => setViewingStory(null)}
          users={{ [viewingStory.user.uid]: viewingStory.user }}
        />
      )}
    </div>
  );
}
