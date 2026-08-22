# FootCard — Her Zaman Güncel Veri (Live Freshness)

## Amaç

Yeni transfer olmuş bir oyuncunun yeni kulübü uygulamada en kısa sürede görünsün. Bunu üç katmanlı bir tazelik sistemiyle çözüyoruz: daha kısa önbellek süreleri, transfer tabanlı "güncel kulüp" katmanı ve elle yenileme düğmesi.

## Sorunun kökü (doğrulandı)

- Öne çıkan oyuncuların kulüp bilgisi `src/data/football.ts` içinde sabit yazılı — hiç güncellenmiyor.
- API verileri (kadro, oyuncu arama, transfer geçmişi) 24 saat önbellekte kalıyor.
- Önbelleği geçersiz kılacak bir yenileme yolu yok.

## Adım 1 — Tazelik katmanları (TTL yeniden ayarı)

Veri türüne göre önbellek süreleri:

```text
Canlı skorlar / maç detayı (oynanan maç)   30–60 sn   (zaten öyle)
Fikstür listesi (günlük)                   5 dk
Puan durumu / gol krallığı                 30 dk
Oyuncu profili + güncel kulüp              1 saat
Takım kadrosu                              6 saat
Transfer geçmişi                           6 saat
Dünya araması sonuçları                    6 saat
Statik bilgi (stadyum, kuruluş yılı)       7 gün
```

Değişen dosyalar: `src/lib/live.functions.ts`, `src/lib/entity.functions.ts`, `src/lib/football-data.functions.ts`, `src/lib/player-search.functions.ts`.

Ayrıca `cached()` yardımcısına **stale-while-revalidate**: süresi dolmuş kayıt varsa önce onu döndür, arka planda taze veriyi çekip önbelleği güncelle — kullanıcı asla boş ekran/yükleme beklemez.

## Adım 2 — "Güncel Kulüp" katmanı (transfer tazeleyici)

API-Football'da en taze transfer kaynağı `/transfers` uç noktası; kadro listesi daha geç güncellenir. Bu yüzden:

- Yeni sunucu fonksiyonu: `getPlayerCurrentClub(apiPlayerId)` — `/transfers?player=` çağırır, en son transferin "in" takımını döndürür (1 saat önbellek).
- Oyuncu profil sayfası (`/player/$id`) ve dünya araması kartları bu katmanı **üst veri** olarak kullanır: listedeki kulüp ne derse desin, gösterilen kulüp son transferden gelir.
- Yerel katalog oyuncularına (`football.ts`) `apiId` alanı eklenir; profil sayfası ve kartlarda kulüp bilgisi API'den canlı çözümlenir, API yoksa katalog değeri yedek olarak kalır.

## Adım 3 — Elle yenileme (cache-bust)

- Oyuncu ve takım sayfalarına "Verileri yenile" düğmesi.
- Yeni sunucu fonksiyonu: `refreshEntity(kind, id)` — ilgili `api_cache` kayıtlarını silip taze çeker, sayfa otomatik güncellenir.
- Kullanıcıya "Son güncelleme: 12 dk önce" rozeti gösterilir (şeffaflık).

## Adım 4 — Takım sayfası transfer işaretleri

- Takım kadro sayfasında son 30 günde transfere konu olmuş oyuncuların yanında "Yeni transfer" rozeti (transfer tarihi `/transfers` verisinden).

## Teknik notlar

- API kota koruması: günlük istek limiti aşımında otomatik olarak mevcut önbellek/mock veriye düşülür (mevcut `cached()` davranışı korunur).
- Hiçbir yeni tablo gerekmez; mevcut `api_cache` altyapısı kullanılır. Sadece TTL değerleri ve iki yeni sunucu fonksiyonu.
- API-Football'ın kendi güncelleme gecikmesi (kadro verisi transferden birkaç saat/gün geç yansıyabilir) bizim kontrolümüz dışında; Adım 2'deki transfer katmanı bu boşluğu kapatır.
- Tüm yeni metinler TR + EN i18n anahtarlarına eklenir.

## Doğrulama

- Önbellek tablosuna kayıt düşüp TTL'lerin yeni değerlerle yazıldığını sorgulama.
- Elle yenileme düğmesiyle kulüp bilgisinin anında güncellendiğini tarayıcıda doğrulama.
- API kapalıyken (anahtar yokken) uygulamanın mock veriyle çalışmaya devam ettiğini doğrulama.
