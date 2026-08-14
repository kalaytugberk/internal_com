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
- ✅ Tüm 5 çekirdek gereksinim uçtan uca çalışır (testing agent: backend 100%, frontend 100%)
- ✅ 8 mock çalışan, 1 kategori (Duyurular), 3 alt kategori, 4 örnek duyuru seed
- ✅ Onay akışı, pinleme, hedef kitle filtreli çalışan akışı doğrulandı
- ✅ İK sayfası (kart grid) eklendi; "İç İletişim Platformu" kartı modüle giriş yapar; İK sekmesi yalnızca admin'e görünür
- ✅ **Pulse Anketi kategorisi** eklendi (2026-08-14): Kategori motoru + Segmentasyon bileşeni yeniden kullanıldı. Admin: soru havuzu (1-5 sert limit), skor/emoji & tek seçim tipleri, opsiyonel yorum, zorunlu/anonim/sıklık/başlangıç ayarları, hedef kitle. Raporlama: Şirket (trend), Organizasyon Birimi (departman bar), Kişi Bazlı (anonimse gizli), soru bazlı trend/dağılım + yorumlar, yanıt oranı. Çalışan: pulse akışı (Doldurulmadı/Dolduruldu rozeti), zorunlu pulse banner'ı (görsel), adım adım doldurma (emoji yüzler + radio + yorum), teşekkür ekranı, kişisel skor trendi. Testing agent: backend 23/23, frontend %100 (banner refresh bug'ı düzeltildi).

- ✅ **4 yeni özellik** eklendi (2026-08-14): (1) Ana Sayfa "Almam Gereken Aksiyonlar" widget'ı — çalışanın doldurmadığı zorunlu pulse'ları + yaklaşan etkinlikleri gösterir. (2) Pulse Karşılaştırma — rapora eklenen sekme, iki tarih aralığının ortalama skorlarını yan yana + fark + trend. (3) Rapor Dışa Aktarma — pulse raporunu departman kırılımıyla CSV olarak indirir. (4) Etkinlik (RSVP) kategorisi — 3. aktif kart; admin CRUD + RSVP sayaçları, çalışan feed + detay + Katılıyorum/Belki/Katılmıyorum. Testing agent (iteration_3+4): backend 100%, frontend 100% (AdminPanel Etkinlikler tab bug'ı düzeltildi).

- ✅ **3 yeni özellik** eklendi (2026-08-14): (1) Onay Kutusu — admin etkinlik silmede AlertDialog onayı ("Etkinliği sil?" + İptal/Sil). (2) Etkinlik Raporu — etkinlik başına RSVP dağılımı + departman kırılımı (yığılmış bar grafiği + detay tablosu + katılım oranı). (3) Takvim Görünümü — Takvim sekmesinde aylık takvim, etkinlikler günlerinde işaretli, gün seçimi + yaklaşan etkinlikler yan paneli, ay ileri/geri. Testing agent (iteration_5): backend 100% (6/6), frontend 100%.

## Backlog / Remaining
- P1: Diğer kategori tipleri (Etkinlik, Kudos, Oyunlaştırma, İlan...)
- P1: Duyuru için raporlama ekranları
- P2: Gerçek bildirim gönderimi (Mail/Push/SMS), gerçek zamanlayıcı/cron (pulse sıklığı), gerçek SSO/İK entegrasyonu, bulut dosya depolama
- P2: Zorunlu pulse için gerçek engelleme mimarisi

## Notes / Mocked
- Bildirim kanalları yalnızca veri modelinde tutulur (GERÇEK GÖNDERİM YOK — MOCKED)
- Kimlik doğrulama mock role-switcher (GERÇEK AUTH YOK — MOCKED)
- Görseller base64/URL olarak saklanır
