"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ChangePhotoFromUrlProps {
  onSubmit: (url: string) => void;
  isChangePhotoFromUrlOpen: boolean;
  setIsChangePhotoFromUrlOpen: (
    condition: React.SetStateAction<boolean>
  ) => void;
}

export function ChangePhotoFromUrl({
  onSubmit,
  isChangePhotoFromUrlOpen,
  setIsChangePhotoFromUrlOpen,
}: ChangePhotoFromUrlProps) {
  const [url, setUrl] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(url);
    setUrl("");
  };

  return (
    <Dialog
      open={isChangePhotoFromUrlOpen}
      onOpenChange={setIsChangePhotoFromUrlOpen}
    >
      <DialogTrigger asChild>
        <Button variant="outline">Change Photo</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Photo</DialogTitle>
          <DialogDescription>
            Enter a valid image URL for change your avatar
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="url">Image URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com/photo.jpg"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>
          <DialogFooter className="sm:justify-end">
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
