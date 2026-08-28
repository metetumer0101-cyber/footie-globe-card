import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import StandingsTable from '@/components/StandingsTable';
import { parseSportmonksStandings } from '@/lib/mappers/standingsMapper';
import { getRawStandings } from '@/lib/standings-raw.functions';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/games')({
  head: () => ({
    meta: [
      { title: 'Canlı Puan Durumu – FootCard' },
      { name: 'description', content: 'Canlı lig puan durumu, oynanan maçlar, averaj ve puan tabloları.' },
      { property: 'og:title', content: 'Canlı Puan Durumu – FootCard' },
      { property: 'og:description', content: 'Canlı lig puan durumu ve istatistikleri.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: GamesPage,
});

const LEAGUES = [
  { id: 600, name: 'Süper Lig', short: 'SÜPER', color: '#e11d48' },
  { id: 8, name: 'Premier League', short: 'EPL', color: '#7c3aed' },
  { id: 564, name: 'La Liga', short: 'LIGA', color: '#f59e0b' },
  { id: 82, name: 'Bundesliga', short: 'BUN', color: '#dc2626' },
  { id: 384, name: 'Serie A', short: 'SA', color: '#2563eb' },
  { id: 301, name: 'Ligue 1', short: 'L1', color: '#0891b2' },
];

function GamesPage() {
  const [leagueId, setLeagueId] = useState<number>(600);
  const [filter, setFilter] = useState<'overall' | 'home' | 'away'>('overall');

  const { data, isLoading } = useQuery({
    queryKey: ['raw-standings', leagueId],
    queryFn: () => getRawStandings({ data: { leagueId } }),
    staleTime: 5 * 60 * 1000,
  });

  const groups = parseSportmonksStandings(data ?? []);
  const active = LEAGUES.find((l) => l.id === leagueId) ?? LEAGUES[0]!;

  return (
    <AppShell>
      <div className="min-h-screen bg-zinc-950">
        {/* Maçkolik tarzı üst bant */}
        <div
          className="border-b border-white/10"
          style={{ background: `linear-gradient(135deg, ${active.color}26 0%, transparent 55%)` }}
        >
          <div className="mx-auto max-w-3xl px-4 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl text-[11px] font-black text-white shadow-lg"
                style={{ backgroundColor: active.color }}
              >
                {active.short}
              </div>
              <div>
                <h1 className="text-lg font-extrabold leading-tight text-white sm:text-2xl">
                  {active.name}
                </h1>
                <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-400">
                  Canlı Puan Durumu
                </p>
              </div>
            </div>

            {/* Lig seçici — yatay kaydırmalı */}
            <div className="mt-4 -mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex gap-2">
                {LEAGUES.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLeagueId(l.id)}
                    className={cn(
                      'flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all',
                      leagueId === l.id
                        ? 'border-white/20 bg-white/10 text-white shadow-inner'
                        : 'border-white/5 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200',
                    )}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: l.color }}
                    />
                    {l.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-2 py-4 sm:px-4">
          <StandingsTable data={groups} isLoading={isLoading} />
        </div>
      </div>
    </AppShell>
  );
}
