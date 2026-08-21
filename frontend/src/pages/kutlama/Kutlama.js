import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ChevronLeft, PartyPopper, Trash2, Cake, Award } from "lucide-react";
import { toast } from "sonner";

const SUBTYPES = { dogum_gunu: "Doğum Günü", kidem: "Kıdem Kutlaması", yeni_baslayan: "Yeni İşe Başlayan" };

export const KutlamaManager = () => {
  const [tpls, setTpls] = useState([]);
  const [subtype, setSubtype] = useState("dogum_gunu");

  const load = () => api.celTemplates().then(setTpls);
  useEffect(() => { load(); }, []);

  const onImg = (e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = async () => { await api.createTemplate({ subtype, image: r.result }); load(); toast.success("Şablon eklendi"); }; r.readAsDataURL(f); };

  return (
    <div>
      <h2 className="font-heading font-bold text-xl text-slate-800 mb-1">Kutlama</h2>
      <p className="text-sm text-slate-500 mb-5">Alt tip başına görsel şablon galerisi. Kutlamalar İK verisinden (doğum/işe giriş) otomatik üretilir.</p>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 mb-5 flex items-end gap-3 flex-wrap">
        <div>
          <Label className="mb-1.5 block">Alt Tip</Label>
          <Select value={subtype} onValueChange={setSubtype}><SelectTrigger className="w-56" data-testid="tpl-subtype"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(SUBTYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
        </div>
        <input id="tpl-img" type="file" accept="image/*" onChange={onImg} className="hidden" />
        <Button variant="outline" onClick={() => document.getElementById("tpl-img").click()} data-testid="tpl-upload">Şablon Yükle</Button>
      </div>

      {Object.entries(SUBTYPES).map(([k, v]) => {
        const list = tpls.filter((t) => t.subtype === k);
        return (
          <div key={k} className="mb-5">
            <p className="font-heading font-semibold text-slate-700 mb-2">{v} ({list.length})</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {list.length === 0 && <span className="text-xs text-slate-400">Şablon yok.</span>}
              {list.map((t) => (
                <div key={t.id} data-testid={`tpl-${t.id}`} className="relative rounded-xl overflow-hidden border border-slate-100">
                  <img src={t.image} alt="" className="w-full h-24 object-cover" />
                  <button data-testid={`tpl-del-${t.id}`} onClick={async () => { await api.deleteTemplate(t.id); load(); }} className="absolute top-1 right-1 p-1 rounded-lg bg-white/90 text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ICONS = { dogum_gunu: Cake, kidem: Award, yeni_baslayan: PartyPopper };

export const KutlamaPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  useEffect(() => { api.celebrationsFeed().then(setItems); }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <button data-testid="kutlama-page-back" onClick={() => navigate("/ic-iletisim")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4"><ChevronLeft className="w-4 h-4" /> İç İletişim</button>
      <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-800 flex items-center gap-2"><PartyPopper className="w-7 h-7 text-pink-500" /> Kutlamalar</h1>
      <p className="text-sm text-slate-500 mt-1">Bu ayki doğum günleri, kıdem ve yeni başlayanlar.</p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.length === 0 && <div className="sm:col-span-2 rounded-2xl border border-dashed border-slate-300 bg-white/70 py-16 text-center text-slate-400 text-sm">Bu ay kutlama yok.</div>}
        {items.map((c, i) => {
          const I = ICONS[c.subtype] || PartyPopper;
          return (
            <div key={i} data-testid={`celebration-${i}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {c.image ? <img src={c.image} alt="" className="w-full h-32 object-cover" /> : <div className="w-full h-24 bg-gradient-to-r from-pink-100 to-amber-100 grid place-items-center"><I className="w-10 h-10 text-pink-400" /></div>}
              <div className="p-4 flex items-center gap-3">
                {c.avatar_url && <img src={c.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />}
                <div>
                  <span className="text-[11px] rounded-full px-2 py-0.5 bg-pink-50 text-pink-600">{c.label}</span>
                  <p className="font-heading font-bold text-slate-800 mt-1">{c.employee_name}</p>
                  <p className="text-xs text-slate-400">{c.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
