import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { useApp } from "@/context/AppContext";
import { AudiencePicker } from "@/components/AudiencePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, ChevronLeft, Utensils, Download } from "lucide-react";
import { toast } from "sonner";
import { audienceSummary } from "@/lib/constants";

const blankDay = () => ({ label: "", meals: [{ name: "", calorie: "" }] });
const blank = () => ({ name: "", audience: { all: true }, days: [blankDay()] });

const exportCsv = (c) => {
  const rows = [["Gün", "Yemek", "Kalori"]];
  (c.days || []).forEach((d) => (d.meals || []).forEach((m) => rows.push([d.label, m.name, m.calorie || ""])));
  const csv = rows.map((r) => r.map((x) => `"${(x || "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${c.name || "yemekhane"}.csv`; a.click();
};

export const CanteenManager = () => {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(null);

  const load = () => api.canteens().then(setItems);
  useEffect(() => { load(); }, []);

  const setDay = (i, patch) => setForm((f) => ({ ...f, days: f.days.map((d, idx) => idx === i ? { ...d, ...patch } : d) }));
  const setMeal = (di, mi, patch) => setForm((f) => ({ ...f, days: f.days.map((d, idx) => idx === di ? { ...d, meals: d.meals.map((m, j) => j === mi ? { ...m, ...patch } : m) } : d) }));
  const addDay = () => setForm((f) => ({ ...f, days: [...f.days, blankDay()] }));
  const delDay = (i) => setForm((f) => ({ ...f, days: f.days.filter((_, idx) => idx !== i) }));
  const addMeal = (di) => setForm((f) => ({ ...f, days: f.days.map((d, idx) => idx === di ? { ...d, meals: [...d.meals, { name: "", calorie: "" }] } : d) }));
  const delMeal = (di, mi) => setForm((f) => ({ ...f, days: f.days.map((d, idx) => idx === di ? { ...d, meals: d.meals.filter((_, j) => j !== mi) } : d) }));

  const save = async () => {
    if (!form.name.trim()) return toast.error("Yemekhane adı zorunlu");
    const days = form.days.filter((d) => d.label.trim()).map((d) => ({ ...d, meals: d.meals.filter((m) => m.name.trim()) }));
    const payload = { name: form.name, audience: form.audience, days };
    if (form.id) await api.updateCanteen(form.id, payload); else await api.createCanteen(payload);
    setOpen(false); load(); toast.success("Yemekhane kaydedildi");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div><h2 className="font-heading font-bold text-xl text-slate-800">Yemekhane Listesi</h2><p className="text-sm text-slate-500">Yemekhane/lokasyon başına gün ve öğün menüsü tanımla.</p></div>
        <Button data-testid="add-canteen-btn" className="bg-blue-500 hover:bg-blue-600" onClick={() => { setForm(blank()); setOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Yeni Yemekhane</Button>
      </div>

      <div className="space-y-3">
        {items.length === 0 && <div className="text-sm text-slate-400 py-10 text-center">Henüz yemekhane yok.</div>}
        {items.map((c) => (
          <div key={c.id} data-testid={`canteen-row-${c.id}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-orange-50 grid place-items-center shrink-0"><Utensils className="w-6 h-6 text-orange-500" /></div>
            <div className="flex-1 min-w-0"><h3 className="font-semibold text-slate-800 truncate">{c.name}</h3><p className="text-xs text-slate-400 mt-0.5">{c.days?.length || 0} gün · Hedef: {audienceSummary(c.audience)}</p></div>
            <button data-testid={`canteen-export-${c.id}`} onClick={() => exportCsv(c)} className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50" title="Excel'e aktar"><Download className="w-4 h-4" /></button>
            <button data-testid={`canteen-edit-${c.id}`} onClick={() => { setForm({ ...c, days: c.days?.length ? c.days.map((d) => ({ ...d, meals: d.meals?.length ? d.meals : [{ name: "", calorie: "" }] })) : [blankDay()] }); setOpen(true); }} className="p-2 rounded-lg text-slate-400 hover:text-blue-500">Düzenle</button>
            <button data-testid={`canteen-del-${c.id}`} onClick={async () => { await api.deleteCanteen(c.id); load(); }} className="p-2 rounded-lg text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto pln-scroll">
          <DialogHeader><DialogTitle className="font-heading">{form?.id ? "Yemekhaneyi Düzenle" : "Yeni Yemekhane"}</DialogTitle><DialogDescription>Ad, hedef kitle ve gün/öğün menüsü.</DialogDescription></DialogHeader>
          {form && (
            <div className="space-y-4 py-2">
              <div><Label className="mb-1.5 block">Yemekhane / Lokasyon Adı</Label><Input data-testid="canteen-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="örn. Merkez Ofis Yemekhanesi" /></div>
              <div>
                <div className="flex items-center justify-between mb-2"><Label>Günler</Label><Button type="button" size="sm" variant="ghost" onClick={addDay} data-testid="canteen-add-day" className="text-blue-600 h-7"><Plus className="w-3.5 h-3.5 mr-1" /> Gün Ekle</Button></div>
                <div className="space-y-3">
                  {form.days.map((d, di) => (
                    <div key={di} data-testid={`canteen-day-${di}`} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Input data-testid={`canteen-day-label-${di}`} value={d.label} onChange={(e) => setDay(di, { label: e.target.value })} placeholder="örn. 1 Ağustos Cumartesi" />
                        <button type="button" onClick={() => delDay(di)} className="p-1.5 text-slate-400 hover:text-rose-500 shrink-0"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <div className="space-y-2">
                        {d.meals.map((m, mi) => (
                          <div key={mi} className="flex items-center gap-2">
                            <Input data-testid={`canteen-meal-${di}-${mi}`} value={m.name} onChange={(e) => setMeal(di, mi, { name: e.target.value })} placeholder="Yemek adı" className="flex-1" />
                            <Input data-testid={`canteen-cal-${di}-${mi}`} value={m.calorie || ""} onChange={(e) => setMeal(di, mi, { calorie: e.target.value })} placeholder="kcal" className="w-24" />
                            <button type="button" onClick={() => delMeal(di, mi)} className="p-1.5 text-slate-400 hover:text-rose-500 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        ))}
                        <Button type="button" size="sm" variant="ghost" onClick={() => addMeal(di)} data-testid={`canteen-add-meal-${di}`} className="text-blue-600 h-7"><Plus className="w-3.5 h-3.5 mr-1" /> Yemek Ekle</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div><Label className="mb-2 block">Hedef Kitle</Label><AudiencePicker value={form.audience} onChange={(a) => setForm({ ...form, audience: a })} testPrefix="canteen-seg" /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>İptal</Button><Button data-testid="canteen-save-btn" className="bg-blue-500 hover:bg-blue-600" onClick={save}>Kaydet</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const CanteenPage = () => {
  const navigate = useNavigate();
  const { currentEmployeeId } = useApp();
  const [items, setItems] = useState([]);
  useEffect(() => { if (currentEmployeeId) api.canteensFeed(currentEmployeeId).then(setItems); }, [currentEmployeeId]);
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <button data-testid="canteen-page-back" onClick={() => navigate("/ic-iletisim")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4"><ChevronLeft className="w-4 h-4" /> İç İletişim</button>
      <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-800 flex items-center gap-2"><Utensils className="w-7 h-7 text-orange-500" /> Yemekhane Listesi</h1>
      <div className="mt-6 space-y-6">
        {items.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 py-16 text-center text-slate-400 text-sm">Sana açık menü yok.</div>}
        {items.map((c) => (
          <div key={c.id} data-testid={`canteen-card-${c.id}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-heading font-bold text-slate-800 text-lg mb-3">{c.name}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(c.days || []).map((d) => (
                <div key={d.id} className="rounded-xl bg-slate-50 p-3">
                  <p className="font-semibold text-slate-700 text-sm mb-1.5">{d.label}</p>
                  <ul className="space-y-1">{(d.meals || []).map((m, i) => <li key={i} className="text-sm text-slate-600 flex justify-between"><span>{m.name}</span>{m.calorie && <span className="text-slate-400 text-xs">{m.calorie} kcal</span>}</li>)}</ul>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
