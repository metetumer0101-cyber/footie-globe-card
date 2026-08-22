# Plan: Küresel Oyuncu Veritabanı + Doğru Canlı Maç & İstatistik Mimarisi

## Hedef
1. Dünyadaki oyuncuları aranabilir/filtrelenebilir şekilde uygulamada barındırmak.
2. Canlı maçları ve maç istatistiklerini (skor, dakika, olaylar, kadrolar, takım istatistikleri) doğru ve güncel sunmak.
3. API kotasını (günlük istek limiti) aşmadan çalışmak.

## Neden mevcut yapı yetmiyor
- API-Football'da "tüm oyuncuları listele" endpoint'i yok; sadece isim araması veya lig/takım bazlı listeleme var. Bu yüzden "tüm oyuncular" ancak **kendi veritabanımıza toplu aktarım (sync)** ile mümkün.
- Maç istatistikleri şu an her izlemede API'ye gidiyor ve sadece geçici cache'te duruyor; `standings`, `match_stats`, `match_events`, `injuries` tabloları boş — bitmiş maçlar tekrar tekrar API'den çekiliyor (kota israfı).

## Aşama 1 — Küresel oyuncu veritabanı (toplu sync)
- **Yeni tablo**: `world_players` (api_id, isim, yaş, ülke, pozisyon, fotoğraf, kulüp, lig, rating, gol/asist/dakika istatistikleri, güncelleme zamanı). RLS: herkese okuma, yazma sadece service role.
- **Sync altyapısı**: `src/routes/api/public/cron/sync-players.ts` — seçili ~30-40 büyük lig için `/players?league=X&season=Y&page=N` sayfalarını dolaşıp tabloyu dolduran güvenli (secret header ile korunan) endpoint. Lig başına ~20-40 sayfa; toplam aktarım birkaç yüz istek, günde 1 kez çalışır.
- **Zamanlayıcı**: pg_cron ile her gece 03:00 UTC'de endpoint çağrılır; oyuncu kulübü değişince (transfer) ertesi gün otomatik güncellenir.
- **Uygulama tarafı**: Scout ve Dünya Araması artık önce bu tablodan okur (anında, kota harcamadan); tabloda bulunmayan isimler için mevcut API araması yedek olarak kalır.

## Aşama 2 — Canlı maç ve istatistik doğruluğu
- **Canlı skorlar**: Mevcut günlük fikstür çağrısına ek olarak `/fixtures?live=all` (tek istekle dünyadaki tüm oynanan maçlar) 30 sn TTL ile. Böylece dakika/skor her zaman doğru.
- **Maç detayı TTL kademeleri**: Canlı maç 30-60 sn, bitmiş maç **kalıcı** — biten maçın olayları/istatistikleri `match_events` ve `match_stats` tablolarına bir kez yazılır, bir daha API çağrılmaz.
- **Puan durumu**: `getStandings` sonucu ayrıca `standings` tablosuna yazılır; tablo dolunca Competitions sayfası DB'den okur (API kapalıyken bile çalışır).
- **Sakatlıklar**: `getInjuries` sonucu `injuries` tablosuna yansıtılır.

## Aşama 3 — Kota bütçesi ve izleme
- Tahmini günlük kullanım: oyuncu sync ~300-500, canlı akış ~1.500-2.000 (60 sn TTL, aktif saatler), maç detayları izlendikçe. 7.500/gün limiti rahat yeter.
- `api_cache` satırlarına göre basit bir "kota kullanım" sayacı ve admin panelinde gösterge.
- Kota aşımı/rate-limit durumunda mevcut davranış korunur: eski cache (stale) servis edilir, UI asla boş kalmaz.

## Teknik notlar
- Yeni dosyalar: `world_players` migration'ı, `src/lib/player-db.functions.ts` (DB okuma + sync mantığı), `src/routes/api/public/cron/sync-players.ts`.
- Düzenlenecekler: `player-search.functions.ts` (önce DB'ye bak), `live.functions.ts` (`live=all` katmanı), `football-data.functions.ts` (bitmiş maçları tablolara kalıcı yaz).
- API anahtarı sunucuda kalır; cron endpoint'i paylaşılan bir secret ile korunur.
- Mevcut 30 sn'lik UI polling ve mock fallback'ler aynen çalışmaya devam eder.

## Sonuç
- Oyuncu arama/filtreleme anında ve kotasız (kendi DB'mizden).
- Canlı skorlar 30 sn gecikmeyle doğru; bitmiş maç istatistikleri kalıcı ve ücretsiz.
- Transfer olmuş oyuncu ertesi gün yeni kulübüyle görünür.
