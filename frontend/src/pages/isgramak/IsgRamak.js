import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ChevronLeft, AlertTriangle, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

const STATUS = { yeni: "Yeni", inceleniyor: "İnceleniyor", kapatildi: "Kapatıldı" };
const STATUS_CLS = { yeni: "bg-amber-100 text-amber-700", inceleniyor: "bg-blue-100 text-blue-700", kapatildi: "bg-emerald-100 text-emerald-700" };
const ANON = { always_anon: "Her zaman anonim", always_open: "Her zaman açık kimlik", user_choice: "Bildiren seçsin" };

export const IsgRamakManager = () => {
  const [cfg, setCfg] = useState(null);
  const [reports, setReports] = useState([]);
  const [newTag, setNewTag] = useState("");

  const load = () => { api.isgConfig().then(setCfg); api.ramakReports().then(setReports); };
  useEffect(() => { load(); }, []);

  const saveCfg = async (patch) => { const c = await api.updateIsgConfig(patch); setCfg(c); toast.success("Ayar kaydedildi"); };
  const addTag = async () => { if (!newTag.trim()) return; await saveCfg({ tags: [...(cfg.tags || []), newTag] }); setNewTag(""); };
  const delTag = async (t) => saveCfg({ tags: (cfg.tags || []).filter((x) => x !== t) });
  const setStatus = async (id, status) => { await api.updateRamakStatus(id, status); api.ramakReports().then(setReports); };

  if (!cfg) return <div className="py-16 text-center text-slate-400">Yükleniyor...</div>;

  return (
    <div>
      <h2 className="font-heading font-bold text-xl text-slate-800 mb-1">İSG — Ramak Kala</h2>
      <p className="text-sm text-slate-500 mb-5">Anonimlik modu, olay etiketleri ve durum takibini yönet.</p>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 mb-5 space-y-4">
        <div>
          <Label className="mb-1.5 block">Anonimlik Modu</Label>
          <Select value={cfg.anonymity_mode} onValueChange={(v) => saveCfg({ anonymity_mode: v })}>
            <SelectTrigger className="max-w-xs" data-testid="ramak-anon-select"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(ANON).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between max-w-xs">
          <span className="text-sm font-medium text-slate-700">Durum takibi (Yeni/İnceleniyor/Kapatıldı)</span>
          <Switch data-testid="ramak-statusflow" checked={!!cfg.status_flow_enabled} onCheckedChange={(c) => saveCfg({ status_flow_enabled: c })} />
        </div>
        <div>
          <Label className="mb-1.5 block">Olay Etiketleri</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {(cfg.tags || []).map((t) => <span key={t} data-testid={`ramak-tag-${t}`} className="inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1 bg-rose-50 text-rose-600">{t}<button onClick={() => delTag(t)} className="hover:text-rose-800"><Trash2 className="w-3 h-3" /></button></span>)}
          </div>
          <div className="flex gap-2"><Input data-testid="ramak-tag-input" value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="örn. Kayma-Düşme" className="max-w-xs" /><Button variant="outline" onClick={addTag} data-testid="ramak-tag-add"><Plus className="w-4 h-4" /></Button></div>
        </div>
      </div>

      <h3 className="font-heading font-semibold text-slate-700 mb-3">Bildirimler ({reports.length})</h3>
      <div className="space-y-3">
        {reports.length === 0 && <div className="text-sm text-slate-400 py-8 text-center">Henüz bildirim yok.</div>}
        {reports.map((r) => (
          <div key={r.id} data-testid={`ramak-report-${r.id}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-start gap-4">
            {r.image && <img src={r.image} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {r.tag && <span className="text-[11px] rounded-full px-2 py-0.5 bg-rose-50 text-rose-600">{r.tag}</span>}
                <span className={`text-[11px] rounded-full px-2 py-0.5 ${STATUS_CLS[r.status]}`}>{STATUS[r.status]}</span>
                <span className="text-xs text-slate-400">{r.anonymous ? "Anonim" : `${r.reporter_name || "—"}${r.location ? " · " + r.location : ""}`}</span>
              </div>
              <p className="text-sm text-slate-700 mt-1">{r.text}</p>
            </div>
            {cfg.status_flow_enabled && (
              <Select value={r.status} onValueChange={(v) => setStatus(r.id, v)}>
                <SelectTrigger className="w-36 shrink-0" data-testid={`ramak-status-${r.id}`}><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const IsgRamakPage = () => {
  const navigate = useNavigate();
  const { currentEmployeeId } = useApp();
  const [cfg, setCfg] = useState(null);
  const [mine, setMine] = useState([]);
  const [form, setForm] = useState({ tag: "", text: "", image: null, anonymous: false });

  const load = () => { if (currentEmployeeId) api.ramakMy(currentEmployeeId).then(setMine); };
  useEffect(() => { api.isgConfig().then(setCfg); }, []);
  useEffect(() => { load(); }, [currentEmployeeId]);

  const onImg = (e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => setForm((p) => ({ ...p, image: r.result })); r.readAsDataURL(f); };
  const submit = async () => {
    if (!form.text.trim()) return toast.error("Lütfen olayı açıklayın");
    const anon = cfg?.anonymity_mode === "always_anon" ? true : cfg?.anonymity_mode === "always_open" ? false : form.anonymous;
    await api.createRamak({ reporter_id: currentEmployeeId, anonymous: anon, tag: form.tag || null, text: form.text, image: form.image });
    setForm({ tag: "", text: "", image: null, anonymous: false }); toast.success("Bildirimin alındı"); load();
  };
  if (!cfg) return <div className="py-16 text-center text-slate-400">Yükleniyor...</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <button data-testid="ramak-page-back" onClick={() => navigate("/ic-iletisim")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4"><ChevronLeft className="w-4 h-4" /> İç İletişim</button>
      <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-800 flex items-center gap-2"><AlertTriangle className="w-7 h-7 text-rose-500" /> Ramak Kala Bildirimi</h1>

      <div className="mt-6 rounded-2xl border border-slate-100 bg-white shadow-sm p-5 space-y-4">
        {(cfg.tags || []).length > 0 && (
          <div>
            <Label className="mb-1.5 block">Olay Tipi</Label>
            <Select value={form.tag || ""} onValueChange={(v) => setForm({ ...form, tag: v })}>
              <SelectTrigger data-testid="ramak-form-tag"><SelectValue placeholder="Seçin" /></SelectTrigger>
              <SelectContent>{cfg.tags.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        <div><Label className="mb-1.5 block">Olay Açıklaması</Label><Textarea data-testid="ramak-form-text" rows={4} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="Ne oldu? Nerede?" /></div>
        <div>
          <input id="ramak-img" type="file" accept="image/*" onChange={onImg} className="hidden" />
          <Button type="button" variant="outline" onClick={() => document.getElementById("ramak-img").click()} data-testid="ramak-form-image">Görsel Ekle (ops.)</Button>
          {form.image && <img src={form.image} alt="" className="mt-2 h-20 rounded-lg object-cover" />}
        </div>
        {cfg.anonymity_mode === "user_choice" && (
          <label className="flex items-center justify-between text-sm text-slate-700"><span>Anonim bildir</span><Switch data-testid="ramak-form-anon" checked={form.anonymous} onCheckedChange={(c) => setForm({ ...form, anonymous: c })} /></label>
        )}
        {cfg.anonymity_mode === "always_anon" && <p className="text-xs text-slate-400">Bu kategoride bildirimler her zaman anonimdir.</p>}
        <Button data-testid="ramak-submit" className="bg-rose-500 hover:bg-rose-600 w-full" onClick={submit}>Bildir</Button>
      </div>

      {mine.length > 0 && (
        <div className="mt-6">
          <h3 className="font-heading font-semibold text-slate-700 mb-2">Bildirimlerim</h3>
          <div className="space-y-2">
            {mine.map((r) => (
              <div key={r.id} data-testid={`ramak-my-${r.id}`} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center justify-between">
                <span className="text-sm text-slate-600 truncate">{r.text}</span>
                <span className={`text-[11px] rounded-full px-2 py-0.5 shrink-0 ${STATUS_CLS[r.status]}`}>{STATUS[r.status]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
