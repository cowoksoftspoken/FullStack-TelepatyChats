export interface Message {
  isSeen: boolean;
  id: string;
  chatId: string;
  text: string;
  senderId: string;
  receiverId: string;
  timestamp: string;
  type?: "text" | "image" | "video" | "audio" | "file" | "location";
  fileURL?: string;
  fileName?: string;
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
}
