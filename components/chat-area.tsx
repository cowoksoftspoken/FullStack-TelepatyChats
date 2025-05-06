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
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  ArrowLeft,
  FileText,
  Globe,
  Loader2,
  Lock,
  MapPin,
  MoreVertical,
  Phone,
  Reply,
  Send,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEncryption } from "@/hooks/use-encryption";
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from "@/lib/firebase-provider";
import type { Message } from "@/types/message";
import type { User } from "@/types/user";
import {
  base64ToArrayBuffer,
  decryptKey,
  importPrivateKey,
} from "@/utils/encryption";
import { AudioMessage } from "./audio-message";
import { CameraDialog } from "./camera-dialog";
import ContactStatus from "./contact-status";
import MapPreview from "./map-preview";
import MessageInput from "./message-input";
import { UserAvatar } from "./user-avatar";
import { UserProfilePopup } from "./user-profile-popup";
import VideoPlayer from "./video-message";
import { YoutubeEmbed } from "./yt-embed";

async function decryptAndCreateBlobUrl(
  fileURL: string,
  fileIsEncrypted: boolean,
  fileEncryptedKey: string,
  fileEncryptedKeyForSelf: string,
  fileIv: string,
  fileType: string,
  isSender: boolean,
  currentUserId: string
) {
  if (!fileIsEncrypted) {
    return fileURL;
  }

  try {
    const encryptedBlob = await fetch(fileURL).then((response) =>
      response.blob()
    );

    const keyData = isSender ? fileEncryptedKeyForSelf : fileEncryptedKey;
    const iv = fileIv;

    if (!keyData || !iv) {
      console.error("Missing encryption data for media");
      return fileURL;
    }

    const privKeyString = localStorage.getItem(
      `encryption_private_key_${currentUserId}`
    );
    if (!privKeyString) {
      console.error("Private key not found in localStorage");
      return fileURL;
    }

    const privateKey = await importPrivateKey(privKeyString);

    const messageKey = await decryptKey(keyData, privateKey);

    const ivArrayBuffer = base64ToArrayBuffer(iv);

    const encryptedBuffer = await encryptedBlob.arrayBuffer();
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: new Uint8Array(ivArrayBuffer),
      },
      messageKey,
      encryptedBuffer
    );

    const decryptedBlob = new Blob([decryptedBuffer], {
      type: fileType || "application/octet-stream",
    });

    return URL.createObjectURL(decryptedBlob);
  } catch (error) {
    console.error("Error decrypting media:", error);
    return fileURL;
  }
}

// type EncryptedReply = {
//   id: string;
//   senderId: string;
//   isEncrypted: true;
//   encryptedText: string;
//   encryptedKey: string;
//   encryptedKeyForSelf?: string;
//   iv: string;
//   text?: string;
// };

// type PlaintextReply = {
//   id: string;
//   text: string;
//   senderId: string;
//   isEncrypted: false;
// };

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
  const [expanded, setExpanded] = useState(false);
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
  const timerIntervalRef = useRef<number | null>(null);
  const { theme } = useTheme();
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const { toast } = useToast();
  const [accuracy, setAccuracy] = useState(0);
  const {
    isInitialized,
    encryptMessageForContact,
    decryptMessageFromContact,
    encryptFile,
  } = useEncryption(currentUser);

  const [previewFile, setPreviewFile] = useState<{
    file: File;
    type: "image" | "video" | "file" | "audio";
    preview: string;
    size?: number;
    duration?: number;
  } | null>(null);
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [audioPreviewDuration, setAudioPreviewDuration] = useState<
    number | null
  >(null);
  const [isTyping, setIsTyping] = useState(false);
  const [contactIsTyping, setContactIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isCameraDialogOpen, setIsCameraDialogOpen] = useState(false);

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

  useEffect(() => {
    if (!currentUser || !contact) return;

    const checkBlockStatus = async () => {
      try {
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

  useEffect(() => {
    if (!isInitialized || messages.length === 0) return;

    const decryptMessages = async () => {
      const newDecryptedMessages: Record<string, string> = {
        ...decryptedMessages,
      };
      let hasNewDecryptions = false;

      for (const msg of messages) {
        if (
          newDecryptedMessages[msg.id] ||
          !msg.isEncrypted ||
          !msg.encryptedText ||
          !msg.encryptedKey ||
          !msg.iv
        ) {
          continue;
        }

        try {
          const isSender = msg.senderId === currentUser.uid;

          const decryptedText = await decryptMessageFromContact(
            msg.encryptedText,
            msg.encryptedKey,
            msg.encryptedKeyForSelf,
            msg.iv,
            isSender
          );

          newDecryptedMessages[msg.id] = decryptedText;
          hasNewDecryptions = true;
        } catch (error) {
          console.error(`Error decrypting message ${msg.id}:`, error);
          newDecryptedMessages[msg.id] =
            "[Encrypted message - unable to decrypt]";
          hasNewDecryptions = true;
        }
      }

      for (const msg of messages) {
        if (
          msg.replyTo &&
          msg.replyTo.isEncrypted &&
          msg.replyTo.encryptedText &&
          msg.replyTo.encryptedKey &&
          msg.replyTo.iv &&
          !newDecryptedMessages[`reply_${msg.id}`]
        ) {
          try {
            const isSender = msg.replyTo.senderId === currentUser.uid;

            const decryptedReplyText = await decryptMessageFromContact(
              msg.replyTo.encryptedText,
              msg.replyTo.encryptedKey,
              msg.replyTo.encryptedKeyForSelf,
              msg.replyTo.iv,
              isSender
            );

            newDecryptedMessages[`reply_${msg.id}`] = decryptedReplyText;
            hasNewDecryptions = true;
          } catch (error) {
            console.error(
              `Error decrypting reply in message ${msg.id}:`,
              error
            );
            newDecryptedMessages[`reply_${msg.id}`] =
              "[Encrypted reply - unable to decrypt]";
            hasNewDecryptions = true;
          }
        }
      }

      if (hasNewDecryptions) {
        setDecryptedMessages(newDecryptedMessages);
      }
    };

    decryptMessages();
  }, [
    messages,
    isInitialized,
    currentUser,
    decryptedMessages,
    decryptMessageFromContact,
  ]);

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
        location: {
          lat: location.lat,
          lng: location.lng,
        },
        replyTo: replyToData,
      };

      if (isInitialized) {
        const encryptedData = await encryptMessageForContact(
          locationText,
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
          messageData.text = locationText;
        }
      } else {
        messageData.isEncrypted = false;
        messageData.text = locationText;
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
              previewFile?.file.name as string,
              {
                type: previewFile?.file.type,
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
              previewFile?.file.name as string,
              {
                type: previewFile?.file.type,
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
        ? `encrypted_${Date.now()}_${previewFile.file.name}`
        : `${Date.now()}_${previewFile.file.name}`;

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

        stream.getTracks().forEach((track) => track.stop());
      };

      setMediaRecorder(recorder);
      setAudioChunks([]);
      recorder.start();
      setIsRecording(true);

      const startTime = Date.now();
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
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
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
              previewFile?.file.name || "encrypted_file",
              {
                type: previewFile?.file.type,
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
        fileName: "Audio message",
        fileType: "audio/webm",
        type: "audio",
        duration: recordingTime,
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
    const messageText =
      msg.isEncrypted && decryptedMessages[msg.id]
        ? decryptedMessages[msg.id]
        : msg.text || "";

    switch (msg.type) {
      case "image":
        return (
          <div className="mt-1">
            <div className="relative">
              {msg.fileIsEncrypted ? (
                <img
                  src="/placeholder.svg"
                  alt={msg.fileName}
                  className="w-full rounded-md max-h-60 object-cover"
                  onLoad={async (e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    try {
                      const decryptedUrl = await decryptAndCreateBlobUrl(
                        msg.fileURL || "",
                        msg.fileIsEncrypted || false,
                        msg.fileEncryptedKey as string,
                        msg.fileEncryptedKeyForSelf as string,
                        msg.fileIv as string,
                        msg.fileType || "image/jpeg",
                        msg.senderId === currentUser.uid,
                        currentUser.uid
                      );

                      if (target) {
                        target.src = decryptedUrl;
                      } else {
                        console.warn(
                          "Target hilang sebelum bisa diubah src-nya 🫠"
                        );
                      }
                    } catch (error) {
                      console.error("Error loading encrypted image:", error);
                    }
                  }}
                  onClick={() => {
                    if (msg.fileIsEncrypted) {
                      toast({
                        title: "Encrypted Image",
                        description:
                          "This image is encrypted and can only be viewed in the chat.",
                      });
                    } else {
                      window.open(msg.fileURL, "_blank");
                    }
                  }}
                />
              ) : (
                <img
                  src={msg.fileURL || "/placeholder.svg"}
                  alt={msg.fileName}
                  className="w-full rounded-md max-h-60 object-cover"
                  onClick={() => window.open(msg.fileURL, "_blank")}
                />
              )}
              {msg.fileIsEncrypted && (
                <div className="absolute top-2 right-2 bg-black/50 rounded-full p-1">
                  <Lock className="h-3 w-3 text-green-500" />
                </div>
              )}
            </div>
            {messageText !== msg.fileName && (
              <div className="mt-1 text-sm flex items-center gap-1">
                <p>{messageText}</p>
              </div>
            )}
          </div>
        );
      case "video":
        return (
          <div className="mt-1 w-full">
            <div className="relative">
              {msg.fileIsEncrypted ? (
                <VideoPlayer
                  fileURL={msg.fileURL as string}
                  onLoad={async (videoElement) => {
                    try {
                      const decryptedUrl = await decryptAndCreateBlobUrl(
                        msg.fileURL || "",
                        msg.fileIsEncrypted || false,
                        msg.fileEncryptedKey as string,
                        msg.fileEncryptedKeyForSelf as string,
                        msg.fileIv as string,
                        msg.fileType || "video/mp4",
                        msg.senderId === currentUser.uid,
                        currentUser.uid
                      );
                      if (videoElement) {
                        videoElement.src = decryptedUrl;
                        videoElement.load();
                      }
                    } catch (error) {
                      console.error("Error loading encrypted video:", error);
                    }
                  }}
                />
              ) : (
                <VideoPlayer fileURL={msg.fileURL || ""} />
              )}
              {msg.fileIsEncrypted && (
                <div className="absolute top-2 right-2 bg-black/50 rounded-full p-1">
                  <Lock className="h-3 w-3 text-green-500" />
                </div>
              )}
            </div>
            {messageText !== msg.fileName && (
              <div className="mt-1 text-sm flex items-center gap-1">
                <p>{messageText}</p>
              </div>
            )}
          </div>
        );
      case "location":
        return (
          <div className="mt-1 w-full">
            <div className="rounded-xl w-full p-2 dark:bg-muted-foreground/20 bg-muted">
              <MapPreview lat={msg.location?.lat} lng={msg.location?.lng} />
              <a
                href={`https://maps.google.com/maps?q=${msg.location?.lat},${msg.location?.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 text-sm hover:underline mt-2 flex items-center"
              >
                <Globe className="mr-2 h-4 w-4" /> Location Details
              </a>
              {msg.accuracy && (
                <p className="mt-1 text-sm flex items-center dark:text-yellow-400">
                  <MapPin className="h-4 w-4 mr-2" />
                  Accuracy {msg.accuracy}m
                </p>
              )}
            </div>
            {messageText && (
              <div className="mt-4 text-sm flex items-center gap-1">
                <p>{messageText}</p>
              </div>
            )}
          </div>
        );
      case "audio":
        return (
          <div className="mt-1 w-full">
            <div className="relative">
              {msg.fileIsEncrypted ? (
                <AudioMessage
                  src={msg.fileURL as string}
                  duration={msg.duration}
                  fileName={msg.fileName}
                  isDark={theme === "dark" ? false : true}
                  className="w-full"
                  onLoad={async (audioElement) => {
                    try {
                      const decryptedUrl = await decryptAndCreateBlobUrl(
                        msg.fileURL || "",
                        msg.fileIsEncrypted || false,
                        msg.fileEncryptedKey as string,
                        msg.fileEncryptedKeyForSelf as string,
                        msg.fileIv as string,
                        msg.fileType || "audio/webm",
                        msg.senderId === currentUser.uid,
                        currentUser.uid
                      );
                      if (audioElement) {
                        audioElement.src = decryptedUrl;
                        audioElement.load();
                      }
                    } catch (error) {
                      console.error("Error loading encrypted audio:", error);
                    }
                  }}
                />
              ) : (
                <AudioMessage
                  src={msg.fileURL || ""}
                  duration={msg.duration}
                  fileName={msg.fileName}
                  isDark={theme === "dark" ? false : true}
                  className="w-full"
                />
              )}
            </div>
            {messageText !== "Audio message" &&
              messageText !== msg.fileName && (
                <div className="mt-1 text-sm w-full flex items-center gap-1">
                  <p>{messageText}</p>
                </div>
              )}
          </div>
        );
      case "file":
        return (
          <div className="mt-1 block gap-2">
            <div className="flex items-center gap-2 bg-muted rounded-md p-2 relative">
              <FileText className="h-5 w-5" />
              <div className="block flex-1">
                <a
                  href={msg.fileURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 text-sm hover:underline"
                  data-type={msg.fileType}
                >
                  {msg.fileName}
                </a>
                <p className="text-xs text-muted-foreground">
                  {(msg?.size ?? 0) < 1024 * 1024
                    ? `${((msg?.size ?? 0) / 1024).toFixed(2)} KB`
                    : `${((msg?.size ?? 0) / (1024 * 1024)).toFixed(2)} MB`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full"
                onClick={async (e) => {
                  e.stopPropagation();

                  toast({
                    title: "Preparing download...",
                    description: "Decrypting file before download",
                  });

                  try {
                    if (msg.fileIsEncrypted) {
                      const encryptedBlob = await fetch(
                        msg?.fileURL ?? ""
                      ).then((response) => response.blob());

                      const isSender = msg.senderId === currentUser.uid;

                      const keyData = isSender
                        ? msg.fileEncryptedKeyForSelf
                        : msg.fileEncryptedKey;
                      const iv = msg.fileIv;

                      if (!keyData || !iv) {
                        throw new Error("Missing encryption data");
                      }

                      const ivArrayBuffer = base64ToArrayBuffer(iv);

                      const privKeyString = localStorage.getItem(
                        `encryption_private_key_${currentUser.uid}`
                      );

                      if (!privKeyString) {
                        throw new Error(
                          "Private key not found in localStorage"
                        );
                      }

                      const privateKey = await importPrivateKey(privKeyString);

                      const messageKey = await decryptKey(keyData, privateKey);

                      const encryptedBuffer = await encryptedBlob.arrayBuffer();
                      const decryptedBuffer =
                        await window.crypto.subtle.decrypt(
                          {
                            name: "AES-GCM",
                            iv: new Uint8Array(ivArrayBuffer),
                          },
                          messageKey,
                          encryptedBuffer
                        );

                      const decryptedBlob = new Blob([decryptedBuffer], {
                        type: msg.fileType || "application/octet-stream",
                      });

                      const url = URL.createObjectURL(decryptedBlob);
                      const downloadLink = document.createElement("a");
                      downloadLink.href = url;
                      downloadLink.download = msg.fileName as string;
                      document.body.appendChild(downloadLink);
                      downloadLink.click();
                      document.body.removeChild(downloadLink);

                      setTimeout(() => URL.revokeObjectURL(url), 100);

                      toast({
                        title: "Download ready",
                        description: "File has been decrypted and downloaded",
                        variant: "default",
                      });
                    } else {
                      const downloadLink = document.createElement("a");
                      downloadLink.href = msg.fileURL!;
                      downloadLink.download = msg.fileName!;
                      downloadLink.target = "_blank";
                      document.body.appendChild(downloadLink);
                      downloadLink.click();
                      document.body.removeChild(downloadLink);
                    }
                  } catch (error) {
                    console.error("Error downloading file:", error);
                    toast({
                      title: "Download failed",
                      description: `Could not decrypt and download the file: ${
                        (error as Error).message
                      }`,
                      variant: "destructive",
                    });
                  }
                }}
                title="Download file"
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
                  className="text-blue-500"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </Button>
            </div>
            {messageText !== msg.fileName && (
              <div className="mt-2 text-base flex items-center gap-1">
                {msg.isEncrypted && (
                  <Lock className="h-3 w-3 text-green-500 flex-shrink-0" />
                )}
                <p>{messageText}</p>
              </div>
            )}
          </div>
        );
      default:
        const youtubeId = extractYouTubeId(messageText);
        return (
          <>
            {youtubeId && <YoutubeEmbed videoId={youtubeId} />}
            <div className="flex items-center gap-1">
              <p
                className="w-full text-sm md:text-base break-words"
                dangerouslySetInnerHTML={{
                  __html: checkingMessage(messageText),
                }}
              />
            </div>
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
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ContactStatus
                isBlocked={isBlocked}
                contact={contact}
                contactIsTyping={contactIsTyping}
              />
            </div>
          </div>
        </div>
        <div className="flex md:gap-2 gap-1">
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
                  If you send a message and there is an error saying "Unable to
                  decrypt message", please log in again. Also, if you switch
                  browsers, you will lose access to your previous messages.
                  Please understand that I try to keep your data as safe as
                  possible.
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
              id={msg.id}
            >
              {msg.replyTo && (
                <a
                  className={`inline-block w-full text-xs p-2 rounded mb-2 ${
                    msg.senderId === currentUser.uid
                      ? "bg-slate-300/25"
                      : "bg-background text-foreground"
                  }`}
                  href={"#" + msg.replyTo.id}
                  id={btoa(msg.replyTo.id)}
                >
                  <div className="font-semibold">
                    {msg.replyTo.senderId === currentUser.uid
                      ? "You"
                      : contact.displayName}
                  </div>
                  <div className="break-words text-ellipsis flex items-center gap-1">
                    {msg.replyTo.isEncrypted && (
                      <Lock className="h-3 w-3 text-green-500 flex-shrink-0" />
                    )}
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
                {replyTo && decryptedMessages[replyTo.id]
                  ? decryptedMessages[replyTo.id]
                  : replyTo?.text || "[Encrypted message]"}
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

      <MessageInput
        currentUser={currentUser}
        contact={contact}
        isBlocked={isBlocked}
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
        isEncryptionEnabled={isInitialized}
      />

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
              Preview your {previewFile?.type} before sending
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
                <VideoPlayer fileURL={previewFile.preview} />
              </div>
            )}

            {previewFile?.type === "audio" && (
              <div className="flex justify-center flex-col items-center gap-2 p-4 rounded-md">
                <AudioMessage
                  src={previewFile.preview}
                  duration={previewFile.duration}
                  fileName={previewFile.file.name}
                  className="w-full h-full"
                />
              </div>
            )}

            {previewFile?.type === "file" && (
              <div className="flex items-center gap-2 p-4 border rounded-md">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">{previewFile.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {previewFile.file.size < 1024 * 1024
                      ? `${(previewFile.file.size / 1024).toFixed(2)} KB`
                      : `${(previewFile.file.size / (1024 * 1024)).toFixed(
                          2
                        )} MB`}
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

      <Dialog
        open={isLocationDialogOpen}
        onOpenChange={setIsLocationDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Location</DialogTitle>
            <DialogDescription>
              Preview your location before sharing
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {location && (
              <div className="h-64 w-full rounded-md border overflow-hidden">
                <iframe
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight={0}
                  marginWidth={0}
                  src={`https://www.google.com/maps?q=${location.lat},${location.lng}&z=15&output=embed`}
                  style={{ border: "1px solid #ccc" }}
                ></iframe>
              </div>
            )}
          </div>
          <p className="w-full break-words space-y-1 text-indigo-400 text-base flex items-center">
            <MapPin className="mr-2 h-5 w-5" /> {`Accuracy ${accuracy} meters`}
          </p>

          <div className="space-y-2">
            <Label htmlFor="caption">Caption (optional)</Label>
            <Textarea
              id="caption"
              placeholder="Add a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsLocationDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={sendLocationMessage}>Share Location</Button>
          </DialogFooter>
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
    </div>
  );
}
