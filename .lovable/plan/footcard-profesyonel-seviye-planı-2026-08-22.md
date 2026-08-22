# FootCard — Profesyonel Seviye Planı

Mevcut durum: Canlı maç merkezi, dünya çapında oyuncu arama (filtreli), karşılaştırma motoru, kadro kurucu, oyun hub'ı (XP + liderlik), puan durumları ve 35 dil desteği çalışıyor. Eksik olan, bunları "gerçek bir ürün" yapan katman: marka kimliği, derin bağlantılı sayfalar, kişiselleştirme ve kalite/performans işçiliği.

## Aşama 1 — Marka Kimliği ve Uygulama Hissi
- Özel FootCard logosu + uygulama ikon seti (favicon, ana ekran ikonları)
- `manifest.webmanifest`: telefona "uygulama gibi" kurulum (ana ekrana ekleme, tam ekran açılış, tema rengi)
- Tüm sayfalarda tutarlı yükleme iskeletleri (skeleton), boş durum ve hata ekranları
- 404 / "sayfa bulunamadı" tasarımı
- Alt bilgi (footer): Hakkında + Gizlilik sayfaları

## Aşama 2 — Derin Bağlantılı Sayfalar
- `/player/$id` — oyuncuya özel paylaşılabilir sayfa: tam kart, radar, 30+ özellik, transfer geçmişi; sosyal paylaşım için og:image = oyuncu fotoğrafı
- `/team/$id` — takım sayfası: kadro, fikstür, puan durumu, canlı maçları
- Mevcut hızlı modal korunur; "tam sayfayı aç" bağlantısı eklenir
- Kart paylaşım bağlantıları artık gerçek URL'lere işaret eder

## Aşama 3 — Kişiselleştirme
- Favori takım + favori oyuncu takibi (giriş yapanlar için veritabanında, misafirler için localStorage'da)
- Ana sayfa "Sana Özel" hâline gelir: favori takımın maçları, takip edilen oyuncuların kartları
- Profil ayarları: varsayılan dil, favori lig
- İlk ziyarette kısa tanıtım (onboarding) akışı

## Aşama 4 — Kalite, Performans, Güvenlik
- Ağır modüllerin (Kadro Kurucu, Karşılaştırma) tembel yüklenmesi; ilk açılış hızının artması
- Görsel optimizasyonu denetimi (lazy loading, boyutlar)
- Güvenlik taraması + veritabanı erişim kuralları (RLS) denetimi
- Uçtan uca duman testi: Canlı → Scout → Kart → Kadro → Oyun akışlarının doğrulanması

## Kapsam dışı (bu planda yok)
- Yayınlama / alan adı bağlama
- Çevrimdışı mod ve bildirimler (ayrıca planlanabilir)
- Gelir modeli (reklam/abonelik)

## Teknik notlar
- PWA yalnızca manifest düzeyinde olacak (çevrimdışı service worker yok); önizleme ve geliştirme ortamını bozmaz
- Oyuncu/takım sayfaları API-Football verisi + mevcut önbellek katmanıyla beslenir, API kotası korunur
- Yeni veritabanı tablosu (favoriler) RLS kuralları ve GRANT'larla gelir
- Tüm yeni metinler 35 dildeki çeviri sistemine eklenir (EN + TR tam, diğerleri İngilizce'ye düşer)
