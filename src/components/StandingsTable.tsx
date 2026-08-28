'use client';

import React from 'react';
import { StandingsGroup } from '@/types/standings';
import { cn } from '@/lib/utils';

export type StandingsFilter = 'overall' | 'home' | 'away';

interface StandingsTableProps {
  data: StandingsGroup[];
  isLoading?: boolean;
  filter: StandingsFilter;
  onFilterChange: (f: StandingsFilter) => void;
}

type Filter = StandingsFilter;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'overall', label: 'Genel' },
  { key: 'home', label: 'İç Saha' },
  { key: 'away', label: 'Dış Saha' },
];

/** Maçkolik tarzı sıra renkleri: ŞL / Avrupa / küme hattı */
function rankStripe(position: number, total: number): string {
  if (position <= 2) return 'border-l-blue-500';
  if (position <= 4) return 'border-l-emerald-500';
  if (position <= 6) return 'border-l-amber-500';
  if (position > total - 3) return 'border-l-red-500';
  return 'border-l-transparent';
}

function FormDots({ form }: { form?: string }) {
  if (!form) return null;
  const letters = form.toUpperCase().replace(/[^WDL]/g, '').slice(-5).split('');
  if (letters.length === 0) return null;
  return (
    <div className="flex justify-center gap-1">
      {letters.map((l, i) => (
        <span
          key={i}
          className={cn(
            'flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white',
            l === 'W' && 'bg-emerald-500',
            l === 'D' && 'bg-zinc-500',
            l === 'L' && 'bg-red-500',
          )}
        >
          {l === 'W' ? 'G' : l === 'D' ? 'B' : 'M'}
        </span>
      ))}
    </div>
  );
}

export default function StandingsTable({ data, isLoading, filter: filterType, onFilterChange: setFilterType }: StandingsTableProps) {

  if (isLoading) {
    return (
      <div className="space-y-2 rounded-xl border border-white/5 bg-zinc-900/60 p-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded-md bg-zinc-800/70" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full rounded-xl border border-white/5 bg-zinc-900/60 p-8 text-center text-sm text-zinc-400">
        Puan durumu verisi bulunamadı.
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Filtre sekmeleri */}
      <div className="flex rounded-lg border border-white/5 bg-zinc-900/80 p-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilterType(f.key)}
            className={cn(
              'flex-1 rounded-md py-1.5 text-xs font-bold transition-all',
              filterType === f.key
                ? 'bg-emerald-600 text-white shadow'
                : 'text-zinc-400 hover:text-white',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {data.map((group, groupIdx) => (
        <div
          key={groupIdx}
          className="overflow-hidden rounded-xl border border-white/5 bg-zinc-900/70 shadow-2xl"
        >
          {/* Grup başlığı */}
          {data.length > 1 && (
            <div className="border-b border-white/5 bg-zinc-950/60 px-3 py-2">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
                {group.groupName}
              </h3>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 bg-zinc-950/50 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  <th className="w-7 py-2 pl-2 pr-1 text-center">#</th>
                  <th className="py-2 px-1">Takım</th>
                  <th className="w-7 py-2 px-1 text-center">OM</th>
                  <th className="w-7 py-2 px-1 text-center">G</th>
                  <th className="w-7 py-2 px-1 text-center">B</th>
                  <th className="w-7 py-2 px-1 text-center">M</th>
                  <th className="hidden w-8 py-2 px-1 text-center sm:table-cell">AG</th>
                  <th className="hidden w-8 py-2 px-1 text-center sm:table-cell">YG</th>
                  <th className="w-8 py-2 px-1 text-center">AV</th>
                  <th className="hidden w-20 py-2 px-1 text-center md:table-cell">Form</th>
                  <th className="w-9 py-2 px-2 text-center text-zinc-300">P</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row, idx) => (
                  <tr
                    key={row.teamId}
                    className={cn(
                      'border-l-[3px] transition-colors hover:bg-white/5',
                      rankStripe(row.position, group.rows.length),
                      idx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]',
                    )}
                  >
                    <td className="py-2 pl-2 pr-1 text-center font-bold text-zinc-400">
                      {row.position}
                    </td>
                    <td className="py-2 px-1">
                      <div className="flex items-center gap-2">
                        {row.teamLogo ? (
                          <img
                            src={row.teamLogo}
                            alt={row.teamName}
                            loading="lazy"
                            className="h-5 w-5 shrink-0 object-contain"
                          />
                        ) : (
                          <span className="h-5 w-5 shrink-0 rounded-full bg-zinc-800" />
                        )}
                        <span className="max-w-[110px] truncate text-[12px] font-semibold text-zinc-100 sm:max-w-none">
                          {row.teamName}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-1 text-center font-medium text-zinc-300">{row.played}</td>
                    <td className="py-2 px-1 text-center text-zinc-400">{row.won}</td>
                    <td className="py-2 px-1 text-center text-zinc-400">{row.draw}</td>
                    <td className="py-2 px-1 text-center text-zinc-400">{row.lost}</td>
                    <td className="hidden py-2 px-1 text-center text-zinc-400 sm:table-cell">{row.goalsFor}</td>
                    <td className="hidden py-2 px-1 text-center text-zinc-400 sm:table-cell">{row.goalsAgainst}</td>
                    <td className="py-2 px-1 text-center font-mono text-zinc-300">
                      {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                    </td>
                    <td className="hidden py-2 px-1 md:table-cell">
                      <FormDots form={row.form} />
                    </td>
                    <td className="py-2 px-2 text-center text-sm font-black text-emerald-400">
                      {row.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Renk açıklamaları */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-[10px] text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-1 rounded-sm bg-blue-500" /> Şampiyonlar Ligi
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-1 rounded-sm bg-emerald-500" /> Avrupa Kupaları
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-1 rounded-sm bg-amber-500" /> Konferans Ligi
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-1 rounded-sm bg-red-500" /> Küme Düşme
        </span>
      </div>
    </div>
  );
}
