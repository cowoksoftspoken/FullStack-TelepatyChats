export interface Message {
  isSeen: boolean;
  id: string;
  chatId: string;
  text: string;
  senderId: string;
  receiverId: string;
  timestamp: string;
  type?: "text" | "image" | "video" | "audio" | "file";
  fileURL?: string;
  fileName?: string;
  fileType?: string;
  duration?: number;
  replyTo?: {
    id: string;
    text: string;
    senderId: string;
  } | null;
}
