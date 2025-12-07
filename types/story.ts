export interface Story {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  caption?: string;
  createdAt: string;
  expiresAt: string;
  viewers: string[];
  privacy: "public" | "contacts" | "selected";
  allowedViewers?: string[];
  type: "text" | "media";
  isEncrypted?: boolean;
  textContent?: string;
  musicUrl?: string;
  backgroundColor?: string;
  musicTitle?: string;
  musicArtist?: string;
}

export interface StoryView {
  storyId: string;
  userId: string;
  viewedAt: string;
}
