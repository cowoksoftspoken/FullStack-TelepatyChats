"use client";

import { Dispatch, SetStateAction, useState } from "react";
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
import { Camera, Eye, Link, Mail, Trash2, User } from "lucide-react";
import type { User as UserType } from "@/types/user";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface UserAvatarProps {
  user: UserType | null;
  className?: string;
  showHoverCard?: boolean;
  showEnlargeOnClick?: boolean;
  size?: "sm" | "md" | "lg";
  isBlocked?: boolean;
  enableMenu?: boolean;
  onChangePhoto?: () => void;
  onDeletePhoto?: () => void;
  onChangePhotoFromURL?: (url: React.SetStateAction<boolean>) => void;
}

export function UserAvatar({
  user,
  className = "",
  showHoverCard = true,
  showEnlargeOnClick = true,
  size = "md",
  isBlocked = false,
  enableMenu,
  onChangePhoto,
  onDeletePhoto,
  onChangePhotoFromURL,
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

  if (enableMenu) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>{avatarComponent}</DropdownMenuTrigger>

          <DropdownMenuContent
            align="center"
            sideOffset={8}
            className="w-44 rounded-xl p-1 
          bg-white dark:bg-neutral-900 
          shadow-lg border border-gray-100 dark:border-neutral-800 
          animate-in fade-in-80 slide-in-from-top-2 
          data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-1
        "
          >
            <DropdownMenuItem
              onClick={() => setDialogOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-md 
            hover:bg-gray-100 dark:hover:bg-neutral-800 
            cursor-pointer transition-colors
          "
            >
              <Eye className="h-4 w-4 text-gray-700 dark:text-gray-300" />
              <span className="text-sm text-gray-800 dark:text-gray-200">
                See Photo
              </span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={onChangePhoto}
              className="flex items-center gap-2 px-3 py-2 rounded-md 
            hover:bg-gray-100 dark:hover:bg-neutral-800 
            cursor-pointer transition-colors
          "
            >
              <Camera className="h-4 w-4 text-gray-700 dark:text-gray-300" />
              <span className="text-sm text-gray-800 dark:text-gray-200">
                Change Photo
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                if (onChangePhotoFromURL) {
                  onChangePhotoFromURL(true);
                }
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-md 
            hover:bg-gray-100 dark:hover:bg-neutral-800 
            cursor-pointer transition-colors"
            >
              <Link className="h-4 w-4 text-gray-800 dark:text-gray-200" />
              <span className="text-sm text-gray-800 dark:text-gray-200">
                Change via URL
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDeletePhoto}
              className="flex items-center gap-2 px-3 py-2 rounded-md 
            hover:bg-red-50 dark:hover:bg-red-900/30 
            cursor-pointer transition-colors
          "
            >
              <Trash2 className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                Delete Photo
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {showEnlargeOnClick && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden">
              <DialogHeader className="sr-only">
                <DialogTitle>{user.displayName || "User Profile"}</DialogTitle>
              </DialogHeader>
              <div className="relative w-full aspect-square">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
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
        )}
      </>
    );
  }

  if (!showHoverCard && !showEnlargeOnClick) {
    return avatarComponent;
  }

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
            <AvatarImage
              src={user.photoURL || undefined}
              className="object-cover"
            />
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
