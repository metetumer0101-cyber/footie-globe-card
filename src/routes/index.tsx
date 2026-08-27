import { createFileRoute } from '@tanstack/react-router';
import { ErrorBoundary } from '../lib/error-boundary';
import { LoadingSpinner } from '../lib/loading-spinner';
import { fetchFromSportmonks } from '../lib/api-sportmonks.server';
import type { LiveScore } from '../lib/types/api';

export const Route = createFileRoute('/')({
  component: IndexPage,
  loader: async () => {
    try {
      const liveScores = await fetchFromSportmonks<{ data: LiveScore[] }>('/scores/live', {
        timeout: 15000,
        retries: 2,
      });
      return { liveScores: liveScores.data || [] };
    } catch (error) {
      console.error('Failed to load live scores:', error);
      return { liveScores: [] };
    }
  },
  meta: {
    title: 'Footcard - Futbol İstatistikleri ve Canli Skorlar',
    description: 'Futbol maç sonuçlari, canli skorlar, takim ve oyuncu istatistikleri.',
  },
});

function IndexPage() {
  const { liveScores } = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-gray-50">
      <ErrorBoundary
        fallback={
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">Bir Sorun Oluştu</h2>
            <p className="text-gray-600">Sayfa yüklenirken bir hata oluştu. Lütfen tekrar deneyin.</p>
          </div>
        }
      >
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <div className="max-w-7xl mx-auto px-4 py-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Futbola Farkli Bir Bakış
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              Canli skorlar, detayli istatistikler ve daha fazlasi
            </p>
            <div className="flex gap-4">
              <a
                href="/live"
                className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition"
              >
                Canli Maçłır
              </a>
              <a
                href="/competitions"
                className="px-6 py-3 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-600 transition"
              >
                Ligler
              </a>
            </div>
          </div>
        </div>

        {/* Live Scores */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h2 className="text-2xl font-bold mb-4">Canli Maçłır</h2>
          
          {liveScores.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600">Şu anda canli maç bulunmuyor.</p>
              <a href="/live" className="text-blue-600 hover:underline mt-2 inline-block">
                Tüm maçlari gör →
              </a>
            </div>
          ) : (
            <div className="grid gap-4">
              {liveScores.slice(0, 5).map(match => (
                <div key={match.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-medium text-gray-600">
                          {match.league?.name || 'Lig'}
                        </span>
                        <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded">
                          CANLI
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-semibold">{match.participants?.[0]?.name}</span>
                        <span className="text-lg font-bold">
                          {match.scores?.[0]?.score?.goals ?? 0} - {match.scores?.[1]?.score?.goals ?? 0}
                        </span>
                        <span className="font-semibold">{match.participants?.[1]?.name}</span>
                      </div>
                    </div>
                    <a
                      href={`/match/${match.id}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                      Detay
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Features */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h2 className="text-2xl font-bold mb-6">Öİzellikler</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Canli Skorlar</h3>
              <p className="text-gray-600 mb-4">
                Dunyanin dört bir yanindaki maçlari canli olarak takip edin.
              </p>
              <a href="/live" className="text-blue-600 hover:underline">Keşfet →</a>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Takim İstatistikleri</h3>
              <p className="text-gray-600 mb-4">
                Detayli takim istatistikleri ve performans analizleri.
              </p>
              <a href="/competitions" className="text-blue-600 hover:underline">Keşfet →</a>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Oyuncu Analizleri</h3>
              <p className="text-gray-600 mb-4">
                Oyuncu performanslari ve kariyer istatistikleri.
              </p>
              <a href="/scout" className="text-blue-600 hover:underline">Keşfet →</a>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </div>
  );
}

export default IndexPage;
