import { useState } from "react";
import { Globe, MapPin, Eye, EyeOff } from "lucide-react";
import MapPreview from "./map-preview";
import { Message } from "@/types/message";
import { formatAccuracy } from "@/lib/utils";

interface LocationMessageProps {
  msg: Message;
  finalLocationPriority?: { lat: number; lng: number } | undefined;
  messageText: string;
}

export function LocationMessage({
  msg,
  finalLocationPriority,
  messageText,
}: LocationMessageProps) {
  const [showDetails, setShowDetails] = useState(true);

  return (
    <div className="w-full mt-1">
      <div className="rounded-2xl w-full overflow-hidden border dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-md">
        <div className="relative w-full h-48">
          <MapPreview
            lat={finalLocationPriority?.lat}
            lng={finalLocationPriority?.lng}
          />

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="
              absolute top-2 right-2 p-1 rounded-md 
              bg-white/80 dark:bg-black/40 
              backdrop-blur-md shadow-md 
              hover:bg-white dark:hover:bg-black 
              transition
            "
          >
            {showDetails ? (
              <EyeOff className="h-4 w-4 text-neutral-700 dark:text-neutral-200" />
            ) : (
              <Eye className="h-4 w-4 text-neutral-700 dark:text-neutral-200" />
            )}
          </button>
        </div>

        {showDetails && (
          <div className="p-3 space-y-2 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm shadow-inner">
            <a
              href={`https://maps.google.com/maps?q=${finalLocationPriority?.lat},${finalLocationPriority?.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 dark:text-blue-400 text-sm font-medium hover:underline flex items-center"
            >
              <Globe className="mr-2 h-4 w-4" />
              Open in Google Maps
            </a>

            {msg.accuracy && (
              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 w-fit shadow-sm">
                <MapPin className="h-3 w-3" />
                Accuracy: {formatAccuracy(msg.accuracy)}
              </div>
            )}

            {messageText && (
              <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-snug">
                {messageText}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
