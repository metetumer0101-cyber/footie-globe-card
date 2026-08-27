import React from 'react';
import { useFavorites } from '../lib/hooks/useFavorites';
import { Link } from '@tanstack/react-router';

export function FavoritesCard() {
  const { teams, players, isLoading, removeTeam, removePlayer } = useFavorites();

  if (isLoading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (teams.length === 0 && players.length === 0) {
    return (
      <div className="p-6 bg-white rounded-lg shadow text-center">
        <h3 className="text-lg font-semibold mb-2">Favorileriniz Boş</h3>
        <p className="text-gray-600 text-sm mb-4">
          Takim ve oyunculari favorilerinize ekleyerek hizli erişim sağlayabilirsiniz.
        </p>
        <Link
          to="/competitions"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Takim Keşfet
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Favorilerim</h3>

      {/* Favorite Teams */}
      {teams.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-600 mb-2">Takimlar ({teams.length})</h4>
          <div className="flex flex-wrap gap-2">
            {teams.map(team => (
              <div
                key={team.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full"
              >
                {team.teamLogo && (
                  <img
                    src={team.teamLogo}
                    alt={team.teamName}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                )}
                <Link
                  to="/team/$id"
                  params={{ id: team.teamId.toString() }}
                  className="text-sm font-medium hover:text-blue-600 transition"
                >
                  {team.teamName}
                </Link>
                <button
                  onClick={() => removeTeam(team.teamId)}
                  className="text-gray-400 hover:text-red-500 transition"
                  aria-label="Favorilerden çikar"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Favorite Players */}
      {players.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-2">
            Oyuncular ({players.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {players.map(player => (
              <div
                key={player.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full"
              >
                {player.playerImage && (
                  <img
                    src={player.playerImage}
                    alt={player.playerName}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                )}
                <Link
                  to="/player/$id"
                  params={{ id: player.playerId.toString() }}
                  className="text-sm font-medium hover:text-blue-600 transition"
                >
                  {player.playerName}
                </Link>
                <button
                  onClick={() => removePlayer(player.playerId)}
                  className="text-gray-400 hover:text-red-500 transition"
                  aria-label="Favorilerden çikar"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default FavoritesCard;
