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
}

export interface StoryView {
  storyId: string;
  userId: string;
  viewedAt: string;
}
