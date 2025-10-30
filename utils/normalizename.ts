export default function normalizeName(name?: string | null): string {
  if (name == null) return "";
  if (name == "") return "";

  return name.slice(0, 14);
}
