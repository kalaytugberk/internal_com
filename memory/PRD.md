# PRD — Plena İç İletişim Modülü

## Original Problem Statement
Plena (İK/HR SaaS) için "İç İletişim" modülü. 20+ içerik kategorisini tek çatı altında toplayacak genişletilebilir bir çekirdek altyapı + BİR referans kategori (Duyurular) uçtan uca. İki rol: Admin/İK ve Çalışan (mock role-switcher, gerçek SSO yok). Üst navigasyon mevcut Plena görsel diliyle birebir. Türkçe arayüz, responsive.

## User Choices
- Görsel saklama: base64/URL (bulut depolama yok)
- Onay: aynı admin de onaylayabilir
- Rol geçişi: üstte basit rol seçici (mock-auth)
- Tasarım: birebir Plena dili (mavi vurgu, pastel kartlar, yuvarlak köşeler)

## Architecture
- Backend: FastAPI + MongoDB (motor). uuid string id'ler, `_id` gizli. Başlangıçta seed.
  - Koleksiyonlar: employees, categories, subcategories, announcements
  - Audience çözümü: announcement → subcategory → category (miras); employee_matches OR semantiği
- Frontend: React 19 + React Router + Tailwind + shadcn/ui. AppContext (role + currentEmployee).
- Genişletilebilirlik: category_type enum (sadece "duyuru" aktif), tekrar kullanılabilir SegmentPicker + IconPicker + genel Pin mekanizması.

## User Personas
- **Admin/İK**: kategori/alt kategori tanımlar, duyuru oluşturur/onaylar, pinler, raporlama seviyesi seçer.
- **Çalışan**: hedef kitlesine giren yayınlanmış duyuruları görür, detay açar.

## Core Requirements (static)
1. App shell — Plena üst menü (Ana Sayfa/Takım/İç İletişim/İK/Takvim), arama, rol seçici, bildirim, profil
2. Segmentasyon motoru (Departman/Lokasyon/Unvan/Kıdem + Tüm Çalışanlar)
3. Kategori tanımlama motoru (ikon, ad, sıra sürükle-bırak, durum, hedef kitle, alt öğe hedef kitle, raporlama seviyesi, içerik tipi, pinleme)
4. Duyurular: admin oluşturma/onay akışı (Taslak/Onay Bekliyor/Yayında/Pasif), kanallar, alt kategoriler; çalışan akışı + detay
5. İç İletişim ana ekranı (grid + genişletilmiş Duyuru kartı + Öne Çıkanlar pin şeridi)

## Implemented (2026-08-14)
- ✅ **Faz 3a + geliştirmeler** (2026-08-21): **İSG-Ramak Kala (7.11)** — admin config (anonimlik modu, durum takibi Yeni/İnceleniyor/Kapatıldı, olay etiketleri); çalışan olay bildirimi (etiket+metin+görsel+anonimlik moduna göre), admin durum güncelleme, çalışan kendi bildirim durumları. **Toplantı Odası (7.15)** — oda CRUD (ad/lokasyon/kapasite/ekipman/onay modu/hedef kitle), çalışan rezervasyon (çakışma kontrolü 400, bitişik izinli, auto=onaylı/approval=beklemede), kendi rezervasyonunu iptal. **Geliştirme:** İndirim kartlarına logo/görsel; Hap Bilgi tek kalp yerine çoklu emoji tepkisi (👍❤️😮). Koleksiyonlar: isg_config/ramak_reports, rooms/reservations. Testing (iteration_15): backend 11/11, frontend %100.
- ✅ **Faz 2 — Hap Bilgi / İndirim / Yemekhane** (2026-08-21): (7.7 Hap Bilgi) serbest konu başlıkları (sadece sınıflandırma) + başlık/metin/görsel içerik, çalışan konuya göre filtreli akış + beğeni. (7.14 İndirim & Ayrıcalıklar) serbest alt kategori + firma/oran/açıklama/iletişim, opsiyonel `required_points` yalnızca görünürlük eşiği (harcanmaz; puan sistemi yok → >0 gizli), hedef kitle (AudiencePicker). (7.20 Yemekhane) çoklu yemekhane, her biri kendi hedef kitlesi + gün/öğün (ad+kalori) menüsü, CSV/Excel dışa aktarım (içe yükleme sonraya). Koleksiyonlar: hap_topics/hap_posts, disc_cats/discounts, canteens. Testing (iteration_14): backend 5/5, frontend %100.
- ✅ **Faz 1 — Bildirim Motoru** (2026-08-21): Paylaşılan "2 özel yanıt seçenekli bildirim + takip" motoru. **Anlık Bildirim (7.6)** ve **İSG — Acil Durum (7.10)** kategorileri. Admin/İK doğrudan gönderir (onay yok): mesaj, kanal (SMS/Push/Mail — GÖNDERİM MOCK), hedef kitle (AudiencePicker), bildirim bazında 2 özel yanıt seçeneği; İSG'de opsiyonel otomatik hatırlatma. Çalışan: öncelikli kesinti banner'ı (İSG kırmızı ve öncelikli, Anlık mavi), 2 buton ile yanıt → kilitlenir; ayrıca geçmiş sayfası. Rapor: yanıt oranı %, seçenek dağılımı, kim yanıtladı/yanıtlamadı. Koleksiyonlar: `notifications`, `notification_responses`. Testing (iteration_13): backend 7/7, frontend %100.- ✅ Tüm 5 çekirdek gereksinim uçtan uca çalışır (testing agent: backend 100%, frontend 100%)
- ✅ 8 mock çalışan, 1 kategori (Duyurular), 3 alt kategori, 4 örnek duyuru seed
- ✅ Onay akışı, pinleme, hedef kitle filtreli çalışan akışı doğrulandı
- ✅ İK sayfası (kart grid) eklendi; "İç İletişim Platformu" kartı modüle giriş yapar; İK sekmesi yalnızca admin'e görünür
- ✅ **Pulse Anketi kategorisi** eklendi (2026-08-14): Kategori motoru + Segmentasyon bileşeni yeniden kullanıldı. Admin: soru havuzu (1-5 sert limit), skor/emoji & tek seçim tipleri, opsiyonel yorum, zorunlu/anonim/sıklık/başlangıç ayarları, hedef kitle. Raporlama: Şirket (trend), Organizasyon Birimi (departman bar), Kişi Bazlı (anonimse gizli), soru bazlı trend/dağılım + yorumlar, yanıt oranı. Çalışan: pulse akışı (Doldurulmadı/Dolduruldu rozeti), zorunlu pulse banner'ı (görsel), adım adım doldurma (emoji yüzler + radio + yorum), teşekkür ekranı, kişisel skor trendi. Testing agent: backend 23/23, frontend %100 (banner refresh bug'ı düzeltildi).

- ✅ **4 yeni özellik** eklendi (2026-08-14): (1) Ana Sayfa "Almam Gereken Aksiyonlar" widget'ı — çalışanın doldurmadığı zorunlu pulse'ları + yaklaşan etkinlikleri gösterir. (2) Pulse Karşılaştırma — rapora eklenen sekme, iki tarih aralığının ortalama skorlarını yan yana + fark + trend. (3) Rapor Dışa Aktarma — pulse raporunu departman kırılımıyla CSV olarak indirir. (4) Etkinlik (RSVP) kategorisi — 3. aktif kart; admin CRUD + RSVP sayaçları, çalışan feed + detay + Katılıyorum/Belki/Katılmıyorum. Testing agent (iteration_3+4): backend 100%, frontend 100% (AdminPanel Etkinlikler tab bug'ı düzeltildi).

- ✅ **3 yeni özellik** eklendi (2026-08-14): (1) Onay Kutusu — admin etkinlik silmede AlertDialog onayı ("Etkinliği sil?" + İptal/Sil). (2) Etkinlik Raporu — etkinlik başına RSVP dağılımı + departman kırılımı (yığılmış bar grafiği + detay tablosu + katılım oranı). (3) Takvim Görünümü — Takvim sekmesinde aylık takvim, etkinlikler günlerinde işaretli, gün seçimi + yaklaşan etkinlikler yan paneli, ay ileri/geri. Testing agent (iteration_5): backend 100% (6/6), frontend 100%.

- ✅ **Günlük Mod** (2026-08-14): tek sabit kategori, çalışan emoji (1-5) günlük girişi (günde bir kez), kendi 7 günlük trendi, hatırlatma banner'ı; admin tek ayar sayfası + KATI GİZLİLİK raporu (asla bireysel veri — yalnızca ortalamalar, departman filtresi). Testing: backend 6/6, frontend 100%.
- ✅ **İlanlar** (2026-08-14): iç ilan panosu (Satılık/Kiralık/Aranıyor). Çalışan ilan oluşturma (5 foto, profilden otomatik iletişim, düzenlenebilir), Duyurular onay akışı (Onay Bekliyor→Yayında/Reddedildi), Keşfet feed (tür filtresi + kalan gün), detay, "İlanlarım" + İlanı Kapat, süresi dolan otomatik "Süresi Doldu". Admin: ayarlar (bildirim kanalları + varsayılan süre) + onay kuyruğu + tüm ilanlar (filtre/arama). Ayrıca rol/çalışan seçimi artık localStorage'da kalıcı. Testing: backend 12/12, frontend 100% E2E.

- ✅ **Avatar Seçimi** (2026-08-14): 5. kategori. Kategori "alt öğe" mekanizması yeniden kullanıldı — çoklu Konsept, her biri kendi hedef kitlesiyle (boşsa üst kategoriden miras). Konsept başına 12 DiceBear avatarı otomatik üretilir. Çalışan yalnızca hedef kitlesine uyan konseptleri görür (örn. "Yönetici Özel" yalnızca Yönetici/Direktör), avatar seçip profiline kaydeder (sınırsız değişiklik), seçim üst menü profil avatarına yansır. Admin: konsept CRUD + galeri (avatar ekle/sil) + popülerlik raporu. Onay akışı yok. Testing: backend 11/11, frontend 100% E2E.

- ✅ **Servis Güzergahı** (2026-08-14): 7. kategori tipi (`servis`). Admin: güzergah CRUD — ad, yön (gidiş/dönüş), lokasyon (şehir), araç/plaka, şoför (ad+telefon), sıralı duraklar (ad + saat + opsiyonel harita adresi). Çalışan: TÜM aktif güzergahları görür (şehir filtre chip'leri + güzergah/durak arama), detayda araç/şoför bilgisi + gömülü Google Maps iframe (anahtarsız, `output=embed`) + durak zaman çizelgesi; bir durağı seçip "Bu durağı kullanıyorum" ile kayıt olur/kaydı kaldırır. Admin raporu: güzergah bazında kayıt sayısı (bar) + durak bazında dağılım. Koleksiyonlar: `routes`, `route_registrations`. Testing (iteration_9): backend 9/9, frontend 100% E2E.

- ✅ **Admin "Kategori Yönetimi" kart ızgarası** (2026-08-21): Admin paneli ilk sekmesi liste yerine mockup'a uygun pastel kart ızgarasına dönüştürüldü. 7 aktif kategori kartı (pastel katalogdan döngüsel renk) + 8 "Yakında" önizleme kartı (İSG, Anlık bildirim, Hap bilgi, Kudos, Rozet/oyunlaştırma, İndirim & ayrıcalıklar, Toplantı odası, Şirketin enleri). Karta tıklayınca ilgili yönetim sekmesi açılır (duyuru→announcements, pulse→pulse, etkinlik→events, gunluk_mod→mood, ilan→listings, avatar→avatar, servis→routes); "Yakında" kartına tıklayınca bilgi toast'ı, yönlendirme yok. Kart üstünde hover ikonları: tanım düzenle, alt kategoriler, sil (AlertDialog). Sürükle-bırak sıralama korunur. Testing (iteration_10): frontend 100%.

- ✅ **İsimli Hedef Kitle (Audiences) + kart ikonları** (2026-08-21): Hedef kitle artık isimli, kriter-tabanlı ve yeniden kullanılabilir. Tüm hedef kitle seçim noktalarında (kategori/alt kategori/duyuru/pulse/etkinlik/mod ayarı/ilan ayarı/avatar konsept) eski checkbox SegmentPicker yerine kompakt `AudiencePicker` geldi: "Tüm Çalışanlar" + kayıtlı hedef kitleler (isimle) Select'i + "Yeni Hedef Kitle Oluştur" butonu. Buton büyük "Hedef Kitle Tanımlama" builder'ını açar (ad, açıklama, modül, Mevcut Tanımdan Kopyala, Dahil/Hariç kriterler, Önizleme, Kaydet). Backend `audiences` koleksiyonu + CRUD + `/audiences/preview`; `employee_matches` hem yeni {includes,excludes} hem eski {all,departments...} şemasını destekler (geriye dönük uyumlu). Kriter mantığı: dahil kriterler AND (değer içi OR), hariç kriterler çıkarır. Ayrıca admin Kategori Yönetimi kartlarına ikon eklendi. Testing (iteration_12): backend 7/7, frontend 100%.

- ✅ **Kategori seçimi sabit 20'lik combo** (2026-08-21): "Yeni Kategori" penceresinde serbest ad girişi kaldırıldı; admin sabit 20 kategori kataloğundan (Pulse, Günlük Mod, İlanlar, Avatar, Servis, Anlık Bildirim, Hap Bilgi, Duyurular, Etkinlik, İSG-Acil, İSG-Ramak Kala, Kudos, Rozet/Oyunlaştırma, İndirim & Ayrıcalıklar, Toplantı Odası, Şirketin Enleri, Oyun, Kutlama, Topluluk, Yemekhane) combo ile seçer — kendi yeni ad ekleyemez. Seçim otomatik olarak görünen adı + varsayılan ikonu doldurur; ikon yine IconPicker ile değiştirilebilir. Zaten eklenmiş tipler combo'da "· ekli" ile pasiftir (tekrar önlenir). Düzenlemede combo kilitli (tip değişmez). Testing (iteration_11): frontend 100% (6/6).

## Backlog / Remaining
- P1: Diğer kategori tipleri (Etkinlik, Kudos, Oyunlaştırma, İlan...)
- P1: Duyuru için raporlama ekranları
- P2: Gerçek bildirim gönderimi (Mail/Push/SMS), gerçek zamanlayıcı/cron (pulse sıklığı), gerçek SSO/İK entegrasyonu, bulut dosya depolama
- P2: Zorunlu pulse için gerçek engelleme mimarisi

## Notes / Mocked
- Bildirim kanalları yalnızca veri modelinde tutulur (GERÇEK GÖNDERİM YOK — MOCKED)
- Kimlik doğrulama mock role-switcher (GERÇEK AUTH YOK — MOCKED)
- Görseller base64/URL olarak saklanır
