export interface Story {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  caption?: string;
  createdAt: string;
  expiresAt: string;
  viewers: string[]; // Array of user IDs who have viewed the story
  privacy: "public" | "contacts" | "selected";
  allowedViewers?: string[]; // Array of user IDs allowed to view if privacy is "selected"
}

export interface StoryView {
  storyId: string;
  userId: string;
  viewedAt: string;
}
