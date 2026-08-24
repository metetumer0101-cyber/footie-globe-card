# Plan: SportMonks'tan Tüm Oyuncu Verilerini Düzgün Çekme

## Teşhis (doğrulandı)
- `world_players` tablosu **tamamen boş** — hiç oyuncu senkronize olmamış.
- Sebep: senkron kodu (`player-db.server.ts`) `sportmonks_id` ve `provider` kolonlarına yazmaya çalışıyor, ama tabloda bu kolonlar **yok**; ayrıca `api_id` (birincil anahtar) `null` gönderiliyor. Her upsert hata verip sessizce 0 satır dönüyor.
- SportMonks token'ı çalışıyor (bugün `sm:fixtures` çağrıları başarılı) — sorun sadece oyuncu yazma katmanında.
- Pozisyonlar ham sayı (`"25"`) olarak yazılıyor; arama/filtrelerde isim ("Forvet") lazım.

## Adım 1 — Şema düzeltmesi (migration)
- `world_players` tablosuna ekle: `sportmonks_id` (benzersiz), `provider` (varsayılan 'sportmonks'), `market_value` ve `jersey_number` gibi eksik faydalı alanlar.
- `api_id`'yi opsiyonel hale getir (SportMonks artık ana kimlik).

## Adım 2 — Senkronizasyon kodunu düzelt
- Upsert artık gerçek kolonlara, `sportmonks_id` çakışma anahtarıyla yazacak.
- Pozisyon ID'leri isme çevrilecek (Kaleci/Defans/Orta Saha/Forvet haritası) — Scout ve Kadro Kurucu filtreleri çalışsın.
- Takım/kulüp adı ve güncel sezon doğruluğu korunacak (transfer olmuş oyuncu ertesi gün yeni kulübüyle görünür).

## Adım 3 — Kapsamı genişlet: tüm oyuncular
- Mevcut 35 lig listesi korunacak; ek olarak SportMonks planının izin verdiği **tüm ligler** döngüye alınacak (lig → sezon → takımlar → kadrolar zinciriyle).
- Global `/players` uç noktası, lig dışı kalan oyuncular için tamamlayıcı tarama olarak kullanılacak (sayfalı çekim).
- Plan izin veriyorsa sezon istatistikleri (gol/asist/maç/dakika/reyting) de yazılacak — yazılamıyorsa UI'da "-" kalır, uydurma sıfır gösterilmez.

## Adım 4 — Çalıştır ve doğrula
- Tek lig (Süper Lig) ile deneme senkronu → veriyi DB'de ve uygulamada kontrol.
- Sonra tam toplu senkron (admin panelinden / tek seferlik script).
- Gece 03:00 UTC cron'u etkin kalır; transferler otomatik güncellenir.
- Doğrulama: Dünya Araması, Scout ve Kadro Kurucu artık boş değil gerçek oyuncularla dolu olmalı (kota harcamadan, kendi DB'mizden).

## Teknik notlar
- Migration: `ALTER TABLE world_players ADD COLUMN sportmonks_id INTEGER UNIQUE, provider TEXT NOT NULL DEFAULT 'sportmonks', ...` + `api_id` NULL yapılır. RLS/grant değişmez (tablo zaten var).
- Düzenlenecek dosyalar: `src/lib/player-db.server.ts` (upsert + pozisyon haritası + lig kapsamı), gerekirse `src/routes/api/public/cron/sync-players.ts`.
- Mevcut davranış korunur: arama önce DB'ye bakar, bulunamazsa canlı API'ye düşer.

## Sonuç
- `world_players` gerçekten dolacak: tüm oyuncular aranabilir/filtrelenebilir, anında ve kotasız.
- Pozisyon, kulüp, yaş, fotoğraf doğru; transferler günlük güncel.
