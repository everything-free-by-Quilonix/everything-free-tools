/** Joins class names, skipping falsy values. Tailwind classes here never conflict, so no merge step is needed. */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
