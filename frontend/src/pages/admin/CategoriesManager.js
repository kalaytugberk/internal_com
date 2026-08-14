import React, { useEffect, useState } from "react";
import { api } from "@/api";
import { Icon } from "@/lib/icons";
import { IconPicker } from "@/components/IconPicker";
import { SegmentPicker } from "@/components/SegmentPicker";
import { REPORTING_LEVELS, emptyAudience, audienceSummary } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, GripVertical, Pencil, Trash2, Layers, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const blankCategory = () => ({
  category_type: "duyuru", display_name: "", icon: "Megaphone", icon_image: null,
  status: "active", audience: emptyAudience(), reporting_levels: ["kisi"],
  content_type: "pasif", pinnable: true,
});

const CategoryDialog = ({ open, onOpenChange, initial, onSave }) => {
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
              <Label htmlFor="cat-name" className="mb-1.5 block">Görünen Ad</Label>
              <Input id="cat-name" data-testid="cat-name-input" value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="örn. Şirket Haberleri" />
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
            <SegmentPicker value={form.audience} onChange={(a) => setForm({ ...form, audience: a })} testPrefix="cat-seg" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button data-testid="cat-save-btn" className="bg-blue-500 hover:bg-blue-600"
            onClick={() => { if (!form.display_name.trim()) return toast.error("Görünen ad zorunlu"); onSave(form); }}>
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
              {!form.inherit && <SegmentPicker value={form.audience} onChange={(a) => setForm({ ...form, audience: a })} testPrefix="sub-seg" />}
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

export const CategoriesManager = () => {
  const [categories, setCategories] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [dragId, setDragId] = useState(null);
  const [types, setTypes] = useState([]);

  const load = () => api.categories().then(setCategories);
  useEffect(() => { load(); api.categoryTypes().then(setTypes); }, []);

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

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-heading font-bold text-xl text-slate-800">Kategori Tanımlama</h2>
          <p className="text-sm text-slate-500">Sürükle-bırak ile sırala, alt kategori ve hedef kitle yönet.</p>
        </div>
        <Button data-testid="add-category-btn" className="bg-blue-500 hover:bg-blue-600"
          onClick={() => { setEditing(blankCategory()); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Yeni Kategori
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {types.map((t) => (
          <span key={t.key} data-testid={`type-chip-${t.key}`}
            className={["text-xs rounded-full px-3 py-1 border", t.active ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-slate-50 text-slate-400 border-slate-200"].join(" ")}>
            {t.label}{!t.active && " · yakında"}
          </span>
        ))}
      </div>

      <div className="space-y-3">
        {categories.map((cat) => (
          <div
            key={cat.id}
            draggable
            onDragStart={() => setDragId(cat.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(cat.id)}
            data-testid={`cat-row-${cat.id}`}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4"
          >
            <div className="flex items-center gap-3">
              <GripVertical className="w-5 h-5 text-slate-300 cursor-grab shrink-0" />
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 grid place-items-center shrink-0">
                {cat.icon_image ? <img src={cat.icon_image} alt="" className="w-5 h-5 object-contain" /> : <Icon name={cat.icon} className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-heading font-semibold text-slate-800">{cat.display_name}</h3>
                  <span className={["text-[11px] rounded-full px-2 py-0.5", cat.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"].join(" ")}>
                    {cat.status === "active" ? "Aktif" : "Pasif"}
                  </span>
                  {cat.pinnable && <span className="text-[11px] rounded-full px-2 py-0.5 bg-amber-50 text-amber-600">Pinlenebilir</span>}
                  <span className="text-[11px] rounded-full px-2 py-0.5 bg-slate-50 text-slate-500">{cat.content_type === "eylem" ? "Eylem Gerektiren" : "Bilgilendirme"}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Hedef: {audienceSummary(cat.audience)}</p>
              </div>
              <button data-testid={`cat-expand-${cat.id}`} onClick={() => setExpanded({ ...expanded, [cat.id]: !expanded[cat.id] })}
                className="p-2 text-slate-400 hover:text-blue-500 transition-colors">
                <Layers className="w-4 h-4" />
              </button>
              <button data-testid={`cat-edit-${cat.id}`} onClick={() => { setEditing(cat); setDialogOpen(true); }}
                className="p-2 text-slate-400 hover:text-blue-500 transition-colors"><Pencil className="w-4 h-4" /></button>
              <button data-testid={`cat-del-${cat.id}`} onClick={async () => { await api.deleteCategory(cat.id); load(); }}
                className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
            {expanded[cat.id] && <SubcategoryPanel category={cat} />}
          </div>
        ))}
      </div>

      <CategoryDialog open={dialogOpen} onOpenChange={setDialogOpen} initial={editing} onSave={save} />
    </div>
  );
};
