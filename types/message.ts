export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  receiverId: string;
  timestamp: string;
  type: "text" | "image" | "video" | "audio" | "file" | "location";
  fileURL?: string;
  fileName?: string;
  fileType?: string;
  size?: number;
  fileIsEncrypted?: boolean;
  fileEncryptedKeyForSelf?: string;
  fileEncryptedKey?: string;
  fileIv?: string;
  duration?: number;
  isSeen?: boolean;
  replyTo?: {
    id: string;
    senderId: string;
    isEncrypted?: boolean;
    text?: string;
    encryptedText?: string;
    encryptedKey?: string;
    encryptedKeyForSelf?: string;
    iv?: string;
  } | null;
  location?: {
    lat: number;
    lng: number;
  };
  accuracy?: number;
  isEncrypted: boolean;
  encryptedText: string;
  encryptedKey: string;
  encryptedKeyForSelf?: string;
  iv: string;
  text?: string;
}
