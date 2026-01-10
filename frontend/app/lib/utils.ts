import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format a date to "January 1, 2026" style.
// Accepts Date objects or ISO strings (YYYY-MM-DD or full ISO).
export function formatLongDate(input: string | Date): string {
  let d: Date | null = null;

  if (typeof input === "string") {
    // If it's a date-only string, parse safely as local date to avoid timezone shift
    const m = input.match(/^\d{4}-\d{2}-\d{2}$/);
    if (m) {
      const [y, mth, day] = input.split("-").map(Number);
      d = new Date(y, (mth || 1) - 1, day || 1);
    } else {
      const parsed = new Date(input);
      d = isNaN(parsed.getTime()) ? null : parsed;
    }
  } else if (input instanceof Date) {
    d = input;
  }

  if (!d || isNaN(d.getTime())) return "";

  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}