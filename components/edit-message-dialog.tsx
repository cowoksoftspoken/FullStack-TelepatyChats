"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Check } from "lucide-react";
import type { Message } from "@/types/message";

interface EditMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message | null;
  initialText: string;
  onSave: (messageId: string, newText: string) => Promise<void>;
}

export function EditMessageDialog({
  isOpen,
  onClose,
  message,
  initialText,
  onSave,
}: EditMessageDialogProps) {
  const [text, setText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && initialText) {
      setText(initialText);
    }
  }, [isOpen, initialText]);

  const handleSave = async () => {
    if (!message || !text.trim()) return;

    setIsSaving(true);
    try {
      await onSave(message.id, text);
      onClose();
    } catch (error) {
      console.error("Failed to save edit", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md w-[85%]">
        <DialogHeader>
          <DialogTitle>Edit Message</DialogTitle>
          <DialogDescription>Make changes to your message.</DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="resize-none min-h-[100px]"
            placeholder="Type your new message..."
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !text.trim()}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
