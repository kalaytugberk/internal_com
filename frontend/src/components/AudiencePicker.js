import React, { useEffect, useState } from "react";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Users2, Plus, Trash2, Eye, Sparkles } from "lucide-react";
import { toast } from "sonner";

const FIELDS = [
  { key: "department", label: "Departman", opt: "departments" },
  { key: "location", label: "Lokasyon", opt: "locations" },
  { key: "title", label: "Unvan", opt: "titles" },
  { key: "seniority", label: "Kıdem", opt: "seniorities" },
];

const summarize = (aud) => {
  if (!aud || aud.all) return "Tüm Çalışanlar";
  if (aud.name) return aud.name;
  if (aud.includes || aud.excludes) {
    const inc = (aud.includes || []).flatMap((c) => c.values || []);
    return inc.length ? inc.join(", ") : "Tüm Çalışanlar";
  }
  const parts = [];
  ["departments", "locations", "titles", "seniorities"].forEach((k) => (aud[k] || []).forEach((v) => parts.push(v)));
  return parts.length ? parts.join(", ") : "Tüm Çalışanlar";
};

const CriteriaEditor = ({ title, subtitle, tone, list, onChange, options, testPrefix }) => {
  const add = () => onChange([...(list || []), { field: "department", values: [] }]);
  const upd = (i, patch) => onChange(list.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const del = (i) => onChange(list.filter((_, idx) => idx !== i));
  const toggleVal = (i, v) => {
    const c = list[i]; const vals = c.values || [];
    upd(i, { values: vals.includes(v) ? vals.filter((x) => x !== v) : [...vals, v] });
  };
  const toneCls = tone === "include" ? "border-emerald-200 bg-emerald-50/50" : "border-rose-200 bg-rose-50/50";
  const titleCls = tone === "include" ? "text-emerald-700" : "text-rose-600";
  return (
    <div className={`rounded-2xl border ${toneCls} p-5`}>
      <h4 className={`font-heading font-bold ${titleCls}`}>{title}</h4>
      <p className="text-xs text-slate-500 mb-3">{subtitle}</p>
      <div className="space-y-3">
        {(list || []).length === 0 && (
          <div className="rounded-xl bg-white border border-slate-100 py-6 text-center text-sm text-slate-400">
            {tone === "include" ? "Henüz kriter eklenmedi." : "Hariç tutulacak kriter eklenmedi."}
          </div>
        )}
        {(list || []).map((c, i) => {
          const opt = FIELDS.find((f) => f.key === c.field)?.opt;
          return (
            <div key={i} data-testid={`${testPrefix}-crit-${i}`} className="rounded-xl bg-white border border-slate-200 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Select value={c.field} onValueChange={(v) => upd(i, { field: v, values: [] })}>
                  <SelectTrigger className="w-40" data-testid={`${testPrefix}-field-${i}`}><SelectValue /></SelectTrigger>
                  <SelectContent>{FIELDS.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}</SelectContent>
                </Select>
                <span className="text-xs text-slate-400">şunlardan biri:</span>
                <button type="button" onClick={() => del(i)} data-testid={`${testPrefix}-del-${i}`} className="ml-auto p-1.5 text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(options[opt] || []).map((v) => {
                  const on = (c.values || []).includes(v);
                  return (
                    <button type="button" key={v} onClick={() => toggleVal(i, v)} data-testid={`${testPrefix}-val-${i}-${v}`}
                      className={`text-xs rounded-full px-3 py-1 border transition-colors ${on ? "bg-blue-500 text-white border-blue-500" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>{v}</button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <button type="button" onClick={add} data-testid={`${testPrefix}-add`} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"><Plus className="w-4 h-4" /> Kriter Ekle</button>
    </div>
  );
};

export const AudienceBuilder = ({ open, onOpenChange, audiences = [], onSaved }) => {
  const [options, setOptions] = useState({ departments: [], locations: [], titles: [], seniorities: [] });
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (open) {
      api.segmentOptions().then(setOptions);
      setForm({ name: "", description: "", module: "İç İletişim", includes: [], excludes: [] });
    }
  }, [open]);

  if (!form) return null;

  const copyFrom = (id) => {
    const a = audiences.find((x) => x.id === id);
    if (a) setForm((f) => ({ ...f, includes: JSON.parse(JSON.stringify(a.includes || [])), excludes: JSON.parse(JSON.stringify(a.excludes || [])) }));
  };
  const preview = async () => {
    const r = await api.previewAudience({ includes: form.includes, excludes: form.excludes });
    toast.success(`${r.count}/${r.total} çalışan eşleşiyor`);
  };
  const save = async () => {
    if (!form.name.trim()) return toast.error("Hedef kitle adı zorunlu");
    const saved = await api.createAudience(form);
    toast.success("Hedef kitle kaydedildi");
    onSaved?.(saved);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto pln-scroll">
        <DialogHeader>
          <DialogTitle className="font-heading">Hedef Kitle Tanımlama</DialogTitle>
          <DialogDescription>İsimli, yeniden kullanılabilir hedef kitle tanımı oluşturun.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-1">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-700">Hedef Kitle Bilgileri</p>
            <div>
              <Label className="mb-1 block text-xs">Mevcut Tanımdan Kopyala</Label>
              <Select onValueChange={copyFrom}>
                <SelectTrigger data-testid="aud-copy-select"><SelectValue placeholder="Mevcut Tanımdan Kopyala" /></SelectTrigger>
                <SelectContent>{audiences.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="mb-1 block text-xs">Hedef Kitle Adı</Label><Input data-testid="aud-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="örn. İstanbul Mühendislik" /></div>
              <div>
                <Label className="mb-1 block text-xs">Modül</Label>
                <Select value={form.module} onValueChange={(v) => setForm({ ...form, module: v })}>
                  <SelectTrigger data-testid="aud-module"><SelectValue /></SelectTrigger>
                  <SelectContent>{["İç İletişim", "Performans", "İK", "Genel"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="mb-1 block text-xs">Açıklama</Label><Input data-testid="aud-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Açıklama" /></div>
          </div>

          <CriteriaEditor tone="include" title="Dahil Edilecek Kriterler" subtitle="Bu koşulları sağlayan çalışanlar hedef kitleye dahil edilir." list={form.includes} onChange={(l) => setForm({ ...form, includes: l })} options={options} testPrefix="aud-inc" />
          <CriteriaEditor tone="exclude" title="Hariç Tutulacak Kriterler" subtitle="Yukarıdaki koşulları sağlayanlar arasından çıkarılır." list={form.excludes} onChange={(l) => setForm({ ...form, excludes: l })} options={options} testPrefix="aud-exc" />

          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-sm text-slate-500">
            <p className="font-heading font-semibold text-slate-700 mb-2">Kriterler nasıl çalışır?</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Dahil kriterler birlikte değerlendirilir (hepsi sağlanmalı).</li>
              <li>Bir kriter içinde seçilen değerlerden en az biri sağlanmalıdır.</li>
              <li>Hariç kriterler, dahil edilen sonuçtan çıkarılır.</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={preview} data-testid="aud-preview"><Eye className="w-4 h-4 mr-1" /> Önizleme</Button>
          <Button className="bg-blue-500 hover:bg-blue-600" onClick={save} data-testid="aud-save"><Sparkles className="w-4 h-4 mr-1" /> Kaydet</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Drop-in replacement for SegmentPicker. value: audience object, onChange, testPrefix
export const AudiencePicker = ({ value, onChange, testPrefix = "aud" }) => {
  const [audiences, setAudiences] = useState([]);
  const [builderOpen, setBuilderOpen] = useState(false);

  useEffect(() => { api.audiences().then(setAudiences); }, []);

  const isAll = !value || value.all;
  const selectedKey = isAll ? "all" : (value.id || "__custom__");

  const onSelect = (key) => {
    if (key === "all") return onChange({ all: true, departments: [], locations: [], titles: [], seniorities: [] });
    if (key === "__custom__") return;
    const a = audiences.find((x) => x.id === key);
    if (a) onChange({ id: a.id, name: a.name, includes: a.includes || [], excludes: a.excludes || [] });
  };
  const onSaved = (saved) => {
    setAudiences((l) => [...l, saved]);
    onChange({ id: saved.id, name: saved.name, includes: saved.includes || [], excludes: saved.excludes || [] });
  };

  return (
    <div data-testid={`${testPrefix}-picker`} className="space-y-2">
      <div className="flex items-center gap-2">
        <Select value={selectedKey} onValueChange={onSelect}>
          <SelectTrigger className="flex-1" data-testid={`${testPrefix}-select`}><SelectValue placeholder="Hedef kitle seçin" /></SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all"><span className="inline-flex items-center gap-1.5"><Users2 className="w-3.5 h-3.5 text-blue-500" /> Tüm Çalışanlar</span></SelectItem>
            {selectedKey === "__custom__" && <SelectItem value="__custom__">Özel Seçim ({summarize(value)})</SelectItem>}
            {audiences.map((a) => <SelectItem key={a.id} value={a.id} data-testid={`${testPrefix}-opt-${a.id}`}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button type="button" className="bg-blue-500 hover:bg-blue-600 shrink-0" onClick={() => setBuilderOpen(true)} data-testid={`${testPrefix}-new`}>Yeni Hedef Kitle Oluştur</Button>
      </div>
      <p className="text-xs text-slate-400">Hedef: {summarize(value)}</p>
      <AudienceBuilder open={builderOpen} onOpenChange={setBuilderOpen} audiences={audiences} onSaved={onSaved} />
    </div>
  );
};
