/**
 * Server-only helpers for the admin panel.
 *
 * These are imported by admin.functions.ts only; they do not ship to the client.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type AdminContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
};

export async function requireAdmin({ supabase, userId }: AdminContext): Promise<void> {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(`Role check failed: ${error.message}`);
  if (!data) throw new Error("Forbidden: admin required");
}

export async function requireAdminOrModerator({ supabase, userId }: AdminContext): Promise<void> {
  const [{ data: isAdmin }, { data: isModerator }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "moderator" }),
  ]);
  if (!isAdmin && !isModerator) throw new Error("Forbidden: admin or moderator required");
}

export function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}
