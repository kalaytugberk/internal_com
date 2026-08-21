import React, { useEffect, useState } from "react";
import { api } from "@/api";
import { Icon } from "@/lib/icons";
import { IconPicker } from "@/components/IconPicker";
import { AudiencePicker } from "@/components/AudiencePicker";
import { REPORTING_LEVELS, emptyAudience, audienceSummary } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Layers } from "lucide-react";
import { toast } from "sonner";

// Sabit 20 kategori kataloğu — admin listeden seçer, yeni ad giremez
const CATEGORY_MASTER = [
  { type: "pulse", label: "Pulse Anketi", icon: "Activity" },
  { type: "gunluk_mod", label: "Çalışan Hisleri (Günlük Mod)", icon: "Smile" },
  { type: "ilan", label: "İlanlar", icon: "Tag" },
  { type: "avatar", label: "Avatar Seçimi", icon: "Sparkles" },
  { type: "servis", label: "Servis Güzergahı", icon: "Bus" },
  { type: "anlik_bildirim", label: "Anlık Bildirim", icon: "Bell" },
  { type: "hap_bilgi", label: "Hap Bilgi", icon: "Lightbulb" },
  { type: "duyuru", label: "Duyurular", icon: "Megaphone" },
  { type: "etkinlik", label: "Etkinlik", icon: "Calendar" },
  { type: "isg_acil", label: "İSG — Acil Durum", icon: "ShieldAlert" },
  { type: "isg_ramak", label: "İSG — Ramak Kala", icon: "AlertTriangle" },
  { type: "kudos", label: "Kudos", icon: "Award" },
  { type: "rozet", label: "Rozet / Oyunlaştırma", icon: "Trophy" },
  { type: "indirim", label: "İndirim & Ayrıcalıklar", icon: "Percent" },
  { type: "toplanti_odasi", label: "Toplantı Odası Rezervasyonu", icon: "DoorOpen" },
  { type: "sirket_enleri", label: "Şirketin Enleri (Ayın Çalışanı)", icon: "Star" },
  { type: "oyun", label: "Oyun (Bildim Aldım)", icon: "Gamepad2" },
  { type: "kutlama", label: "Kutlama (Doğum Günü / Kıdem / Yeni İşe Başlayan)", icon: "PartyPopper" },
  { type: "topluluk", label: "Topluluk", icon: "Users" },
  { type: "yemekhane", label: "Yemekhane Listesi", icon: "Utensils" },
];
const MASTER_BY_TYPE = Object.fromEntries(CATEGORY_MASTER.map((c) => [c.type, c]));

// Pastel katalog — kartlar sırayla bu paletten renk alır
const PASTELS = [
  { bg: "bg-emerald-50", border: "border-emerald-100/80" },
  { bg: "bg-sky-50", border: "border-sky-100/80" },
  { bg: "bg-amber-50", border: "border-amber-100/80" },
  { bg: "bg-rose-50", border: "border-rose-100/80" },
  { bg: "bg-orange-50", border: "border-orange-100/80" },
  { bg: "bg-violet-50", border: "border-violet-100/80" },
];

// Aktif kategori tipi -> admin yönetim sekmesi + açıklama
const CATALOG = {
  duyuru: { tab: "announcements", desc: "Şirket içi duyuruları buradan yönetebilirsiniz." },
  pulse: { tab: "pulse", desc: "Nabız anketlerini buradan yönetebilirsiniz." },
  etkinlik: { tab: "events", desc: "Şirket etkinliklerini buradan yönetebilirsiniz." },
  gunluk_mod: { tab: "mood", desc: "Çalışan hislerini buradan izleyebilirsiniz." },
  ilan: { tab: "listings", desc: "Çalışan ilanlarını buradan onaylayabilirsiniz." },
  avatar: { tab: "avatar", desc: "Avatar konseptlerini buradan yönetebilirsiniz." },
  servis: { tab: "routes", desc: "Servis seferlerini buradan tanımlayabilirsiniz." },
  anlik_bildirim: { tab: "anlik", desc: "Anlık bildirim gönder ve yanıtları takip et." },
  isg_acil: { tab: "isg", desc: "Acil durum bildirimi ve gerçek zamanlı yanıt takibi." },
  hap_bilgi: { tab: "hapbilgi", desc: "Konu bazlı kısa bilgilendirmeler." },
  indirim: { tab: "indirim", desc: "Çalışan indirim ve ayrıcalıklarını yönet." },
  yemekhane: { tab: "yemekhane", desc: "Yemekhane menülerini gün bazında tanımla." },
  isg_ramak: { tab: "isgramak", desc: "Ramak kala bildirimleri ve durum takibi." },
  toplanti_odasi: { tab: "rooms", desc: "Toplantı odası tanımları ve rezervasyonlar." },
};

// Henüz yapılmamış kategoriler (yakında)
const FUTURE_CATALOG = [
  { key: "kudos", label: "Kudos", desc: "Takdir ve teşekkür kuralları.", icon: "Award" },
  { key: "rozet", label: "Rozet / oyunlaştırma", desc: "Puan kaynakları ve rozet kriterleri.", icon: "Trophy" },
  { key: "sirket_enleri", label: "Şirketin enleri", desc: "Ayın çalışanı ve ödül başlıkları.", icon: "Star" },
];

const blankCategory = () => ({
  category_type: "", display_name: "", icon: "Megaphone", icon_image: null,
  status: "active", audience: emptyAudience(), reporting_levels: ["kisi"],
  content_type: "pasif", pinnable: true,
});

const CategoryDialog = ({ open, onOpenChange, initial, onSave, existingTypes = [] }) => {
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial, open]);
  if (!form) return null;

  const toggleReporting = (key) => {
    const has = form.reporting_levels.includes(key);
    setForm({ ...form, reporting_levels: has ? form.reporting_levels.filter((k) => k !== key) : [...form.reporting_levels, key] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto pln-scroll">
        <DialogHeader>
          <DialogTitle className="font-heading">{form.id ? "Kategoriyi Düzenle" : "Yeni Kategori"}</DialogTitle>
          <DialogDescription>Kategori ayarlarını ve hedef kitleyi yapılandırın.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="flex items-end gap-3">
            <div>
              <Label className="mb-1.5 block">İkon</Label>
              <IconPicker value={form.icon} onChange={(v) => setForm({ ...form, icon: v })} testPrefix="cat-icon" />
            </div>
            <div className="flex-1">
              <Label className="mb-1.5 block">Kategori</Label>
              <Select
                value={form.category_type || ""}
                disabled={!!form.id}
                onValueChange={(v) => {
                  const m = MASTER_BY_TYPE[v];
                  setForm({ ...form, category_type: v, display_name: m?.label || v, icon: m?.icon || form.icon });
                }}
              >
                <SelectTrigger data-testid="cat-type-select"><SelectValue placeholder="Listeden kategori seçin" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {CATEGORY_MASTER.map((c) => {
                    const taken = !form.id && existingTypes.includes(c.type);
                    return (
                      <SelectItem key={c.type} value={c.type} disabled={taken} data-testid={`cat-type-opt-${c.type}`}>
                        {c.label}{taken ? " · ekli" : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block">Özel İkon Görseli (URL, opsiyonel)</Label>
            <Input data-testid="cat-iconimg-input" value={form.icon_image || ""} placeholder="https://..."
              onChange={(e) => setForm({ ...form, icon_image: e.target.value || null })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
              <span className="text-sm font-medium text-slate-700">Durum: {form.status === "active" ? "Aktif" : "Pasif"}</span>
              <Switch data-testid="cat-status-switch" checked={form.status === "active"}
                onCheckedChange={(c) => setForm({ ...form, status: c ? "active" : "passive" })} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
              <span className="text-sm font-medium text-slate-700">Pinleme</span>
              <Switch data-testid="cat-pin-switch" checked={form.pinnable}
                onCheckedChange={(c) => setForm({ ...form, pinnable: c })} />
            </div>
          </div>

          <div>
            <Label className="mb-2 block">İçerik Tipi</Label>
            <RadioGroup value={form.content_type} onValueChange={(v) => setForm({ ...form, content_type: v })} className="flex gap-6">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <RadioGroupItem value="pasif" data-testid="cat-ct-pasif" /> Pasif / Bilgilendirme
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <RadioGroupItem value="eylem" data-testid="cat-ct-eylem" /> Eylem Gerektiren
              </label>
            </RadioGroup>
          </div>

          <div>
            <Label className="mb-2 block">Raporlama Seviyesi (çoklu)</Label>
            <div className="flex gap-5">
              {REPORTING_LEVELS.map((r) => (
                <label key={r.key} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <Checkbox checked={form.reporting_levels.includes(r.key)} onCheckedChange={() => toggleReporting(r.key)}
                    data-testid={`cat-rep-${r.key}`} />
                  {r.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Hedef Kitle</Label>
            <AudiencePicker value={form.audience} onChange={(a) => setForm({ ...form, audience: a })} testPrefix="cat-seg" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button data-testid="cat-save-btn" className="bg-blue-500 hover:bg-blue-600"
            onClick={() => { if (!form.category_type) return toast.error("Lütfen listeden bir kategori seçin"); onSave(form); }}>
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const SubcategoryPanel = ({ category }) => {
  const [subs, setSubs] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(null);

  const load = () => api.subcategories(category.id).then(setSubs);
  useEffect(() => { load(); }, [category.id]);

  const save = async () => {
    if (!form.name.trim()) return toast.error("İsim zorunlu");
    const payload = { name: form.name, icon: form.icon, audience: form.inherit ? null : form.audience };
    if (form.id) await api.updateSubcategory(form.id, payload);
    else await api.createSubcategory({ category_id: category.id, ...payload });
    setOpen(false); load(); toast.success("Alt kategori kaydedildi");
  };

  const openNew = () => { setForm({ name: "", icon: "FileText", inherit: true, audience: emptyAudience() }); setOpen(true); };
  const openEdit = (s) => { setForm({ id: s.id, name: s.name, icon: s.icon, inherit: !s.audience, audience: s.audience || emptyAudience() }); setOpen(true); };

  return (
    <div className="mt-3 pl-4 border-l-2 border-slate-100 space-y-2">
      {subs.map((s) => (
        <div key={s.id} className="flex items-center gap-2 text-sm text-slate-600" data-testid={`sub-row-${s.id}`}>
          <Icon name={s.icon} className="w-4 h-4 text-slate-400" />
          <span className="flex-1">{s.name}</span>
          <span className="text-[11px] text-slate-400">{s.audience ? audienceSummary(s.audience) : "Üstten miras"}</span>
          <button data-testid={`sub-edit-${s.id}`} onClick={() => openEdit(s)} className="p-1 text-slate-400 hover:text-blue-500"><Pencil className="w-3.5 h-3.5" /></button>
          <button data-testid={`sub-del-${s.id}`} onClick={async () => { await api.deleteSubcategory(s.id); load(); }} className="p-1 text-slate-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={openNew} data-testid={`sub-add-${category.id}`} className="text-blue-600 h-7 px-2">
        <Plus className="w-3.5 h-3.5 mr-1" /> Alt kategori ekle
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto pln-scroll">
          <DialogHeader><DialogTitle className="font-heading">Alt Kategori</DialogTitle><DialogDescription>Alt kategori adını, ikonunu ve hedef kitlesini belirleyin.</DialogDescription></DialogHeader>
          {form && (
            <div className="space-y-4 py-2">
              <div className="flex items-end gap-3">
                <div><Label className="mb-1.5 block">İkon</Label><IconPicker value={form.icon} onChange={(v) => setForm({ ...form, icon: v })} testPrefix="sub-icon" /></div>
                <div className="flex-1"><Label className="mb-1.5 block">İsim</Label>
                  <Input data-testid="sub-name-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="örn. Doğum Haberleri" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <Checkbox checked={form.inherit} onCheckedChange={(c) => setForm({ ...form, inherit: c })} data-testid="sub-inherit" />
                Hedef kitleyi üst kategoriden miras al
              </label>
              {!form.inherit && <AudiencePicker value={form.audience} onChange={(a) => setForm({ ...form, audience: a })} testPrefix="sub-seg" />}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button data-testid="sub-save-btn" className="bg-blue-500 hover:bg-blue-600" onClick={save}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const CategoriesManager = ({ onOpen }) => {
  const [categories, setCategories] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [dragId, setDragId] = useState(null);

  const load = () => api.categories().then(setCategories);
  useEffect(() => { load(); }, []);

  const save = async (form) => {
    if (form.id) {
      const { id, order, created_at, category_type, ...rest } = form;
      await api.updateCategory(id, rest);
    } else {
      await api.createCategory(form);
    }
    setDialogOpen(false); load(); toast.success("Kategori kaydedildi");
  };

  const onDrop = async (targetId) => {
    if (!dragId || dragId === targetId) return;
    const ids = categories.map((c) => c.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    setCategories(ids.map((id) => categories.find((c) => c.id === id)));
    setDragId(null);
    const updated = await api.reorderCategories(ids);
    setCategories(updated);
  };

  const openManager = (cat) => {
    const meta = CATALOG[cat.category_type];
    if (meta?.tab && onOpen) onOpen(meta.tab);
    else { setEditing(cat); setDialogOpen(true); }
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-slate-400 mb-1">İK / İç iletişim platformu</p>
          <h2 className="font-heading font-bold text-2xl text-slate-800">Kategori Yönetimi</h2>
          <p className="text-sm text-slate-500 mt-1">Sürükle-bırak ile sırala, kategoriye tıklayarak tanımlamaları ve raporlamayı yönet.</p>
        </div>
        <Button data-testid="add-category-btn" className="bg-blue-500 hover:bg-blue-600"
          onClick={() => { setEditing(blankCategory()); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Yeni Kategori
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {categories.map((cat, i) => {
          const p = PASTELS[i % PASTELS.length];
          const meta = CATALOG[cat.category_type];
          const desc = meta?.desc || `Hedef: ${audienceSummary(cat.audience)}`;
          return (
            <React.Fragment key={cat.id}>
              <div
                draggable
                onDragStart={() => setDragId(cat.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(cat.id)}
                onClick={() => openManager(cat)}
                data-testid={`cat-card-${cat.id}`}
                className={`group relative cursor-pointer rounded-2xl border ${p.border} ${p.bg} p-6 min-h-[132px] transition-all hover:shadow-md hover:-translate-y-0.5`}
              >
                <div className="absolute top-3 right-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button data-testid={`cat-subs-${cat.id}`} title="Alt kategoriler"
                    onClick={(e) => { e.stopPropagation(); setExpanded({ ...expanded, [cat.id]: !expanded[cat.id] }); }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-white/70"><Layers className="w-4 h-4" /></button>
                  <button data-testid={`cat-edit-${cat.id}`} title="Tanımı düzenle"
                    onClick={(e) => { e.stopPropagation(); setEditing(cat); setDialogOpen(true); }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-white/70"><Pencil className="w-4 h-4" /></button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button data-testid={`cat-del-${cat.id}`} title="Sil" onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-white/70"><Trash2 className="w-4 h-4" /></button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-heading">Kategoriyi sil?</AlertDialogTitle>
                        <AlertDialogDescription>"{cat.display_name}" kategorisi silinecek. Bu işlem geri alınamaz.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel data-testid={`cat-del-cancel-${cat.id}`}>İptal</AlertDialogCancel>
                        <AlertDialogAction data-testid={`cat-del-confirm-${cat.id}`} className="bg-rose-500 hover:bg-rose-600"
                          onClick={async () => { await api.deleteCategory(cat.id); load(); toast.success("Kategori silindi"); }}>Sil</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <div className="flex items-center gap-2.5 pr-16">
                  <div className="w-9 h-9 rounded-lg bg-white/70 grid place-items-center text-slate-700 shrink-0">
                    {cat.icon_image ? <img src={cat.icon_image} alt="" className="w-5 h-5 object-contain" /> : <Icon name={cat.icon} className="w-5 h-5" />}
                  </div>
                  <h3 className="font-heading font-bold text-slate-800 text-lg">{cat.display_name}</h3>
                </div>
                <p className="text-sm text-slate-500 mt-2">{desc}</p>
                {cat.status !== "active" && (
                  <span className="mt-3 inline-block text-[11px] rounded-full px-2 py-0.5 bg-white/70 text-slate-500">Pasif</span>
                )}
              </div>
              {expanded[cat.id] && (
                <div className="col-span-full rounded-2xl border border-slate-100 bg-white shadow-sm p-4" data-testid={`cat-subpanel-${cat.id}`}>
                  <p className="text-sm font-heading font-semibold text-slate-700 mb-1">{cat.display_name} · Alt Kategoriler</p>
                  <SubcategoryPanel category={cat} />
                </div>
              )}
            </React.Fragment>
          );
        })}

        {FUTURE_CATALOG.map((f, idx) => {
          const p = PASTELS[(categories.length + idx) % PASTELS.length];
          return (
            <div key={f.key} data-testid={`cat-future-${f.key}`}
              onClick={() => toast.info(`${f.label} · yakında eklenecek`)}
              className={`relative cursor-pointer rounded-2xl border ${p.border} ${p.bg} p-6 min-h-[132px] transition-all hover:shadow-md hover:-translate-y-0.5`}>
              <span className="absolute top-3 right-3 text-[10px] rounded-full px-2 py-0.5 bg-white/70 text-slate-500">Yakında</span>
              <div className="flex items-center gap-2.5 pr-16">
                <div className="w-9 h-9 rounded-lg bg-white/70 grid place-items-center text-slate-400 shrink-0"><Icon name={f.icon} className="w-5 h-5" /></div>
                <h3 className="font-heading font-bold text-slate-800 text-lg">{f.label}</h3>
              </div>
              <p className="text-sm text-slate-500 mt-2">{f.desc}</p>
            </div>
          );
        })}
      </div>

      <CategoryDialog open={dialogOpen} onOpenChange={setDialogOpen} initial={editing} onSave={save} existingTypes={categories.map((c) => c.category_type)} />
    </div>
  );
};
