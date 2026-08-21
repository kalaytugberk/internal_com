import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { useApp } from "@/context/AppContext";
import { AudiencePicker } from "@/components/AudiencePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, ChevronLeft, Percent } from "lucide-react";
import { toast } from "sonner";
import { audienceSummary } from "@/lib/constants";

export const DiscountsManager = () => {
  const [cats, setCats] = useState([]);
  const [items, setItems] = useState([]);
  const [newCat, setNewCat] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(null);

  const load = () => { api.discCats().then(setCats); api.discounts().then(setItems); };
  useEffect(() => { load(); }, []);

  const addCat = async () => { if (!newCat.trim()) return; await api.createDiscCat({ name: newCat }); setNewCat(""); load(); };
  const save = async () => {
    if (!form.brand.trim()) return toast.error("Firma/marka zorunlu");
    await api.createDiscount({ brand: form.brand, description: form.description, rate: form.rate, contact: form.contact, category_id: form.category_id || null, required_points: form.required_points ? parseInt(form.required_points, 10) : null, audience: form.audience });
    setOpen(false); load(); toast.success("İndirim eklendi");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div><h2 className="font-heading font-bold text-xl text-slate-800">İndirim & Ayrıcalıklar</h2><p className="text-sm text-slate-500">Alt kategori tanımla, firma indirimlerini gir.</p></div>
        <Button data-testid="add-disc-btn" className="bg-blue-500 hover:bg-blue-600" onClick={() => { setForm({ brand: "", description: "", rate: "", contact: "", category_id: cats[0]?.id || "", required_points: "", audience: { all: true } }); setOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Yeni İndirim</Button>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 mb-5">
        <p className="font-heading font-semibold text-slate-700 mb-2">Alt Kategoriler</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {cats.map((c) => <span key={c.id} data-testid={`disc-cat-${c.id}`} className="inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1 bg-blue-50 text-blue-600">{c.name}<button data-testid={`disc-cat-del-${c.id}`} onClick={async () => { await api.deleteDiscCat(c.id); load(); }} className="hover:text-rose-500"><Trash2 className="w-3 h-3" /></button></span>)}
          {cats.length === 0 && <span className="text-xs text-slate-400">Henüz alt kategori yok.</span>}
        </div>
        <div className="flex gap-2"><Input data-testid="disc-cat-input" value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="örn. Yeme-İçme" className="max-w-xs" /><Button variant="outline" onClick={addCat} data-testid="disc-cat-add">Ekle</Button></div>
      </div>

      <div className="space-y-3">
        {items.length === 0 && <div className="text-sm text-slate-400 py-10 text-center">Henüz indirim yok.</div>}
        {items.map((d) => (
          <div key={d.id} data-testid={`disc-row-${d.id}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-emerald-50 grid place-items-center shrink-0"><Percent className="w-6 h-6 text-emerald-500" /></div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-800 truncate">{d.brand} {d.rate && <span className="text-emerald-600">· {d.rate}</span>}</h3>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-3 flex-wrap">{d.category_name && <span className="rounded-full px-2 py-0.5 bg-slate-50">{d.category_name}</span>}<span>Hedef: {audienceSummary(d.audience)}</span>{d.required_points ? <span className="text-amber-600">Eşik: {d.required_points}p</span> : null}</p>
            </div>
            <button data-testid={`disc-del-${d.id}`} onClick={async () => { await api.deleteDiscount(d.id); load(); }} className="p-2 rounded-lg text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto pln-scroll">
          <DialogHeader><DialogTitle className="font-heading">Yeni İndirim</DialogTitle><DialogDescription>Firma, açıklama, oran ve görünürlük ayarları.</DialogDescription></DialogHeader>
          {form && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="mb-1.5 block">Firma / Marka</Label><Input data-testid="disc-brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
                <div><Label className="mb-1.5 block">İndirim Oranı</Label><Input data-testid="disc-rate" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} placeholder="%20" /></div>
              </div>
              <div><Label className="mb-1.5 block">Açıklama</Label><Textarea data-testid="disc-desc" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label className="mb-1.5 block">İletişim (kod yok, bilgi)</Label><Input data-testid="disc-contact" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 block">Alt Kategori</Label>
                  <Select value={form.category_id || undefined} onValueChange={(v) => setForm({ ...form, category_id: v })}><SelectTrigger data-testid="disc-cat-select"><SelectValue placeholder="Seçin" /></SelectTrigger><SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
                </div>
                <div><Label className="mb-1.5 block">Gerekli Puan (opsiyonel)</Label><Input type="number" data-testid="disc-points" value={form.required_points} onChange={(e) => setForm({ ...form, required_points: e.target.value })} placeholder="boş = herkese" /></div>
              </div>
              <div><Label className="mb-2 block">Hedef Kitle</Label><AudiencePicker value={form.audience} onChange={(a) => setForm({ ...form, audience: a })} testPrefix="disc-seg" /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>İptal</Button><Button data-testid="disc-save-btn" className="bg-blue-500 hover:bg-blue-600" onClick={save}>Kaydet</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const DiscountsPage = () => {
  const navigate = useNavigate();
  const { currentEmployeeId } = useApp();
  const [items, setItems] = useState([]);
  useEffect(() => { if (currentEmployeeId) api.discountsFeed(currentEmployeeId).then(setItems); }, [currentEmployeeId]);
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <button data-testid="disc-page-back" onClick={() => navigate("/ic-iletisim")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4"><ChevronLeft className="w-4 h-4" /> İç İletişim</button>
      <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-800 flex items-center gap-2"><Percent className="w-7 h-7 text-emerald-500" /> İndirim & Ayrıcalıklar</h1>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
        {items.length === 0 && <div className="sm:col-span-2 rounded-2xl border border-dashed border-slate-300 bg-white/70 py-16 text-center text-slate-400 text-sm">Sana açık indirim yok.</div>}
        {items.map((d) => (
          <div key={d.id} data-testid={`disc-card-${d.id}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between"><h3 className="font-heading font-bold text-slate-800 text-lg">{d.brand}</h3>{d.rate && <span className="text-emerald-600 font-bold">{d.rate}</span>}</div>
            {d.category_name && <span className="text-[11px] rounded-full px-2 py-0.5 bg-emerald-50 text-emerald-600">{d.category_name}</span>}
            <p className="text-slate-600 mt-2 text-sm whitespace-pre-wrap">{d.description}</p>
            {d.contact && <p className="text-xs text-slate-400 mt-2">İletişim: {d.contact}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};
