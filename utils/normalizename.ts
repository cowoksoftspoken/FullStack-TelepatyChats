export default function normalizeName(name?: string | null): string {
  if (!name) {
    console.warn("Received empty name");
    return "Unknown";
  }

  return name.slice(0, 14);
}
