import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronUp, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";

const PLAYBACK_SPEEDS = [0.25, 0.5, 1, 1.25, 1.5, 2];

export function VideoSettingsMenu({
  showSettingsMenu,
  toggleSettingsMenu,
  playbackRate,
  setPlaybackRate,
  videoRef,
  isMobile,
}: {
  showSettingsMenu: boolean;
  toggleSettingsMenu: () => void;
  playbackRate: number;
  setPlaybackRate: (rate: number) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isMobile: boolean;
}) {
  if (!showSettingsMenu) return null;

  return (
    <div
      className={`
        absolute z-20 transition-all duration-200 ${
          isMobile ? "bottom-14 left-2" : "top-0 right-24"
        }
      `}
    >
      <Card
        className={`
          bg-black/80 text-white shadow-lg border border-white/10
          transition-all duration-300 ${
            isMobile ? "w-[120px] rounded-md" : "w-[280px] rounded-xl"
          }
        `}
      >
        {!isMobile && (
          <CardHeader className="!flex !flex-row justify-between items-center p-2 border-b border-white/10">
            <CardTitle className="text-sm font-semibold">Settings</CardTitle>
            <button
              onClick={toggleSettingsMenu}
              className="hover:bg-white/10 rounded-full p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </CardHeader>
        )}

        <CardContent className={`${isMobile ? "p-2" : "p-4"} space-y-4`}>
          <div className="space-y-2">
            {!isMobile && (
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-300">
                Playback Speed
              </label>
            )}

            {!isMobile && (
              <div className="grid grid-cols-3 gap-1 text-sm">
                {PLAYBACK_SPEEDS.map((rate) => (
                  <button
                    key={rate}
                    onClick={() => setPlaybackRate(rate)}
                    className={`px-2 py-1 rounded-md transition-colors
                ${
                  playbackRate === rate
                    ? "bg-purple-600 text-white"
                    : "bg-gray-800/50 text-gray-300 hover:bg-gray-700/70"
                }
              `}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {!isMobile && (
            <div className="border-t border-white/10 pt-3 text-xs font-mono text-gray-300 space-y-2 max-h-[160px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
              <p>
                <span className="text-purple-400">Resolution:</span>{" "}
                {videoRef?.current?.videoWidth}x{videoRef?.current?.videoHeight}
              </p>
              <p>
                <span className="text-purple-400">Time:</span>{" "}
                {videoRef?.current?.currentTime.toFixed(1)} /{" "}
                {videoRef?.current?.duration.toFixed(1)}
              </p>
              <p>
                <span className="text-purple-400">Bitrate:</span>{" "}
                {(videoRef?.current as any)?.webkitVideoDecodedByteCount &&
                videoRef?.current?.buffered.length
                  ? Math.round(
                      ((videoRef?.current as any).webkitVideoDecodedByteCount *
                        8) /
                        videoRef?.current.buffered.end(0)
                    ).toLocaleString()
                  : 0}{" "}
                kbps
              </p>
              <p>
                <span className="text-purple-400">Dropped:</span>{" "}
                {(videoRef?.current as any)?.webkitDroppedFrameCount}
              </p>
              <p>
                <span className="text-purple-400">Total:</span>{" "}
                {(videoRef?.current as any)?.webkitDecodedFrameCount}
              </p>
              <p>
                <span className="text-purple-400">Buffered:</span>{" "}
                {(() => {
                  const b = videoRef?.current?.buffered;
                  if (!b) return "0";
                  const ranges = [];
                  for (let i = 0; i < b.length; i++) {
                    ranges.push(
                      `${b.start(i).toFixed(2)}–${b.end(i).toFixed(2)}`
                    );
                  }
                  return ranges.join(", ");
                })()}
              </p>
              <p>
                <span className="text-purple-400">Speed:</span>{" "}
                {videoRef?.current?.playbackRate}x
              </p>
              <p>
                <span className="text-purple-400">ReadyState:</span>{" "}
                {videoRef?.current?.readyState}
              </p>
              <p>
                <span className="text-purple-400">Network:</span>{" "}
                {videoRef?.current?.networkState}
              </p>
              <p>
                <span className="text-purple-400">Volume:</span>{" "}
                {Math.round((videoRef?.current?.volume ?? 0) * 100)}%
              </p>
              <p>
                <span className="text-purple-400">Network Speed:</span>{" "}
                {(() => {
                  const video = videoRef?.current;
                  if (!video || video.buffered.length === 0) return "N/A";

                  const bytes = (video as any)?.webkitVideoDecodedByteCount;
                  const duration = video.buffered.end(
                    video.buffered.length - 1
                  );

                  if (!bytes || duration === 0) return "N/A";

                  const kbps = ((bytes * 8) / duration / 1000).toFixed(2);
                  return `${kbps} kbps`;
                })()}
              </p>
              <p>
                <span className="text-purple-400">Muted:</span>{" "}
                {videoRef?.current?.muted ? "Yes" : "No"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
