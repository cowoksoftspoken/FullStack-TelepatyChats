export interface Message {
  isSeen: boolean;
  id: string;
  chatId: string;
  senderId: string;
  receiverId: string;
  timestamp: string;
  type?: "text" | "image" | "video" | "audio" | "file" | "location";
  fileURL?: string;
  fileName?: string;
  accuracy: number;
  size?: number;
  location?: {
    lat: number;
    lng: number;
  };
  fileType?: string;
  duration?: number;
  replyTo?: {
    id: string;
    text: string;
    senderId: string;
  } | null;
  isEncrypted: boolean;
  encryptedText: string;
  encryptedKey: string;
  encryptedKeyForSelf?: string;
  iv: string;
  text?: string;
}
