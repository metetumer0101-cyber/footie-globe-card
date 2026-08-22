import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function getPublicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const listPublishedCards = createServerFn({ method: "GET" })
  .inputValidator((input: { type?: "player" | "manager" | "team"; limit?: number } = {}) => input)
  .handler(async ({ data }) => {
    const supabase = getPublicClient();
    let query = supabase
      .from("cms_cards")
      .select("*")
      .eq("published", true)
      .order("updated_at", { ascending: false })
      .limit(data.limit ?? 200);
    if (data.type) query = query.eq("type", data.type);
    const { data: rows, error } = await query;
    if (error) throw error;
    return rows ?? [];
  });

export const searchPublishedCards = createServerFn({ method: "GET" })
  .inputValidator((input: { q: string; type?: "player" | "manager" | "team"; limit?: number }) => input)
  .handler(async ({ data }) => {
    const supabase = getPublicClient();
    const q = data.q.trim();
    let query = supabase
      .from("cms_cards")
      .select("*")
      .eq("published", true)
      .ilike("name", `%${q}%`)
      .limit(data.limit ?? 50);
    if (data.type) query = query.eq("type", data.type);
    const { data: rows, error } = await query;
    if (error) throw error;
    return rows ?? [];
  });

export const getPublishedCardBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => input)
  .handler(async ({ data }) => {
    const supabase = getPublicClient();
    const { data: row, error } = await supabase
      .from("cms_cards")
      .select("*")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    if (error) throw error;
    return row;
  });

export const getPageBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => input)
  .handler(async ({ data }) => {
    const supabase = getPublicClient();
    const { data: row, error } = await supabase
      .from("cms_pages")
      .select("*")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    if (error) throw error;
    return row;
  });

export const listActiveAnnouncements = createServerFn({ method: "GET" })
  .inputValidator((input: { limit?: number } = {}) => input)
  .handler(async ({ data }) => {
    const supabase = getPublicClient();
    const { data: rows, error } = await supabase
      .from("cms_announcements")
      .select("*")
      .eq("active", true)
      .lte("start_at", new Date().toISOString())
      .or("end_at.is.null,end_at.gte.now()")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 5);
    if (error) throw error;
    return rows ?? [];
  });
