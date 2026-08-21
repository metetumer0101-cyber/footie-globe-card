# FootCard — Büyük Genişletme Planı

## Hedef
Mevcut FootCard'a (kartlar, scout, karşılaştırma, kadro, canlı maçlar, oyunlar/XP) dört yeni katman ekle:
1. Gerçek lig/fikstür/maç detay verisi
2. Sosyal katman (arkadaşlık, meydan okumalar)
3. Tahmin & hafif fantezi oyunu
4. PWA, push bildirim ve performans/SEO iyileştirmeleri

API-Football Free plan 100 istek/gün sınırı olduğu için her dış API çağrısı agresif cache'lenecek; cache miss durumunda zengin mock veriye düşecek.

---

## Aşama 1 — Gerçek Lig, Puan Durumu ve Maç Detayı

### Veritabanı
- `standings` tablosu: lig, sezon, takım, sıra, puan, galibiyet, beraberlik, mağlubiyet, gol averajı, son 5 maç formu.
- `match_events` tablosu: gol, kart, oyuncu değişikliği gibi canlı olaylar.
- `match_stats` tablosu: topa sahip olma, şut, isabetli şut, köşe vuruşu vb.
- `injuries` tablosu: sakatlık/ceza bilgisi (oyuncu, takım, durum, dönüş tarihi).

Tüm tablolarda RLS + GRANT yapısı: `authenticated` okuyabilir, `service_role` yazabilir; `anon` sadece public okuma politikalarına izin verilen tablolarda okuyabilir.

### Backend
- `src/lib/football-data.functions.ts`:
  - `getStandings(leagueId, season)` — 6 saat cache.
  - `getMatchDetails(fixtureId)` — 30 saniye cache (canlı pencere).
  - `getInjuries(teamId | playerId)` — 12 saat cache.
- Cache key'leri API-Football parametrelerine bağlı; cache miss'te API çağrısı, hata/rate limit durumunda mock veri dönülür.

### UI
- Yeni `/competitions` sayfasını gerçek veriyle doldur: lig seçici, puan durumu tablosu, fikstür listesi.
- `/live/$fixtureId` detay rotası: olay zaman çizelgesi, istatistik çubukları, kadrolar, oyuncu performans puanları.
- Ana sayfadaki "Active Competitions" kartları API-Football'dan gelen gerçek liglere bağlanır.

---

## Aşama 2 — Sosyal Katman

### Veritabanı
- `friend_requests`: gönderen, alan, durum (`pending`/`accepted`/`declined`), zaman damgası.
- `friends`: iki yönlü arkadaşlık kaydı (her çift için tek satır, küçük UUID büyük UUID'den önce), oluşturulma tarihi.
- `user_achievements`: kazanılan rozetlerin kalıcı kaydı (şu anki badge sistemiyle bütünleşir).
- `weekly_challenges`: haftalık görev tanımları (örn. "5 Higher/Lower oyunu oyna", "3 scout filtresi kullan").
- `challenge_progress`: kullanıcı başına ilerleme.

### Backend
- `src/lib/social.functions.ts`:
  - Arkadaşlık isteği gönder/kabul et/reddet/listele.
  - Haftalık meydan okuma listesi ve ilerleme güncelleme.
- `src/lib/leaderboard.functions.ts`:
  - Global ve haftalık lider tablo (mevcut `weekly_leaderboard` fonksiyonunu genişlet).
  - Arkadaşlar arası lider tablo.

### UI
- `/profile` sekmesine "Arkadaşlar" ve "Rozetler" alt sekmeleri.
- `/games` sayfasına haftalık meydan okumalar widget'ı.
- Lider tablosuna "Arkadaşlar" filtresi.

---

## Aşama 3 — Tahmin & Hafif Fantezi Oyunu

### Veritabanı
- `match_predictions`: kullanıcı, maç, tahmin edilen ev sahibi/deplasman skoru, tahmin zamanı, sonuç durumu.
- `fantasy_picks`: haftalık seçilen 5 oyuncu (hafta başlangıcı UTC Pazartesi 00:00), kullanıcı.
- `fantasy_points`: her pick için puan (gerçek maç istatistiklerinden türetilir; ilk aşamada mock/algoritmik puanlama).

### Backend
- `src/lib/predictions.functions.ts`:
  - Tahmin ekle/güncelle (maç başlamadan önce).
  - Tahminleri değerlendir ve XP ödüllendir.
- `src/lib/fantasy.functions.ts`:
  - Haftalık kadro seçimi, kilitleme, puan hesaplama.

### UI
- `/games` sekmesine iki yeni oyun: "Maç Tahmini" ve "Haftanın 5'li".
- Tahmin oyunu: canlı fikstürden maç seç, skor tahmini yap, doğru tahminlere XP + rozet.
- Fantezi: haftalık 5 oyuncu seçimi, kalan bütçe/bankroll (ilk aşamada sembolik), puan tablosu.

---

## Aşama 4 — PWA, Push ve Kalite

### PWA
- `vite-plugin-pwa` (veya manuel manifest + service worker) ile:
  - `manifest.json`: koyu tema, kısayollar (Scout, Live, Games).
  - Offline-first shell; sayfa geçişleri önbelleğe alınır.
  - API yanıtları için runtime cache stratejisi (stale-while-revalidate).

### Push Bildirimleri
- `/api/public/push-subscribe` ve `/api/public/push` sunucu rotaları.
- Kullanıcı canlı maçları "favoriye" alır; gol olayı geldiğinde (API-Football polling ile) push gönderilir.
- Free plan sınırı nedeniyle push tetikleyicisi sadece cache'teki canlı maç verisi değiştiğinde ve kullanıcı açıkça abone olduğunda çalışır.

### SEO / Performans
- Her oyuncu/kart ve maç detayı için benzersiz `head()` meta etiketleri.
- Oyuncu kartlarına yapılandırılmış veri (JSON-LD SportsEvent/Person) ekle.
- Görsel optimizasyonu: kart görselleri lazy load, placeholder blur.

---

## Teknik Detaylar

### API-Football Sınır Yönetimi
- Cache TTL'leri: standings 6 saat, injuries 12 saat, maç detayı 30 sn, fikstür 60 sn.
- Her API çağrısı öncesinde cache okunur; cache miss'te istek atılır, başarısızlık/rate limit durumunda mock veri döner.
- Günlük istek sayısını izlemek için `api_cache` tablosuna `request_log` benzeri bir sayaç eklenebilir (opsiyonel).

### Güvenlik
- Tüm yeni tablolar `GRANT` + RLS + policy ile oluşturulur.
- Kullanıcıya özel veriler (tahminler, arkadaşlık istekleri) sadece sahibine görünür.
- Public veriler (puan durumu, fikstür) için `anon` SELECT politikası ve sınırlı sütun projection.

### i18n
- Yeni etiketler (tahmin, fantezi, arkadaşlık, push, PWA kurulum) 35 dile İngilizce ve Türkçe öncelikli olarak eklenir; diğer dillerde fallback İngilizce kalır.

---

## Çıktı Beklentisi
- `/competitions` ve `/live/$fixtureId` zengin gerçek veriyle çalışır.
- `/profile` ve `/games` sosyal + tahmin + fantezi özelliklerini içerir.
- Uygulama PWA olarak kurulabilir ve push bildirim destekler.
- Tüm yeni özellikler 35 dil kataloğuna entegre edilir.
