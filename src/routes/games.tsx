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
      { title: 'Puan Durumu – FootCard' },
      { name: 'description', content: 'Canlı lig puan durumu, oynanan maçlar, averaj ve puan tabloları.' },
      { property: 'og:title', content: 'Puan Durumu – FootCard' },
      { property: 'og:description', content: 'Canlı lig puan durumu ve istatistikleri.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: GamesPage,
});

const LEAGUES = [
  { id: 600, name: 'Süper Lig' },
  { id: 8, name: 'Premier League' },
  { id: 564, name: 'La Liga' },
  { id: 82, name: 'Bundesliga' },
  { id: 384, name: 'Serie A' },
  { id: 301, name: 'Ligue 1' },
];

function GamesPage() {
  const [leagueId, setLeagueId] = useState<number>(600);

  const { data, isLoading } = useQuery({
    queryKey: ['raw-standings', leagueId],
    queryFn: () => getRawStandings({ data: { leagueId } }),
    staleTime: 5 * 60 * 1000,
  });

  const groups = parseSportmonksStandings(data ?? []);

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4 text-center">Puan Durumu</h1>
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {LEAGUES.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLeagueId(l.id)}
              className={cn(
                'rounded-full border px-3 py-1 text-sm transition-colors',
                leagueId === l.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {l.name}
            </button>
          ))}
        </div>
        <StandingsTable data={groups} isLoading={isLoading} />
      </div>
    </AppShell>
  );
}
