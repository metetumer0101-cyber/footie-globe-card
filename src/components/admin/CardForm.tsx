import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { createCard, updateCard } from "@/lib/admin.functions";
import type { Database } from "@/integrations/supabase/types";
import type { DeepAttr } from "@/data/football";

type CardRow = Database["public"]["Tables"]["cms_cards"]["Row"];
type CardInsert = Database["public"]["Tables"]["cms_cards"]["Insert"];

export const emptyCard: CardInsert = {
  type: "player",
  slug: "",
  name: "",
  published: true,
  club: "",
  club_badge: "",
  nation: "",
  league: "",
  position: "",
  tier: "bronze",
  age: null,
  api_id: null,
  height_cm: null,
  weight_kg: null,
  foot: "right",
  market_value: "",
  contract_until: "",
  injuries: "",
  form: null,
  career_goals: null,
  win_rate: null,
  style: "",
  formation: "",
  trophies: null,
  matches: null,
  goals_for: null,
  squad_value: "",
  avg_age: null,
  photo: "",
  core: null,
  technical: null,
  physical: null,
  mental: null,
  coach: null,
  stats: null,
};

const CORE_KEYS = ["pac", "sho", "pas", "dri", "def", "phy"] as const;
const COACH_KEYS = ["att", "def", "pos", "prs", "dev", "mgt"] as const;
const TEAM_KEYS = ["att", "mid", "tdef", "pos", "prs", "frm"] as const;

const TECHNICAL_KEYS = [
  "finishing", "shotPower", "longShots", "volleys", "penalties", "curve", "freeKick",
  "crossing", "shortPassing", "longPassing", "vision", "ballControl", "dribblingAttr", "heading",
];
const PHYSICAL_KEYS = [
  "acceleration", "sprintSpeed", "agility", "balance", "stamina", "strength", "jumping", "reactions",
];
const MENTAL_KEYS = [
  "positioning", "offTheBall", "composure", "aggression", "interceptions", "marking",
  "standingTackle", "slidingTackle", "defAwareness", "workRate", "leadership", "flair",
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function asStatRecord(v: unknown): Record<string, number> {
  return (v ?? {}) as Record<string, number>;
}

function asDeepAttrs(v: unknown, fallbackKeys: string[]): DeepAttr[] {
  if (Array.isArray(v) && v.length) return v as DeepAttr[];
  return fallbackKeys.map((key) => ({ key, value: 60 }));
}

export function CardForm({
  initial,
  isNew,
  onClose,
  onSaved,
}: {
  initial: CardInsert | CardRow;
  isNew: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [card, setCard] = useState<CardInsert>(() => ({ ...emptyCard, ...initial }));
  const [saving, setSaving] = useState(false);
  const create = useServerFn(createCard);
  const update = useServerFn(updateCard);

  const set = <K extends keyof CardInsert>(key: K, value: CardInsert[K]) =>
    setCard((c) => ({ ...c, [key]: value }));

  const num = (value: string): number | null => (value === "" ? null : Number(value));

  const setStat = (group: "core" | "coach" | "stats", key: string, value: number) => {
    const current = asStatRecord(card[group]);
    set(group, { ...current, [key]: value });
  };

  const deepGroups = useMemo(
    () => ({
      technical: asDeepAttrs(card.technical, TECHNICAL_KEYS),
      physical: asDeepAttrs(card.physical, PHYSICAL_KEYS),
      mental: asDeepAttrs(card.mental, MENTAL_KEYS),
    }),
    [card.technical, card.physical, card.mental],
  );

  const setDeepAttr = (group: "technical" | "physical" | "mental", attrs: DeepAttr[]) =>
    set(group, attrs as unknown as CardInsert["technical"]);

  const save = async () => {
    setSaving(true);
    try {
      // Strip fields irrelevant to the selected type to keep the row clean.
      const payload: CardInsert = { ...card };
      if (payload.type === "player") {
        payload.coach = null;
        payload.stats = null;
        payload.style = null;
        payload.formation = null;
        payload.squad_value = null;
      } else if (payload.type === "manager") {
        payload.core = null;
        payload.technical = null;
        payload.physical = null;
        payload.mental = null;
        payload.stats = null;
        payload.position = null;
        payload.foot = null;
        payload.height_cm = null;
        payload.weight_kg = null;
        payload.career_goals = null;
        payload.squad_value = null;
      } else {
        payload.core = null;
        payload.technical = null;
        payload.physical = null;
        payload.mental = null;
        payload.coach = null;
        payload.position = null;
        payload.foot = null;
        payload.style = null;
        payload.formation = null;
      }

      if (isNew) {
        await create({ data: payload });
      } else {
        await update({ data: { slug: card.slug as string, data: payload } });
      }
      toast.success(isNew ? "Card created" : "Card updated");
      onSaved();
    } catch {
      toast.error("Failed to save card");
    } finally {
      setSaving(false);
    }
  };

  const type = card.type ?? "player";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-8 backdrop-blur-sm">
      <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-background p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black">{isNew ? "New card" : `Edit: ${card.name}`}</h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-secondary" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Identity */}
        <Section title="Identity">
          <Field label="Slug">
            <div className="flex gap-2">
              <TextInput
                disabled={!isNew}
                value={card.slug ?? ""}
                onChange={(v) => set("slug", v)}
                placeholder="kylian-mbappe"
              />
              {isNew && (
                <button
                  type="button"
                  onClick={() => set("slug", slugify(card.name ?? ""))}
                  className="shrink-0 rounded-xl border border-border bg-surface px-3 text-xs font-bold hover:bg-secondary"
                >
                  From name
                </button>
              )}
            </div>
          </Field>
          <Field label="Name">
            <TextInput value={card.name ?? ""} onChange={(v) => set("name", v)} />
          </Field>
          <Field label="Type">
            <SelectInput
              value={type}
              onChange={(v) => set("type", v)}
              options={[
                ["player", "Player"],
                ["manager", "Manager"],
                ["team", "Team"],
              ]}
            />
          </Field>
          <Field label="Tier">
            <SelectInput
              value={card.tier ?? "bronze"}
              onChange={(v) => set("tier", v)}
              options={[
                ["bronze", "Bronze"],
                ["silver", "Silver"],
                ["gold", "Gold"],
                ["elite", "Elite"],
                ["icon", "Icon"],
              ]}
            />
          </Field>
          <Field label="Status">
            <SelectInput
              value={card.published ? "true" : "false"}
              onChange={(v) => set("published", v === "true")}
              options={[
                ["true", "Published"],
                ["false", "Draft"],
              ]}
            />
          </Field>
          <Field label="API-Football ID">
            <NumberInput value={card.api_id} onChange={(v) => set("api_id", v)} />
          </Field>
        </Section>

        {/* Media */}
        <Section title="Media">
          <Field label="Photo URL">
            <TextInput value={card.photo ?? ""} onChange={(v) => set("photo", v)} placeholder="https://…" />
          </Field>
          <Field label="Club badge URL">
            <TextInput value={card.club_badge ?? ""} onChange={(v) => set("club_badge", v)} placeholder="https://…" />
          </Field>
          {card.photo ? (
            <div className="sm:col-span-2">
              <img
                src={card.photo}
                alt={card.name ?? "Card photo preview"}
                className="h-24 w-24 rounded-2xl border border-border object-cover"
              />
            </div>
          ) : null}
        </Section>

        {/* Club & League */}
        <Section title="Club & League">
          <Field label="Club">
            <TextInput value={card.club ?? ""} onChange={(v) => set("club", v)} />
          </Field>
          <Field label="League">
            <TextInput value={card.league ?? ""} onChange={(v) => set("league", v)} />
          </Field>
          <Field label="Nation">
            <TextInput value={card.nation ?? ""} onChange={(v) => set("nation", v)} />
          </Field>
          <Field label="Age">
            <NumberInput value={card.age} onChange={(v) => set("age", v)} />
          </Field>
          <Field label="Market value">
            <TextInput value={card.market_value ?? ""} onChange={(v) => set("market_value", v)} placeholder="€180M" />
          </Field>
          <Field label="Contract until">
            <TextInput value={card.contract_until ?? ""} onChange={(v) => set("contract_until", v)} placeholder="2029" />
          </Field>
          <Field label="Form (0-100)">
            <NumberInput value={card.form} onChange={(v) => set("form", v)} />
          </Field>
        </Section>

        {type === "player" && (
          <>
            <Section title="Player details">
              <Field label="Position">
                <TextInput value={card.position ?? ""} onChange={(v) => set("position", v)} placeholder="ST" />
              </Field>
              <Field label="Preferred foot">
                <SelectInput
                  value={card.foot ?? "right"}
                  onChange={(v) => set("foot", v)}
                  options={[
                    ["right", "Right"],
                    ["left", "Left"],
                    ["both", "Both"],
                  ]}
                />
              </Field>
              <Field label="Height (cm)">
                <NumberInput value={card.height_cm} onChange={(v) => set("height_cm", v)} />
              </Field>
              <Field label="Weight (kg)">
                <NumberInput value={card.weight_kg} onChange={(v) => set("weight_kg", v)} />
              </Field>
              <Field label="Career goals">
                <NumberInput value={card.career_goals} onChange={(v) => set("career_goals", v)} />
              </Field>
              <Field label="Injuries / notes">
                <TextInput value={card.injuries ?? ""} onChange={(v) => set("injuries", v)} />
              </Field>
            </Section>

            <Section title="Core stats (0-99)">
              {CORE_KEYS.map((key) => (
                <Field key={key} label={key.toUpperCase()}>
                  <NumberInput
                    value={asStatRecord(card.core)[key] ?? null}
                    onChange={(v) => setStat("core", key, v ?? 60)}
                  />
                </Field>
              ))}
            </Section>

            <DeepAttrSection
              title="Technical attributes"
              attrs={deepGroups.technical}
              onChange={(attrs) => setDeepAttr("technical", attrs)}
            />
            <DeepAttrSection
              title="Physical attributes"
              attrs={deepGroups.physical}
              onChange={(attrs) => setDeepAttr("physical", attrs)}
            />
            <DeepAttrSection
              title="Mental attributes"
              attrs={deepGroups.mental}
              onChange={(attrs) => setDeepAttr("mental", attrs)}
            />
          </>
        )}

        {type === "manager" && (
          <>
            <Section title="Manager details">
              <Field label="Style">
                <TextInput value={card.style ?? ""} onChange={(v) => set("style", v)} placeholder="Gegenpressing" />
              </Field>
              <Field label="Formation">
                <TextInput value={card.formation ?? ""} onChange={(v) => set("formation", v)} placeholder="4-3-3" />
              </Field>
              <Field label="Win rate (%)">
                <NumberInput value={card.win_rate} onChange={(v) => set("win_rate", v)} />
              </Field>
              <Field label="Trophies">
                <NumberInput value={card.trophies} onChange={(v) => set("trophies", v)} />
              </Field>
              <Field label="Matches managed">
                <NumberInput value={card.matches} onChange={(v) => set("matches", v)} />
              </Field>
            </Section>
            <Section title="Coaching stats (0-99)">
              {COACH_KEYS.map((key) => (
                <Field key={key} label={key.toUpperCase()}>
                  <NumberInput
                    value={asStatRecord(card.coach)[key] ?? null}
                    onChange={(v) => setStat("coach", key, v ?? 60)}
                  />
                </Field>
              ))}
            </Section>
          </>
        )}

        {type === "team" && (
          <>
            <Section title="Team details">
              <Field label="Win rate (%)">
                <NumberInput value={card.win_rate} onChange={(v) => set("win_rate", v)} />
              </Field>
              <Field label="Goals for">
                <NumberInput value={card.goals_for} onChange={(v) => set("goals_for", v)} />
              </Field>
              <Field label="Trophies">
                <NumberInput value={card.trophies} onChange={(v) => set("trophies", v)} />
              </Field>
              <Field label="Squad value">
                <TextInput value={card.squad_value ?? ""} onChange={(v) => set("squad_value", v)} placeholder="€1.1B" />
              </Field>
              <Field label="Average age">
                <NumberInput value={card.avg_age} onChange={(v) => set("avg_age", v)} />
              </Field>
            </Section>
            <Section title="Team stats (0-99)">
              {TEAM_KEYS.map((key) => (
                <Field key={key} label={key.toUpperCase()}>
                  <NumberInput
                    value={asStatRecord(card.stats)[key] ?? null}
                    onChange={(v) => setStat("stats", key, v ?? 60)}
                  />
                </Field>
              ))}
            </Section>
          </>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-bold"
          >
            Cancel
          </button>
          <button
            onClick={() => void save()}
            disabled={saving || !card.slug || !card.name}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isNew ? "Create card" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeepAttrSection({
  title,
  attrs,
  onChange,
}: {
  title: string;
  attrs: DeepAttr[];
  onChange: (attrs: DeepAttr[]) => void;
}) {
  return (
    <div className="mt-6">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h3>
      <div className="space-y-2">
        {attrs.map((attr, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={attr.key}
              onChange={(e) =>
                onChange(attrs.map((a, j) => (j === i ? { ...a, key: e.target.value } : a)))
              }
              className="w-44 rounded-xl border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-primary"
            />
            <input
              type="number"
              min={0}
              max={99}
              value={attr.value}
              onChange={(e) =>
                onChange(
                  attrs.map((a, j) => (j === i ? { ...a, value: Number(e.target.value) || 0 } : a)),
                )
              }
              className="w-20 rounded-xl border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-primary"
            />
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(99, Math.max(0, attr.value))}%` }}
              />
            </div>
            <button
              type="button"
              onClick={() => onChange(attrs.filter((_, j) => j !== i))}
              className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10"
              aria-label="Remove attribute"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...attrs, { key: "newAttr", value: 60 }])}
        className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary"
      >
        <Plus className="h-3.5 w-3.5" /> Add attribute
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-60";

function TextInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <input
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    />
  );
}

function NumberInput({
  value,
  onChange,
}: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
}) {
  return (
    <input
      type="number"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      className={inputCls}
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
      {options.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );
}
