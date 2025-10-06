import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Settings, Mic, Video, BarChart2, ShieldCheck } from "lucide-react";
import { useState } from "react";

export default function StreamStatusDropdown({
  localStream,
  remoteStream,
  onToggleStats,
}: {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onToggleStats: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
          title="Settings"
        >
          <Settings size={18} className="text-white" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-56 bg-black/90 text-white backdrop-blur-md border border-gray-700"
      >
        <DropdownMenuLabel className="p-2 text-xs text-gray-300">
          <div className="space-y-1">
            <div
              className="flex items-center justify-between"
              title="Your Stream"
            >
              <div className="flex items-center gap-2">
                <Mic
                  size={14}
                  className={localStream ? "text-green-400" : "text-red-400"}
                />
                <span className="font-medium">You</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] ${
                  localStream
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {localStream ? "Active" : "Inactive"}
              </span>
            </div>

            <div
              className="flex items-center justify-between"
              title="Callee Stream"
            >
              <div className="flex items-center gap-2">
                <Video
                  size={14}
                  className={remoteStream ? "text-green-400" : "text-red-400"}
                />
                <span className="font-medium">Callee</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] ${
                  remoteStream
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {remoteStream ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuLabel className="flex justify-center">
          <div
            className="flex items-center gap-2 px-3 py-1 
               rounded-full backdrop-blur-md 
               bg-white/10 border border-white/20 
               shadow-md"
          >
            <ShieldCheck size={14} className="text-emerald-400" />
            <span
              className="text-xs font-semibold text-emerald-300 tracking-wide"
              title="This call is End-to-end Encrypted"
            >
              End-to-end Encrypted
            </span>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-gray-700" />

        <DropdownMenuItem
          className="flex items-center gap-2 cursor-pointer focus:bg-gray-800"
          onClick={onToggleStats}
        >
          <BarChart2 size={14} />
          <span>Show Stats</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
