import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/api";
import { useApp } from "@/context/AppContext";
import { LISTING_TYPES, LISTING_STATUS, typeMeta, remainingDays } from "@/lib/listings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ChevronLeft, Plus, Phone, Clock, X, ImagePlus, User } from "lucide-react";
import { toast } from "sonner";

// ---------------- Feed + My Listings ----------------
export const ListingsFeed = () => {
  const navigate = useNavigate();
  const { currentEmployeeId } = useApp();
  const [tab, setTab] = useState("kesfet");
  const [typeF, setTypeF] = useState("all");
  const [items, setItems] = useState([]);
  const [mine, setMine] = useState([]);

  const loadFeed = () => currentEmployeeId && api.listingsFeed(currentEmployeeId, typeF === "all" ? undefined : typeF).then(setItems);
  const loadMine = () => currentEmployeeId && api.myListings(currentEmployeeId).then(setMine);
  useEffect(() => { loadFeed(); }, [currentEmployeeId, typeF]);
  useEffect(() => { loadMine(); }, [currentEmployeeId]);

  const close = async (id) => { await api.closeListing(id); loadMine(); loadFeed(); toast.success("İlan kapatıldı"); };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <button data-testid="listings-back" onClick={() => navigate("/ic-iletisim")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4">
        <ChevronLeft className="w-4 h-4" /> İç İletişim
      </button>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-slate-800">İlanlar</h1>
        <Button data-testid="new-listing-btn" className="bg-blue-500 hover:bg-blue-600" onClick={() => navigate("/ic-iletisim/ilanlar/yeni")}><Plus className="w-4 h-4 mr-1" /> Yeni İlan</Button>
      </div>

      <div className="flex gap-2 mt-5 mb-5 border-b border-slate-200">
        {[{ k: "kesfet", l: "Keşfet" }, { k: "benim", l: "İlanlarım" }].map((t) => (
          <button key={t.k} data-testid={`listings-tab-${t.k}`} onClick={() => setTab(t.k)}
            className={["px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors", tab === t.k ? "text-blue-600 border-blue-600" : "text-slate-500 border-transparent hover:text-slate-800"].join(" ")}>{t.l}</button>
        ))}
      </div>

      {tab === "kesfet" && (
        <>
          <div className="flex gap-1.5 mb-5 flex-wrap">
            {[{ key: "all", label: "Tümü" }, ...LISTING_TYPES].map((t) => (
              <button key={t.key} data-testid={`listings-filter-${t.key}`} onClick={() => setTypeF(t.key)}
                className={["text-xs rounded-full px-3 py-1.5 font-medium transition-colors", typeF === t.key ? "bg-blue-500 text-white" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"].join(" ")}>{t.label}</button>
            ))}
          </div>
          <div className="space-y-3">
            {items.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 py-16 text-center text-slate-400 text-sm">Yayında ilan yok.</div>}
            {items.map((l) => {
              const tm = typeMeta(l.type); const rem = remainingDays(l.expires_at);
              return (
                <button key={l.id} data-testid={`listing-feed-${l.id}`} onClick={() => navigate(`/ic-iletisim/ilanlar/${l.id}`)}
                  className="w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                  {l.images?.[0] ? <img src={l.images[0]} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" /> : <div className="w-16 h-16 rounded-lg bg-slate-50 grid place-items-center shrink-0 text-slate-300"><Clock className="w-6 h-6" /></div>}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap"><h3 className="font-semibold text-slate-800 truncate">{l.title}</h3><span className={`text-[11px] rounded-full px-2 py-0.5 ${tm.cls}`}>{tm.label}</span></div>
                    <p className="text-xs text-slate-400 mt-0.5">{l.owner_name}{rem !== null ? ` · ${rem} gün kaldı` : ""}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {tab === "benim" && (
        <div className="space-y-3">
          {mine.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 py-16 text-center text-slate-400 text-sm">Henüz ilanın yok.</div>}
          {mine.map((l) => {
            const tm = typeMeta(l.type); const sm = LISTING_STATUS[l.status]; const rem = remainingDays(l.expires_at);
            return (
              <div key={l.id} data-testid={`mylisting-${l.id}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
                {l.images?.[0] ? <img src={l.images[0]} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" /> : <div className="w-14 h-14 rounded-lg bg-slate-50 grid place-items-center shrink-0 text-slate-300"><Clock className="w-5 h-5" /></div>}
                <button onClick={() => navigate(`/ic-iletisim/ilanlar/${l.id}`)} className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2 flex-wrap"><h3 className="font-semibold text-slate-800 truncate">{l.title}</h3><span className={`text-[11px] rounded-full px-2 py-0.5 ${tm.cls}`}>{tm.label}</span><span className={`text-[11px] rounded-full px-2 py-0.5 ${sm.cls}`}>{sm.label}</span></div>
                  <p className="text-xs text-slate-400 mt-0.5">{new Date(l.created_at).toLocaleDateString("tr-TR")}{rem !== null && l.status === "yayinda" ? ` · ${rem} gün kaldı` : ""}</p>
                </button>
                {l.status === "yayinda" && <Button variant="outline" size="sm" data-testid={`listing-close-${l.id}`} onClick={() => close(l.id)}>İlanı Kapat</Button>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ---------------- Create ----------------
export const ListingCreate = () => {
  const navigate = useNavigate();
  const { currentEmployeeId, currentEmployee } = useApp();
  const defaultContact = currentEmployee ? `${currentEmployee.email || ""} · ${currentEmployee.phone || ""}` : "";
  const [form, setForm] = useState({ type: "satilik", title: "", description: "", images: [], contact: "" });

  useEffect(() => { setForm((f) => ({ ...f, contact: f.contact || defaultContact })); }, [defaultContact]);

  const onImages = (e) => {
    const files = Array.from(e.target.files || []);
    if (form.images.length + files.length > 5) return toast.error("En fazla 5 fotoğraf");
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setForm((f) => ({ ...f, images: [...f.images, reader.result] }));
      reader.readAsDataURL(file);
    });
  };
  const removeImage = (i) => setForm({ ...form, images: form.images.filter((_, idx) => idx !== i) });

  const submit = async () => {
    if (!form.title.trim()) return toast.error("Başlık zorunlu");
    await api.createListing({ employee_id: currentEmployeeId, ...form });
    toast.success("İlanın onay için gönderildi");
    navigate("/ic-iletisim/ilanlar");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8" data-testid="listing-create">
      <button data-testid="create-back" onClick={() => navigate("/ic-iletisim/ilanlar")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4"><ChevronLeft className="w-4 h-4" /> İlanlar</button>
      <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-slate-800">Yeni İlan</h1>
      <p className="text-sm text-slate-500 mt-1">İlanın gönderildikten sonra onay sürecine girer.</p>

      <div className="mt-6 rounded-2xl border border-slate-100 bg-white shadow-sm p-6 space-y-5">
        <div>
          <Label className="mb-2 block">İlan Türü</Label>
          <RadioGroup value={form.type} onValueChange={(v) => setForm({ ...form, type: v })} className="flex gap-6">
            {LISTING_TYPES.map((t) => (
              <label key={t.key} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <RadioGroupItem value={t.key} data-testid={`listing-type-${t.key}`} /> {t.label}
              </label>
            ))}
          </RadioGroup>
        </div>
        <div><Label className="mb-1.5 block">Başlık</Label><Input data-testid="listing-title-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="örn. Satılık otomobil" /></div>
        <div><Label className="mb-1.5 block">Açıklama</Label><Textarea data-testid="listing-desc-input" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div>
          <Label className="mb-1.5 block">Fotoğraflar (en fazla 5)</Label>
          <div className="flex flex-wrap gap-3">
            {form.images.map((img, i) => (
              <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button onClick={() => removeImage(i)} className="absolute top-0.5 right-0.5 bg-black/50 rounded-full p-0.5 text-white"><X className="w-3 h-3" /></button>
              </div>
            ))}
            {form.images.length < 5 && (
              <>
                <input id="listing-imgs" type="file" accept="image/*" multiple onChange={onImages} className="hidden" />
                <button data-testid="listing-add-images" onClick={() => document.getElementById("listing-imgs").click()} className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 grid place-items-center text-slate-400 hover:border-blue-400 hover:text-blue-500"><ImagePlus className="w-6 h-6" /></button>
              </>
            )}
          </div>
        </div>
        <div>
          <Label className="mb-1.5 block flex items-center gap-1.5"><Phone className="w-4 h-4 text-slate-400" /> İletişim Bilgisi</Label>
          <Input data-testid="listing-contact-input" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="Telefon / e-posta" />
          <p className="text-xs text-slate-400 mt-1">Profilinden otomatik dolduruldu; bu ilana özel değiştirebilirsin.</p>
        </div>
        <div className="flex justify-end"><Button data-testid="listing-submit" className="bg-blue-500 hover:bg-blue-600 px-8" onClick={submit}>Gönder</Button></div>
      </div>
    </div>
  );
};

// ---------------- Detail ----------------
export const ListingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [l, setL] = useState(null);
  useEffect(() => { api.listing(id).then(setL).catch(() => setL(null)); }, [id]);
  if (!l) return <div className="py-16 text-center text-slate-400">Yükleniyor...</div>;
  const tm = typeMeta(l.type); const rem = remainingDays(l.expires_at);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8" data-testid="listing-detail">
      <button data-testid="detail-back" onClick={() => navigate("/ic-iletisim/ilanlar")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4"><ChevronLeft className="w-4 h-4" /> İlanlar</button>
      <div className="flex items-center gap-2 flex-wrap mb-2"><span className={`text-xs rounded-full px-3 py-1 ${tm.cls}`}>{tm.label}</span>{rem !== null && l.status === "yayinda" && <span className="text-xs text-slate-400">{rem} gün kaldı</span>}</div>
      <h1 className="text-3xl font-heading font-bold text-slate-800 leading-tight">{l.title}</h1>

      {l.images?.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
          {l.images.map((img, i) => <img key={i} src={img} alt="" className="w-full h-40 object-cover rounded-xl" />)}
        </div>
      )}

      <p className="mt-6 text-slate-600 leading-relaxed whitespace-pre-wrap">{l.description}</p>

      <div className="mt-8 rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
        <div className="flex items-center gap-2 text-slate-700"><User className="w-4 h-4 text-slate-400" /> <span className="font-semibold">{l.owner_name}</span></div>
        <div className="flex items-center gap-2 text-slate-600 mt-2"><Phone className="w-4 h-4 text-slate-400" /> {l.contact || "—"}</div>
      </div>
    </div>
  );
};
