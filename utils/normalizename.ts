export default function normalizeName(name: string): string {
  if (!name) throw new Error("Name is required");
  if (name.trim().length === 0) throw new Error("Name cannot be empty");

  return name.trim().slice(0, 14);
}
