import { createFileRoute } from '@tanstack/react-router';
import { ErrorBoundary } from '../lib/error-boundary';
import { LoadingSpinner } from '../lib/loading-spinner';
import { EmptyState } from '../lib/empty-state';
import { Trophy } from 'lucide-react';

export const Route = createFileRoute('/games')({
  component: GamesPage,
  meta: {
    title: 'Canli Puan - Footcard',
    description: 'Canli puanlar ve skorlar',
  },
});

function GamesPage() {
  return (
    <ErrorBoundary>
      <React.Suspense fallback={<LoadingSpinner fullScreen text="Y\u00fckleniyor..." />}>
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <div className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 py-6">
              <h1 className="text-3xl font-bold text-gray-900">Canli Puan</h1>
              <p className="text-gray-600 mt-1">
                Güncel skorlar ve puan durumlari
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="max-w-7xl mx-auto px-4 py-8">
            <EmptyState
              icon={<Trophy className="w-16 h-16 text-gray-300" />}
              title="Canli Puan Sayfasi"
              description="Bu sayfa hen\u00fcz geliştirme aşamas\u0131ndad\u0131r. Yak\u0131nda canli puanlar ve skorlar burada olacak!"
              action={
                <a
                  href="/live"
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Canli Maçłır →
                </a>
              }
            />
          </div>
        </div>
      </React.Suspense>
    </ErrorBoundary>
  );
}

export default GamesPage;
