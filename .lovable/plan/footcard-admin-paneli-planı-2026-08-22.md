# FootCard — Admin Paneli Planı

## Amaç

Uygulama yayına girdikten sonra senin (ve istersen moderatörlerin) kod yazmadan, doğrudan arayüzden içerik ve veri güncellemesi yapabilmesi. Oyuncu/menajer/takım kartları, statik sayfalar, ana sayfa duyuruları ve çeviriler tek merkezden yönetilecek.

## Mevcut durum (doğrulandı)

- Oyuncu, menajer ve takım kartları `src/data/football.ts` içinde sabit yazılı. Her güncelleme kod değişikliği gerektiriyor.
- Statik sayfalar (`/about`, `/privacy`) doğrudan route dosyalarında hard-coded metinlerle tutuluyor.
- Supabase'de `profiles`, `favorites`, `xp_events`, `standings`, `api_cache` gibi kullanıcı/veri tabloları var ama içerik yönetimi için hiçbir tablo yok.
- `useAuth` hook'u ve `_authenticated` layout'u hazır; sadece admin rolü ve yönetim rotaları eksik.

## Admin paneli kapsamı

### 1. Rol tabanlı erişim

- Sadece senin hesabına (ve istersen atayacağın moderatörlere) açık.
- `user_roles` tablosu + `has_role` güvenlik tanımlayıcı fonksiyonu ile yönetilir.
- `/admin` rotası `_authenticated` altında, ek bir `beforeLoad` rol kapısıyla korunur.

### 2. Kart yönetimi

- Oyuncu, menajer ve takım kartlarını listeleme, arama, filtreleme.
- Kart detayında tüm alanları düzenleme: isim, kulüp, lig, uyruk, pozisyon, ratingler, piyasa değeri, sözleşme bitişi, sakatlık, fotoğraf URL'si, API id.
- Yeni kart ekleme ve mevcut kartı silme.
- Kartların "taslak" veya "yayında" durumu; taslaklar kullanıcıya görünmez.
- Değişiklikler anında uygulamaya yansır (uygulama artık DB'den okur).

### 3. Sayfa yönetimi

- `/about`, `/privacy` ve gelecekte eklenecek `/terms`, `/faq` gibi statik sayfaların başlık, açıklama ve içerik metinlerini düzenleme.
- Sayfa yayın durumu ve son güncelleme zamanı.

### 4. Duyuru / banner yönetimi

- Ana sayfada veya belirli rotalarda gösterilecek duyuru/banner metni, bağlantısı, başlangıç-bitiş tarihi ve aktif/pasif durumu.

### 5. Çeviri yönetimi (opsiyonel ilk aşama)

- TR ve EN i18n anahtarlarını arayüzden güncelleme. Diğer 33 dil için önce İngilizce kaynak güncellenir, istenirse otomatik çeviri entegrasyonu sonraki aşamada eklenir.

## Teknik mimari

```text
┌─────────────────────────────────────────┐
│  /admin  (sadece admin/moderator)       │
│  ├── Dashboard                          │
│  ├── Cards (oyuncu/menajer/takım)       │
│  ├── Pages (hakkımızda/gizlilik)        │
│  ├── Announcements                      │
│  └── Translations                       │
└─────────────────────────────────────────┘
                   │
     src/lib/admin.functions.ts
     (requireSupabaseAuth + rol kontrolü)
                   │
     Supabase tabloları: user_roles,
     cms_cards, cms_pages, cms_announcements,
     cms_translations
```

## Veritabanı değişiklikleri

Yeni tablolar:

- `user_roles`: `user_id`, `role` (admin/moderator), unique(user_id, role).
- `cms_cards`: kart verilerinin tamamı (oyuncu/menajer/takım ayrımı `type` alanıyla).
- `cms_pages`: slug, title, meta description, body JSON/blocks, published flag.
- `cms_announcements`: title, body, link, start_at, end_at, active flag.
- `cms_translations`: locale, namespace, key, value.

Her tabloya `created_at` / `updated_at`, RLS ve gerekli GRANT'ler eklenir.

## Backend

- `src/lib/admin.functions.ts`: listeleme, getirme, ekleme, güncelleme, silme fonksiyonları.
- Her fonksiyonda önce `context.supabase.rpc('has_role', ...)` ile admin/moderator kontrolü yapılır; yetkisiz çağrı 403 döner.
- `cms_cards` gibi büyük tablolarda sayfalama ve arama desteği.

## Frontend

- `src/routes/_authenticated.admin.tsx`: admin layout (sol menü + Outlet).
- `src/routes/_authenticated.admin.index.tsx`: dashboard (son güncellemeler, istatistikler).
- `src/routes/_authenticated.admin.cards.tsx`: kart listesi ve düzenleme.
- `src/routes/_authenticated.admin.pages.tsx`: sayfa listesi ve düzenleme.
- `src/routes/_authenticated.admin.announcements.tsx`: duyuru yönetimi.
- `src/routes/_authenticated.admin.translations.tsx`: çeviri yönetimi.

## Mevcut verilerin taşınması

- `src/data/football.ts` içindeki `players`, `managers`, `teams` dizileri `cms_cards` tablosuna tohum (seed) verisi olarak aktarılır.
- Aktarım sonrası uygulama hem `cms_cards` hem de yerel katalogdan okuyabilir; ilk aşamada yerel katalog yedek kalır, admin panelinden yapılan güncellemeler önceliklidir.
- İstendiğinde yerel katalog tamamen kaldırılıp DB tek kaynak yapılır.

## Güvenlik

- Admin rotaları sadece `_authenticated` altında ve rol kapısıyla açılır.
- Sunucu fonksiyonlarında RLS + `has_role` çift kontrolü.
- `supabaseAdmin` sadece gerekirse ve yetkilendirme sonrası kullanılır.
- Moderatör rolüne sadece içerik düzenleme izni verilir; admin rolüne silme ve rol atama izni verilir.

## Doğrulama

- `/admin` rotasına giriş yapmamış kullanıcı `/auth`'a yönlendirilir.
- Admin olmayan kullanıcı `/unauthorized` sayfasına yönlendirilir.
- Kart düzenleme sonrası ilgili `/player/$id` veya `/team/$id` sayfası anında yeni veriyi gösterir.
- Sayfa düzenleme sonrası `/about` ve `/privacy` metinleri yenilenir.
