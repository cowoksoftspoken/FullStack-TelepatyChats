"use client";

import React, { Dispatch, SetStateAction } from "react";
import { WebRTCStats } from "@/lib/webrtc-native";

type Props = {
  stats: WebRTCStats | null;
  setShowStats: Dispatch<SetStateAction<boolean>>;
};

export default function ConnectionStatsPanel({ stats, setShowStats }: Props) {
  if (!stats) return null;

  const totalBitrate = (stats.videoBitrate ?? 0) + (stats.audioBitrate ?? 0);

  return (
    <div className="absolute top-4 left-4 z-50 bg-black/80 text-white text-xs rounded-md p-3 w-[320px] shadow-lg font-mono">
      <div className="flex justify-between mb-2">
        <span>Connection Stats</span>
        <span
          className="cursor-pointer hover:text-red-400"
          onClick={() => setShowStats(false)}
        >
          [X]
        </span>
      </div>

      <div className="space-y-1">
        <StatRow
          label="Latency"
          value={stats.rtt ? `${stats.rtt.toFixed(0)} ms` : "-"}
        />
        <StatRow
          label="Packet Loss"
          value={`${stats.packetLoss?.toFixed(2)} %`}
        />
        <StatRow label="Video FPS" value={stats.videoFps ?? "-"} />
        <StatRow
          label="Video Bitrate"
          value={
            stats.videoBitrate ? `${stats.videoBitrate.toFixed(0)} kbps` : "-"
          }
        />
        <StatRow
          label="Audio Bitrate"
          value={
            stats.audioBitrate ? `${stats.audioBitrate.toFixed(0)} kbps` : "-"
          }
        />
        <StatBar
          label="Connection Speed"
          value={totalBitrate}
          max={10000}
          unit="kbps"
        />
        <StatBar
          label="Network Activity"
          value={totalBitrate}
          max={10000}
          unit="kbps"
          color="bg-green-400"
        />
        <StatBar
          label="Buffer Health"
          value={Math.min(20, (stats.videoFps ?? 0) * 0.33)}
          max={20}
          unit="s"
          color="bg-yellow-400"
        />
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between">
      <span>{label}:</span>
      <span>{value}</span>
    </div>
  );
}

function StatBar({
  label,
  value,
  max,
  unit,
  color = "bg-blue-400",
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
  color?: string;
}) {
  const width = Math.min(100, (value / max) * 100);

  return (
    <div>
      <div className="flex justify-between mb-1">
        <span>{label}:</span>
        <span>
          {value.toFixed(0)} {unit}
        </span>
      </div>
      <div className="h-2 w-full bg-gray-700 rounded">
        <div
          className={`h-2 rounded ${color}`}
          style={{ width: `${width}%` }}
        ></div>
      </div>
    </div>
  );
}
