import { createFileRoute } from '@tanstack/react-router';
import React, { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import StandingsTable from '@/components/StandingsTable';
import { parseSportmonksStandings } from '@/lib/mappers/standingsMapper';
import { StandingsGroup } from '@/types/standings';

export const Route = createFileRoute('/games')({
  head: () => ({
    meta: [
      { title: "Puan Durumu – FootCard" },
      { name: "description", content: "Canlı lig puan durumu ve istatistikleri." },
    ],
  }),
  component: GamesPage,
});

function GamesPage() {
  const [standings, setStandings] = useState<StandingsGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchStandings() {
      try {
        setLoading(true);
        const response = await fetch('/api/standings');
        if (response.ok) {
          const rawData = await response.json();
          const parsed = parseSportmonksStandings(rawData.data || rawData);
          setStandings(parsed);
        } else {
          setStandings([]);
        }
      } catch (error) {
        console.error('Puan durumu yüklenirken hata oluştu:', error);
        setStandings([]);
      } finally {
        setLoading(false);
      }
    }

    fetchStandings();
  }, []);

  return (
    <AppShell activeTab="games">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">
          Puan Durumu
        </h1>
        <StandingsTable data={standings} isLoading={loading} />
      </div>
    </AppShell>
  );
}
