export interface Message {
  // Atributes
  id: string;
  chatId: string;
  senderId: string;
  receiverId: string;
  timestamp: string;
  type: "text" | "image" | "video" | "audio" | "file" | "location";

  // Media
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

  // Location
  encryptedLocation?: string;
  locationKey?: string;
  locationKeyForSelf?: string;
  locationIv?: string;
  location?: {
    lat: number;
    lng: number;
  };
  accuracy?: number;

  // broadcast
  isBroadcast?: boolean;

  // edited
  isEdited?: boolean;

  // Reactions
  reactions?: Record<string, string[]>;

  // Text
  isEncrypted: boolean;
  encryptedText: string;
  encryptedKey: string;
  encryptedKeyForSelf?: string;
  iv: string;
  text?: string;
}
