export interface Group {
  id: string;
  name: string;
  photoURL?: string;
  description?: string;
  members: string[];
  admins: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: string;
    type: "text" | "image" | "video" | "file" | "audio" | "location";
  };
  type: "group";
}
