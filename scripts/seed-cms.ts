import { createClient } from "@supabase/supabase-js";
import { players, managers, teams } from "../src/data/football";
import type { Database } from "../src/integrations/supabase/types";

const url = process.env["SUPABASE_URL"];
const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient<Database>(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function seedCards() {
  const cards = [
    ...players.map((p) => ({
      type: "player" as const,
      slug: p.id,
      name: p.name,
      api_id: p.apiId ?? null,
      club: p.club,
      club_badge: p.clubBadge,
      nation: p.nation,
      league: p.league ?? null,
      position: p.position,
      tier: p.tier,
      age: p.age,
      height_cm: p.heightCm,
      weight_kg: p.weightKg,
      foot: p.foot,
      market_value: p.marketValue,
      contract_until: p.contractUntil,
      injuries: p.injuries,
      form: p.form,
      career_goals: p.careerGoals,
      photo: p.photo ?? null,
      published: true,
      core: p.core as unknown as import("../src/integrations/supabase/types").Json,
      technical: p.technical as unknown as import("../src/integrations/supabase/types").Json,
      physical: p.physical as unknown as import("../src/integrations/supabase/types").Json,
      mental: p.mental as unknown as import("../src/integrations/supabase/types").Json,
    })),
    ...managers.map((m) => ({
      type: "manager" as const,
      slug: m.id,
      name: m.name,
      club: m.club,
      club_badge: m.clubBadge,
      nation: m.nation,
      tier: m.tier,
      age: m.age,
      market_value: m.marketValue,
      contract_until: m.contractUntil,
      trophies: m.trophies,
      form: m.form,
      matches: m.matches,
      win_rate: m.winRate,
      style: m.style,
      formation: m.formation,
      published: true,
      coach: m.coach as unknown as import("../src/integrations/supabase/types").Json,
    })),
    ...teams.map((t) => ({
      type: "team" as const,
      slug: t.id,
      name: t.name,
      club: t.club,
      club_badge: t.clubBadge,
      nation: t.nation,
      league: t.league,
      tier: t.tier,
      win_rate: t.winRate,
      goals_for: t.goalsFor,
      trophies: t.trophies,
      squad_value: t.squadValue,
      avg_age: t.avgAge,
      published: true,
      stats: t.stats as unknown as import("../src/integrations/supabase/types").Json,
    })),
  ];

  for (const batch of chunks(cards, 100)) {
    const { error } = await supabase.from("cms_cards").upsert(batch, { onConflict: "slug" });
    if (error) throw error;
  }
  console.log(`Seeded ${cards.length} cards`);
}

async function seedPages() {
  const pages = [
    {
      slug: "about",
      title: "About FootCard",
      meta_description:
        "Learn about FootCard: the football scouting and player card platform.",
      body: {
        blocks: [
          {
            title: "Player & Manager Cards",
            text: "Two-stage interactive cards with tier frames, 6 core attributes and 30+ deep analytics.",
          },
          {
            title: "Comparison Engine",
            text: "Head-to-head radar overlays for players, managers and teams, with social-ready image export.",
          },
          {
            title: "Scout Engine",
            text: "Multi-parametric search across the FootCard picks and the worldwide player database.",
          },
          {
            title: "Live Center & Games",
            text: "Real fixtures with 30-second auto-refresh, plus daily puzzles, XP and global leaderboards.",
          },
          {
            title: "35 Languages",
            text: "Fully localized experience for the top football nations, including RTL support.",
          },
        ],
      },
      published: true,
    },
    {
      slug: "privacy",
      title: "Privacy Policy",
      meta_description: "How FootCard collects, stores and protects your data.",
      body: {
        blocks: [
          { title: "Data we store", text: "Email, profile, XP and badges in secure backend. Watchlists and squads are local." },
          { title: "Local storage", text: "Browser localStorage is used for session, language, watchlist and squad data." },
          { title: "Third-party data", text: "Live scores and player data are provided by API-Football, proxied through our servers." },
          { title: "Security", text: "TLS encryption, row-level security and managed authentication." },
          { title: "Your rights", text: "You can delete your account from your profile page at any time." },
        ],
      },
      published: true,
    },
  ];

  const { error } = await supabase.from("cms_pages").upsert(pages, { onConflict: "slug" });
  if (error) throw error;
  console.log(`Seeded ${pages.length} pages`);
}

async function main() {
  await seedCards();
  await seedPages();
  console.log("CMS seed complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
