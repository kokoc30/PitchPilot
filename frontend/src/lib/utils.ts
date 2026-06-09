import type { User } from "@supabase/supabase-js";

type ClassValue = string | false | null | undefined;

export function cn(...classes: ClassValue[]) {
  return classes.filter(Boolean).join(" ");
}

export function titleCase(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

export function getUserDisplayName(user: User | null) {
  const fullName = user?.user_metadata?.full_name;

  if (typeof fullName === "string" && fullName.trim()) {
    return fullName.trim();
  }

  return user?.email ?? "Signed in user";
}
