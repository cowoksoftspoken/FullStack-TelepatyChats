"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Mail, User } from "lucide-react";
import type { User as UserType } from "@/types/user";

interface UserAvatarProps {
  user: UserType | null;
  className?: string;
  showHoverCard?: boolean;
  showEnlargeOnClick?: boolean;
  size?: "sm" | "md" | "lg";
  isBlocked?: boolean;
}

export function UserAvatar({
  user,
  className = "",
  showHoverCard = true,
  showEnlargeOnClick = true,
  size = "md",
  isBlocked = false,
}: UserAvatarProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!user) {
    return (
      <Avatar className={className}>
        <AvatarFallback>
          <User className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
    );
  }

  // Determine the size of the avatar based on the size prop

  const getSizeClass = () => {
    switch (size) {
      case "sm":
        return "h-8 w-8";
      case "lg":
        return "h-24 w-24";
      case "md":
      default:
        return "h-10 w-10";
    }
  };

  if (isBlocked) {
    return (
      <Avatar className={getSizeClass()}>
        <AvatarFallback>{user?.displayName?.charAt(0) || "U"}</AvatarFallback>
      </Avatar>
    );
  }

  const avatarComponent = (
    <Avatar className={`${className} ${getSizeClass()} cursor-pointer`}>
      <AvatarImage
        src={user.photoURL || undefined}
        alt={user.displayName || "User"}
        className="object-cover"
      />
      <AvatarFallback>{user.displayName?.charAt(0) || "U"}</AvatarFallback>
    </Avatar>
  );

  // If both hover card and enlarge are disabled, just return the avatar
  if (!showHoverCard && !showEnlargeOnClick) {
    return avatarComponent;
  }

  // If only enlarge on click is enabled
  if (!showHoverCard && showEnlargeOnClick) {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>{avatarComponent}</DialogTrigger>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>{user.displayName || "User Profile"}</DialogTitle>
          </DialogHeader>
          <div className="relative w-full aspect-square">
            {user.photoURL ? (
              <img
                src={user.photoURL || "/placeholder.svg"}
                alt={user.displayName || "User"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted text-4xl">
                {user.displayName?.charAt(0) || "U"}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // If both or only hover card is enabled
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        {showEnlargeOnClick ? (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>{avatarComponent}</DialogTrigger>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden">
              <DialogHeader className="sr-only">
                <DialogTitle>{user.displayName || "User Profile"}</DialogTitle>
              </DialogHeader>
              <div className="relative w-full aspect-square">
                {user.photoURL ? (
                  <img
                    src={user.photoURL || "/placeholder.svg"}
                    alt={user.displayName || "User"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted text-4xl">
                    {user.displayName?.charAt(0) || "U"}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          avatarComponent
        )}
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="flex justify-between space-x-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.photoURL || ""} className="object-cover" />
            <AvatarFallback>
              {user.displayName?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1 flex-1">
            <h4 className="text-sm font-semibold">{user.displayName}</h4>
            <div className="flex items-center text-sm text-muted-foreground">
              <Mail className="mr-1 h-3 w-3" />
              {user.email}
            </div>
            <div className="flex items-center pt-2">
              <span
                className={`h-2 w-2 rounded-full mr-2 ${
                  user.online ? "bg-green-500" : "bg-gray-300"
                }`}
              ></span>
              <span className="text-xs text-muted-foreground">
                {user.online ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
