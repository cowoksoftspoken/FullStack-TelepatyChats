// "use client";

// import type React from "react";

// import { useState, useRef, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import Link from "next/link";
// import { addDoc, collection } from "firebase/firestore";
// import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
// import { ArrowLeft, ImageIcon, Film, Send, X, Loader2 } from "lucide-react";

// import { Button } from "@/components/ui/button";
// import { Textarea } from "@/components/ui/textarea";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { useFirebase } from "@/lib/firebase-provider";
// import { toast } from "@/components/ui/use-toast";

// export default function CreateStoryPage() {
//   const { db, storage, currentUser, loading: authLoading } = useFirebase();
//   const [isUploading, setIsUploading] = useState(false);
//   const [preview, setPreview] = useState<string | null>(null);
//   const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
//   const [caption, setCaption] = useState("");
//   const [privacy, setPrivacy] = useState<"public" | "contacts" | "selected">(
//     "contacts"
//   );
//   const [mediaFile, setMediaFile] = useState<File | null>(null);
//   const imageInputRef = useRef<HTMLInputElement>(null);
//   const videoInputRef = useRef<HTMLInputElement>(null);
//   const router = useRouter();

//   useEffect(() => {
//     if (!authLoading && !currentUser) {
//       router.push("/login");
//     }
//   }, [authLoading, currentUser, router]);

//   const handleFileSelect = (
//     e: React.ChangeEvent<HTMLInputElement>,
//     type: "image" | "video"
//   ) => {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     setMediaType(type);
//     setMediaFile(file);

//     const url = URL.createObjectURL(file);
//     setPreview(url);
//   };

//   const handleCreateStory = async () => {
//     if (!mediaFile || !mediaType || !currentUser) return;

//     setIsUploading(true);

//     try {
//       const storageRef = ref(
//         storage,
//         `stories/${currentUser.uid}/${Date.now()}_${mediaFile.name}`
//       );
//       await uploadBytes(storageRef, mediaFile);
//       const mediaUrl = await getDownloadURL(storageRef);

//       const now = new Date();
//       const expiresAt = new Date(
//         now.getTime() + 24 * 60 * 60 * 1000
//       ).toISOString();

//       const storyData: {
//         userId: string;
//         mediaUrl: string;
//         mediaType: "image" | "video";
//         caption: string | null;
//         createdAt: string;
//         expiresAt: string;
//         viewers: string[];
//         privacy: "public" | "contacts" | "selected";
//         allowedViewers?: string[];
//       } = {
//         userId: currentUser.uid,
//         mediaUrl,
//         mediaType,
//         caption: caption.trim() || null,
//         createdAt: now.toISOString(),
//         expiresAt,
//         viewers: [],
//         privacy,
//       };

//       if (privacy === "selected") {
//         storyData.allowedViewers = [];
//       }

//       await addDoc(collection(db, "stories"), storyData);

//       toast({
//         title: "Story created",
//         description: "Your story has been published successfully.",
//       });

//       router.push("/stories");
//     } catch (error) {
//       console.error("Error creating story:", error);
//       toast({
//         variant: "destructive",
//         title: "Failed to create story",
//         description:
//           "An error occurred while creating your story. Please try again.",
//       });
//     } finally {
//       setIsUploading(false);
//     }
//   };

//   if (authLoading || !currentUser) {
//     return (
//       <div className="flex h-screen w-full items-center justify-center">
//         <Loader2 className="h-8 w-8 animate-spin text-primary" />
//       </div>
//     );
//   }

//   return (
//     <div className="container max-w-md mx-auto py-8">
//       <div className="flex items-center justify-between mb-6">
//         <Link
//           href="/stories"
//           className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground"
//         >
//           <ArrowLeft className="mr-2 h-4 w-4" />
//           Back to Stories
//         </Link>
//         <h1 className="text-2xl font-bold">Create Story</h1>
//       </div>

//       <div className="space-y-6">
//         {!preview ? (
//           <div className="grid grid-cols-2 gap-4">
//             <div
//               className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 hover:border-muted-foreground/50"
//               onClick={() => imageInputRef.current?.click()}
//             >
//               <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground" />
//               <p className="text-sm font-medium">Upload Photo</p>
//               <input
//                 type="file"
//                 ref={imageInputRef}
//                 className="hidden"
//                 accept="image/*"
//                 onChange={(e) => handleFileSelect(e, "image")}
//               />
//             </div>
//             <div
//               className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 hover:border-muted-foreground/50"
//               onClick={() => videoInputRef.current?.click()}
//             >
//               <Film className="mb-2 h-8 w-8 text-muted-foreground" />
//               <p className="text-sm font-medium">Upload Video</p>
//               <input
//                 type="file"
//                 ref={videoInputRef}
//                 className="hidden"
//                 accept="video/*"
//                 onChange={(e) => handleFileSelect(e, "video")}
//               />
//             </div>
//           </div>
//         ) : (
//           <div className="space-y-6">
//             <div className="relative">
//               <div className="relative aspect-[9/16] w-full overflow-hidden rounded-lg">
//                 {mediaType === "image" ? (
//                   <img
//                     src={preview || "/placeholder.svg"}
//                     alt="Story preview"
//                     className="h-full w-full object-cover"
//                   />
//                 ) : (
//                   <video
//                     src={preview}
//                     className="h-full w-full object-cover"
//                     controls
//                     muted
//                   />
//                 )}
//               </div>
//               <Button
//                 variant="destructive"
//                 size="icon"
//                 className="absolute right-2 top-2 h-8 w-8 rounded-full"
//                 onClick={() => {
//                   setPreview(null);
//                   setMediaType(null);
//                   setMediaFile(null);
//                 }}
//               >
//                 <X className="h-4 w-4" />
//               </Button>
//             </div>

//             <div className="space-y-2">
//               <label className="text-sm font-medium">Caption (Optional)</label>
//               <Textarea
//                 placeholder="Add a caption..."
//                 value={caption}
//                 onChange={(e) => setCaption(e.target.value)}
//                 rows={3}
//               />
//             </div>

//             <div className="space-y-2">
//               <label className="text-sm font-medium">Privacy</label>
//               <Select
//                 value={privacy}
//                 onValueChange={(value) => setPrivacy(value as any)}
//               >
//                 <SelectTrigger>
//                   <SelectValue placeholder="Who can see your story" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="public">Everyone</SelectItem>
//                   <SelectItem value="contacts">My Contacts</SelectItem>
//                   <SelectItem value="selected">Selected Contacts</SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>

//             <Button
//               className="w-full"
//               onClick={handleCreateStory}
//               disabled={isUploading}
//             >
//               {isUploading ? (
//                 <span className="flex items-center gap-2">
//                   <Loader2 className="h-4 w-4 animate-spin" />
//                   <span>Creating...</span>
//                 </span>
//               ) : (
//                 <span className="flex items-center gap-2">
//                   <Send className="h-4 w-4" />
//                   <span>Share Story</span>
//                 </span>
//               )}
//             </Button>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CreateStoryPage() {
  return (
    <div className="h-[100dvh] flex-col gap-2 mx-auto flex justify-center items-center">
      Will be available soon
      <Link
        href="/stories"
        className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Stories
      </Link>
    </div>
  );
}
