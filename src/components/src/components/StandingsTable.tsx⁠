'use client';

import React, { useState } from 'react';
import { StandingsGroup } from '@/types/standings';

interface StandingsTableProps {
  data: StandingsGroup[];
  isLoading?: boolean;
}

export default function StandingsTable({ data, isLoading }: StandingsTableProps) {
  const [filterType, setFilterType] = useState<'overall' | 'home' | 'away'>('overall');

  if (isLoading) {
    return (
      <div className="w-full p-8 text-center text-gray-400 animate-pulse">
        Puan Durumu Yükleniyor...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full p-8 text-center text-gray-400">
        Puan durumu verisi bulunamadı.
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 p-2 sm:p-4">
      {/* Filtre Butonları */}
      <div className="flex justify-center space-x-2 bg-gray-900/60 p-1.5 rounded-xl border border-gray-800">
        <button
          onClick={() => setFilterType('overall')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            filterType === 'overall'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Genel
        </button>
        <button
          onClick={() => setFilterType('home')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            filterType === 'home'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          İç Saha
        </button>
        <button
          onClick={() => setFilterType('away')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            filterType === 'away'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Dış Saha
        </button>
      </div>

      {/* Tablo Grupları */}
      {data.map((group, groupIdx) => (
        <div key={groupIdx} className="bg-gray-900/80 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="bg-gray-800/50 px-4 py-3 border-b border-gray-800 flex justify-between items-center">
            <h3 className="text-sm font-bold text-white tracking-wide">{group.groupName}</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-gray-950/50 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-800/60">
                <tr>
                  <th className="py-2.5 px-3 text-center w-8">#</th>
                  <th className="py-2.5 px-3">Takım</th>
                  <th className="py-2.5 px-2 text-center">OM</th>
                  <th className="py-2.5 px-2 text-center">G</th>
                  <th className="py-2.5 px-2 text-center">B</th>
                  <th className="py-2.5 px-2 text-center">M</th>
                  <th className="py-2.5 px-2 text-center hidden sm:table-cell">AG</th>
                  <th className="py-2.5 px-2 text-center hidden sm:table-cell">YG</th>
                  <th className="py-2.5 px-2 text-center">AV</th>
                  <th className="py-2.5 px-3 text-center font-bold text-white">P</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/40">
                {group.rows.map((row) => (
                  <tr key={row.teamId} className="hover:bg-gray-800/40 transition-colors">
                    <td className="py-2.5 px-3 text-center font-semibold text-gray-400">
                      {row.position}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-white flex items-center space-x-2.5">
                      {row.teamLogo && (
                        <img src={row.teamLogo} alt={row.teamName} className="w-5 h-5 object-contain" />
                      )}
                      <span className="truncate max-w-[120px] sm:max-w-none">{row.teamName}</span>
                    </td>
                    <td className="py-2.5 px-2 text-center text-gray-300">{row.played}</td>
                    <td className="py-2.5 px-2 text-center text-gray-400">{row.won}</td>
                    <td className="py-2.5 px-2 text-center text-gray-400">{row.draw}</td>
                    <td className="py-2.5 px-2 text-center text-gray-400">{row.lost}</td>
                    <td className="py-2.5 px-2 text-center text-gray-400 hidden sm:table-cell">{row.goalsFor}</td>
                    <td className="py-2.5 px-2 text-center text-gray-400 hidden sm:table-cell">{row.goalsAgainst}</td>
                    <td className="py-2.5 px-2 text-center text-gray-300 font-mono">
                      {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-400 text-sm">
                      {row.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
