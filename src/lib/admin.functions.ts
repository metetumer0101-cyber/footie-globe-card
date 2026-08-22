import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { escapeLike, requireAdmin, requireAdminOrModerator } from "@/lib/admin.server";

type CardRow = Database["public"]["Tables"]["cms_cards"]["Row"];
type PageRow = Database["public"]["Tables"]["cms_pages"]["Row"];
type AnnouncementRow = Database["public"]["Tables"]["cms_announcements"]["Row"];
type TranslationRow = Database["public"]["Tables"]["cms_translations"]["Row"];

const DEFAULT_PAGE_SIZE = 50;

function range(page: number, limit: number) {
  const from = Math.max(0, (page - 1) * limit);
  const to = from + limit - 1;
  return { from, to };
}

export const getCurrentUserRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: isAdmin }, { data: isModerator }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "moderator" }),
    ]);
    return { isAdmin: Boolean(isAdmin), isModerator: Boolean(isModerator) };
  });

export const assignRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; role: "admin" | "moderator" }) => input)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase
      .from("user_roles")
      .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
    if (error) throw error;
    return { ok: true };
  });

export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; role: "admin" | "moderator" }) => input)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", data.role);
    if (error) throw error;
    return { ok: true };
  });

export const listCards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      type?: "player" | "manager" | "team";
      search?: string;
      published?: boolean;
      page?: number;
      limit?: number;
    }) => input,
  )
  .handler(async ({ data, context }): Promise<{ rows: CardRow[]; count: number }> => {
    await requireAdminOrModerator(context);
    let query = context.supabase.from("cms_cards").select("*", { count: "exact" });
    if (data.type) query = query.eq("type", data.type);
    if (data.published !== undefined) query = query.eq("published", data.published);
    if (data.search) {
      const q = escapeLike(data.search);
      query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%`);
    }
    const limit = data.limit ?? DEFAULT_PAGE_SIZE;
    const { from, to } = range(data.page ?? 1, limit);
    const { data: rows, error, count } = await query
      .order("updated_at", { ascending: false })
      .range(from, to);
    if (error) throw error;
    return { rows: rows ?? [], count: count ?? 0 };
  });

export const getCardBySlug = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { slug: string }) => input)
  .handler(async ({ data, context }): Promise<CardRow | null> => {
    await requireAdminOrModerator(context);
    const { data: row, error } = await context.supabase
      .from("cms_cards")
      .select("*")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw error;
    return row;
  });

export const createCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Database["public"]["Tables"]["cms_cards"]["Insert"]) => input)
  .handler(async ({ data, context }): Promise<CardRow> => {
    await requireAdminOrModerator(context);
    const { data: row, error } = await context.supabase.from("cms_cards").insert(data).select().single();
    if (error) throw error;
    return row;
  });

export const updateCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { slug: string; data: Database["public"]["Tables"]["cms_cards"]["Update"] }) => input)
  .handler(async ({ data, context }): Promise<CardRow> => {
    await requireAdminOrModerator(context);
    const { data: row, error } = await context.supabase
      .from("cms_cards")
      .update(data.data)
      .eq("slug", data.slug)
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const deleteCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { slug: string }) => input)
  .handler(async ({ data, context }): Promise<void> => {
    await requireAdmin(context);
    const { error } = await context.supabase.from("cms_cards").delete().eq("slug", data.slug);
    if (error) throw error;
  });

export const listPages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { search?: string; published?: boolean; page?: number; limit?: number }) => input)
  .handler(async ({ data, context }): Promise<{ rows: PageRow[]; count: number }> => {
    await requireAdminOrModerator(context);
    let query = context.supabase.from("cms_pages").select("*", { count: "exact" });
    if (data.published !== undefined) query = query.eq("published", data.published);
    if (data.search) {
      const q = escapeLike(data.search);
      query = query.or(`title.ilike.%${q}%,slug.ilike.%${q}%`);
    }
    const limit = data.limit ?? DEFAULT_PAGE_SIZE;
    const { from, to } = range(data.page ?? 1, limit);
    const { data: rows, error, count } = await query
      .order("updated_at", { ascending: false })
      .range(from, to);
    if (error) throw error;
    return { rows: rows ?? [], count: count ?? 0 };
  });

export const getPageBySlug = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { slug: string }) => input)
  .handler(async ({ data, context }): Promise<PageRow | null> => {
    await requireAdminOrModerator(context);
    const { data: row, error } = await context.supabase
      .from("cms_pages")
      .select("*")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw error;
    return row;
  });

export const createPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Database["public"]["Tables"]["cms_pages"]["Insert"]) => input)
  .handler(async ({ data, context }): Promise<PageRow> => {
    await requireAdminOrModerator(context);
    const { data: row, error } = await context.supabase.from("cms_pages").insert(data).select().single();
    if (error) throw error;
    return row;
  });

export const updatePage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { slug: string; data: Database["public"]["Tables"]["cms_pages"]["Update"] }) => input)
  .handler(async ({ data, context }): Promise<PageRow> => {
    await requireAdminOrModerator(context);
    const { data: row, error } = await context.supabase
      .from("cms_pages")
      .update(data.data)
      .eq("slug", data.slug)
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const deletePage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { slug: string }) => input)
  .handler(async ({ data, context }): Promise<void> => {
    await requireAdmin(context);
    const { error } = await context.supabase.from("cms_pages").delete().eq("slug", data.slug);
    if (error) throw error;
  });

export const listAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { active?: boolean; page?: number; limit?: number }) => input)
  .handler(async ({ data, context }): Promise<{ rows: AnnouncementRow[]; count: number }> => {
    await requireAdminOrModerator(context);
    let query = context.supabase.from("cms_announcements").select("*", { count: "exact" });
    if (data.active !== undefined) query = query.eq("active", data.active);
    const limit = data.limit ?? DEFAULT_PAGE_SIZE;
    const { from, to } = range(data.page ?? 1, limit);
    const { data: rows, error, count } = await query
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw error;
    return { rows: rows ?? [], count: count ?? 0 };
  });

export const getAnnouncement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }): Promise<AnnouncementRow | null> => {
    await requireAdminOrModerator(context);
    const { data: row, error } = await context.supabase
      .from("cms_announcements")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    return row;
  });

export const createAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Database["public"]["Tables"]["cms_announcements"]["Insert"]) => input)
  .handler(async ({ data, context }): Promise<AnnouncementRow> => {
    await requireAdminOrModerator(context);
    const { data: row, error } = await context.supabase
      .from("cms_announcements")
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const updateAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { id: string; data: Database["public"]["Tables"]["cms_announcements"]["Update"] }) => input,
  )
  .handler(async ({ data, context }): Promise<AnnouncementRow> => {
    await requireAdminOrModerator(context);
    const { data: row, error } = await context.supabase
      .from("cms_announcements")
      .update(data.data)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }): Promise<void> => {
    await requireAdmin(context);
    const { error } = await context.supabase.from("cms_announcements").delete().eq("id", data.id);
    if (error) throw error;
  });

export const listTranslations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { locale?: string; namespace?: string; page?: number; limit?: number }) => input)
  .handler(async ({ data, context }): Promise<{ rows: TranslationRow[]; count: number }> => {
    await requireAdminOrModerator(context);
    let query = context.supabase.from("cms_translations").select("*", { count: "exact" });
    if (data.locale) query = query.eq("locale", data.locale);
    if (data.namespace) query = query.eq("namespace", data.namespace);
    const limit = data.limit ?? DEFAULT_PAGE_SIZE;
    const { from, to } = range(data.page ?? 1, limit);
    const { data: rows, error, count } = await query
      .order("namespace", { ascending: true })
      .order("key", { ascending: true })
      .range(from, to);
    if (error) throw error;
    return { rows: rows ?? [], count: count ?? 0 };
  });

export const upsertTranslation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { locale: string; namespace: string; key: string; value: string }) => input,
  )
  .handler(async ({ data, context }): Promise<TranslationRow> => {
    await requireAdminOrModerator(context);
    const { data: row, error } = await context.supabase
      .from("cms_translations")
      .upsert(
        {
          locale: data.locale,
          namespace: data.namespace,
          key: data.key,
          value: data.value,
        },
        { onConflict: "locale,namespace,key" },
      )
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const deleteTranslation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }): Promise<void> => {
    await requireAdmin(context);
    const { error } = await context.supabase.from("cms_translations").delete().eq("id", data.id);
    if (error) throw error;
  });
