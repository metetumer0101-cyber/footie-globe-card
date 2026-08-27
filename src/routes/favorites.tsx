import { createFileRoute } from '@tanstack/react-router';
import { FavoritesCard } from '../components/FavoritesCard';
import { useFavorites } from '../lib/hooks/useFavorites';
import { EmptyState } from '../lib/empty-state';
import { Heart, Users, User } from 'lucide-react';

export const Route = createFileRoute('/favorites')({
  component: FavoritesPage,
  meta: {
    title: 'Favorilerim - Footcard',
    description: 'Favori takimlariniz ve oyunculariniz',
  },
});

function FavoritesPage() {
  const { teams, players, clearAll } = useFavorites();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Favorilerim</h1>
              <p className="text-gray-600 mt-1">
                Favori takimlariniz ve oyunculariniz
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="w-6 h-6 text-red-500" />
              <span className="text-sm text-gray-600">
                {teams.length + players.length} favori
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {teams.length === 0 && players.length === 0 ? (
          <EmptyState
            icon={<Heart className="w-16 h-16 text-gray-300" />}
            title="Hen\u00fcz favori eklememişsiniz"
            description="Takim ve oyunculari favorilerinize ekleyerek hizli erişim sağlayabilirsiniz."
            action={
              <a
                href="/competitions"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Takim Keşfet
              </a>
            }
          />
        ) : (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{teams.length}</p>
                    <p className="text-sm text-gray-600">Favori Takim</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <User className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{players.length}</p>
                    <p className="text-sm text-gray-600">Favori Oyuncu</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Favorites Card */}
            <FavoritesCard />

            {/* Clear All */}
            {(teams.length > 0 || players.length > 0) && (
              <div className="text-center">
                <button
                  onClick={clearAll}
                  className="px-6 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                >
                  Tüm Favorileri Temizle
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default FavoritesPage;
