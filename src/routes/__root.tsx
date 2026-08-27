import * as React from 'react';
import { Outlet, createRootRoute, Link } from '@tanstack/react-router';
import { ErrorBoundary } from '../lib/error-boundary';
import { LoadingSpinner } from '../lib/loading-spinner';

export const Route = createRootRoute({
  component: () => (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Bir Sorun Oluştu</h2>
            <p className="text-gray-600">Sayfa yüklenirken bir hata oluştu.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Yenile
            </button>
          </div>
        </div>
      }
    >
      <React.Suspense fallback={<LoadingSpinner fullScreen text="Y\u00fckleniyor..." />}>
        <div className="min-h-screen bg-gray-50">
          {/* Navigation */}
          <nav className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex items-center justify-between h-16">
                <Link to="/" className="text-xl font-bold text-blue-600">
                  Footcard
                </Link>
                
                <div className="flex items-center gap-6">
                  <Link to="/" className="text-gray-600 hover:text-blue-600 transition">
                    Ana Sayfa
                  </Link>
                  <Link to="/live" className="text-gray-600 hover:text-blue-600 transition">
                    Canli Maçłır
                  </Link>
                  <Link to="/competitions" className="text-gray-600 hover:text-blue-600 transition">
                    Ligler
                  </Link>
                  <Link to="/games" className="text-gray-600 hover:text-blue-600 transition">
                    Canli Puan
                  </Link>
                  <Link to="/scout" className="text-gray-600 hover:text-blue-600 transition">
                    Scout
                  </Link>
                  <Link to="/compare" className="text-gray-600 hover:text-blue-600 transition">
                    Karşılaştırma
                  </Link>
                  <Link to="/favorites" className="text-gray-600 hover:text-blue-600 transition">
                    Favorilerim
                  </Link>
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main id="main-content">
            <Outlet />
          </main>

          {/* Footer */}
          <footer className="bg-white border-t mt-auto">
            <div className="max-w-7xl mx-auto px-4 py-8">
              <div className="grid md:grid-cols-3 gap-8">
                <div>
                  <h3 className="font-semibold mb-3">Footcard</h3>
                  <p className="text-sm text-gray-600">
                    Futbol istatistikleri ve canli skorlar platformu
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Hizli Erişim</h3>
                  <ul className="space-y-2 text-sm">
                    <li><Link to="/live" className="text-gray-600 hover:text-blue-600">Canli Maçłır</Link></li>
                    <li><Link to="/competitions" className="text-gray-600 hover:text-blue-600">Ligler</Link></li>
                    <li><Link to="/scout" className="text-gray-600 hover:text-blue-600">Scout</Link></li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Kurumsal</h3>
                  <ul className="space-y-2 text-sm">
                    <li><Link to="/about" className="text-gray-600 hover:text-blue-600">Hakk\u0131nda</Link></li>
                    <li><Link to="/privacy" className="text-gray-600 hover:text-blue-600">Gizlilik</Link></li>
                  </ul>
                </div>
              </div>
              <div className="border-t mt-8 pt-8 text-center text-sm text-gray-600">
                &copy; 2026 Footcard. Tüm haklar\u0131 sakl\u0131d\u0131r.
              </div>
            </div>
          </footer>
        </div>
      </React.Suspense>
    </ErrorBoundary>
  ),
});

export default Route;
