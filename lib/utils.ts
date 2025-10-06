import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const tzMap: Record<string, string> = {
  "Asia/Jakarta": "Jakarta Time",
  "Asia/Bangkok": "Indochina Time",
  "Asia/Singapore": "Singapore Time",
  "Asia/Kuala_Lumpur": "Malaysia Time",
  "Asia/Manila": "Philippines Time",
  "Asia/Tokyo": "Japan Standard Time",
  "Asia/Seoul": "Korea Standard Time",
  "Asia/Shanghai": "China Standard Time",
  "Asia/Hong_Kong": "Hong Kong Time",
  "Asia/Dubai": "Gulf Standard Time",
  "Asia/Kolkata": "India Standard Time",
  "Europe/London": "British Time",
  "Europe/Paris": "Central European Time",
  "Europe/Berlin": "Central European Time",
  "America/New_York": "Eastern Time",
  "America/Chicago": "Central Time",
  "America/Denver": "Mountain Time",
  "America/Los_Angeles": "Pacific Time",
  "America/Sao_Paulo": "Brasilia Time",
  "Australia/Sydney": "Australian Eastern Time",
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimestamp(
  timestamp: number,
  timeZone: string = "Asia/Jakarta"
) {
  const date = new Date(timestamp);
  const formatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone,
  });
  const tzLabel = tzMap[timeZone] ?? timeZone;
  return `${formatter.format(date)} (${tzLabel})`;
}
