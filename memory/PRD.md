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

## Backlog / Remaining
- P1: Diğer 19 kategori tipini aktifleştirme (Etkinlik, Anket, Kudos, Oyunlaştırma, İlan...)
- P1: Raporlama ekranları (kişi/organizasyon/şirket kırılımı)
- P2: Gerçek bildirim gönderimi (Mail/Push/SMS), gerçek SSO/İK entegrasyonu, bulut dosya depolama
- P2: Yorum/RSVP/oy gibi kategoriye özel etkileşimler

## Notes / Mocked
- Bildirim kanalları yalnızca veri modelinde tutulur (GERÇEK GÖNDERİM YOK — MOCKED)
- Kimlik doğrulama mock role-switcher (GERÇEK AUTH YOK — MOCKED)
- Görseller base64/URL olarak saklanır
