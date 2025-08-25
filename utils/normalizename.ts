export default function normalizeName(name: string): string {
  if (!name) {
    console.warn("Received empty name");
  }

  return name.slice(0, 14);
}
