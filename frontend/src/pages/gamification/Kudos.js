import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { useApp } from "@/context/AppContext";
import { Icon } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ChevronLeft, Award, Plus, Check, X, Trash2, Send } from "lucide-react";
import { toast } from "sonner";

export const TONE = {
  sky: "bg-sky-50 text-sky-600 border-sky-200",
  amber: "bg-amber-50 text-amber-600 border-amber-200",
  rose: "bg-rose-50 text-rose-600 border-rose-200",
  violet: "bg-violet-50 text-violet-600 border-violet-200",
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
  orange: "bg-orange-50 text-orange-600 border-orange-200",
};

const Avatar = ({ url, name, size = "w-11 h-11" }) =>
  url ? (
    <img src={url} alt="" className={`${size} rounded-full object-cover bg-slate-100`} />
  ) : (
    <div className={`${size} rounded-full bg-blue-50 text-blue-600 grid place-items-center font-semibold`}>{(name || "?").charAt(0)}</div>
  );

const KudosCard = ({ k, testid, actions }) => {
  const navigate = useNavigate();
  const tone = TONE[k.value_color] || TONE.sky;
  return (
    <div data-testid={testid} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-start gap-3">
        <button onClick={() => navigate(`/profil/${k.to_id}`)} data-testid={`kudos-avatar-${k.id}`}><Avatar url={k.to_avatar} name={k.to_name} /></button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => navigate(`/profil/${k.from_id}`)} data-testid={`kudos-from-${k.id}`} className="font-semibold text-slate-800 hover:text-blue-600 hover:underline">{k.from_name}</button>
            <span className="text-slate-400 text-sm">→</span>
            <button onClick={() => navigate(`/profil/${k.to_id}`)} data-testid={`kudos-to-link-${k.id}`} className="font-semibold text-slate-800 hover:text-blue-600 hover:underline">{k.to_name}</button>
          </div>
          <span className={`mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium rounded-full border px-2.5 py-1 ${tone}`}>
            <Icon name={k.value_icon} className="w-3.5 h-3.5" /> {k.value_label}
          </span>
          {k.message && <p className="text-sm text-slate-600 mt-2 leading-relaxed">"{k.message}"</p>}
        </div>
        {actions}
      </div>
    </div>
  );
};

export const KudosPage = () => {
  const navigate = useNavigate();
  const { currentEmployeeId, employees } = useApp();
  const [feed, setFeed] = useState([]);
  const [values, setValues] = useState([]);
  const [moderation, setModeration] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ to_id: "", value: "", message: "" });
  const [tab, setTab] = useState("wall");
  const [mine, setMine] = useState({ received: [], given: [] });

  const load = () => {
    api.kudosFeed().then(setFeed);
    if (currentEmployeeId) api.kudosMine(currentEmployeeId).then(setMine);
  };
  useEffect(() => {
    api.gamiConfig().then((c) => { setValues(c.kudos_values || []); setModeration(!!c.kudos_moderation); });
  }, []);
  useEffect(() => { load(); }, [currentEmployeeId]);

  const colleagues = useMemo(() => employees.filter((e) => e.id !== currentEmployeeId), [employees, currentEmployeeId]);

  const send = async () => {
    if (!form.to_id) return toast.error("Bir çalışan seçin");
    if (!form.value) return toast.error("Bir değer seçin");
    const r = await api.createKudos({ from_id: currentEmployeeId, ...form });
    setOpen(false);
    setForm({ to_id: "", value: "", message: "" });
    load();
    toast.success(r.moderated ? "Kudos gönderildi, onay bekliyor" : "Kudos gönderildi! 🎉");
  };

  const list = tab === "wall" ? feed : tab === "received" ? mine.received : mine.given;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <button data-testid="kudos-back" onClick={() => navigate("/ic-iletisim")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4"><ChevronLeft className="w-4 h-4" /> İç İletişim</button>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-800 flex items-center gap-2"><Award className="w-7 h-7 text-blue-500" /> Kudos</h1>
          <p className="text-sm text-slate-500 mt-1">Çalışma arkadaşlarına takdirini göster, puan kazandır.</p>
        </div>
        <Button data-testid="give-kudos-btn" className="bg-blue-500 hover:bg-blue-600" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> Kudos Ver</Button>
      </div>

      <div className="flex gap-2 mt-6 border-b border-slate-200">
        {[["wall", "Akış"], ["received", "Aldıklarım"], ["given", "Verdiklerim"]].map(([k, l]) => (
          <button key={k} data-testid={`kudos-tab-${k}`} onClick={() => setTab(k)}
            className={["px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors", tab === k ? "text-blue-600 border-blue-600" : "text-slate-500 border-transparent hover:text-slate-800"].join(" ")}>{l}</button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {list.length === 0 && <div className="text-sm text-slate-400 py-10 text-center">Henüz kudos yok.</div>}
        {list.map((k) => <KudosCard key={k.id} k={k} testid={`kudos-${k.id}`} />)}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-heading">Kudos Ver</DialogTitle><DialogDescription>Bir arkadaşını takdir et.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-1.5 block">Kime?</Label>
              <Select value={form.to_id} onValueChange={(v) => setForm({ ...form, to_id: v })}>
                <SelectTrigger data-testid="kudos-to"><SelectValue placeholder="Çalışan seçin" /></SelectTrigger>
                <SelectContent className="max-h-72">{colleagues.map((e) => <SelectItem key={e.id} value={e.id}>{e.name} · {e.department}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">Hangi değer için?</Label>
              <div className="flex flex-wrap gap-2">
                {values.map((v) => {
                  const on = form.value === v.key;
                  return (
                    <button key={v.key} type="button" data-testid={`kudos-value-${v.key}`} onClick={() => setForm({ ...form, value: v.key })}
                      className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full border px-3 py-1.5 transition-all ${on ? (TONE[v.color] || TONE.sky) + " ring-2 ring-offset-1 ring-blue-300" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                      <Icon name={v.icon} className="w-3.5 h-3.5" /> {v.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div><Label className="mb-1.5 block">Mesaj (opsiyonel)</Label><Textarea data-testid="kudos-message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Neden takdir ediyorsun?" rows={3} /></div>
            {moderation && <p className="text-xs text-amber-600">Bu kudos yayınlanmadan önce yönetici onayından geçecek.</p>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>İptal</Button><Button data-testid="kudos-send-btn" className="bg-blue-500 hover:bg-blue-600" onClick={send}><Send className="w-4 h-4 mr-1" /> Gönder</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const KudosManager = () => {
  const [cfg, setCfg] = useState(null);
  const [pending, setPending] = useState([]);

  const load = () => { api.gamiConfig().then(setCfg); api.kudosPending().then(setPending); };
  useEffect(() => { load(); }, []);

  const toggleMod = async (v) => { const r = await api.updateGamiConfig({ kudos_moderation: v }); setCfg(r); toast.success("Ayar güncellendi"); };
  const approve = async (id) => { await api.approveKudos(id); load(); toast.success("Onaylandı"); };
  const reject = async (id) => { await api.rejectKudos(id); load(); toast.success("Reddedildi"); };

  if (!cfg) return null;
  return (
    <div>
      <div className="mb-5"><h2 className="font-heading font-bold text-xl text-slate-800">Kudos Yönetimi</h2><p className="text-sm text-slate-500">Takdir değerlerini, moderasyonu ve puanları yönet.</p></div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
        <div><p className="font-semibold text-slate-800">Moderasyon</p><p className="text-sm text-slate-500">Açıkça, kudos'lar yayınlanmadan önce onay bekler.</p></div>
        <Switch data-testid="kudos-moderation-switch" checked={!!cfg.kudos_moderation} onCheckedChange={toggleMod} />
      </div>

      <div className="mt-5">
        <h3 className="font-heading font-semibold text-slate-700 mb-2">Tanımlı Değerler</h3>
        <div className="flex flex-wrap gap-2">
          {(cfg.kudos_values || []).map((v) => (
            <span key={v.key} className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full border px-3 py-1.5 ${TONE[v.color] || TONE.sky}`}><Icon name={v.icon} className="w-3.5 h-3.5" /> {v.label}</span>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <h3 className="font-heading font-semibold text-slate-700 mb-2">Puan Kuralları</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries({ kudos_received: "Kudos Alma", kudos_given: "Kudos Verme", game_correct: "Doğru Cevap", game_perfect: "Tam Puan Bonusu" }).map(([k, l]) => (
            <div key={k} className="rounded-xl border border-slate-100 bg-white p-3 text-center"><p className="text-2xl font-bold text-blue-600">+{cfg.points?.[k] ?? 0}</p><p className="text-xs text-slate-500 mt-0.5">{l}</p></div>
          ))}
        </div>
      </div>

      {cfg.kudos_moderation && (
        <div className="mt-6">
          <h3 className="font-heading font-semibold text-slate-700 mb-2">Onay Bekleyenler ({pending.length})</h3>
          <div className="space-y-3">
            {pending.length === 0 && <div className="text-sm text-slate-400 py-6 text-center">Onay bekleyen kudos yok.</div>}
            {pending.map((k) => (
              <KudosCard key={k.id} k={k} testid={`kudos-pending-${k.id}`} actions={
                <div className="flex gap-1 shrink-0">
                  <button data-testid={`kudos-approve-${k.id}`} onClick={() => approve(k.id)} className="p-2 rounded-lg text-emerald-500 hover:bg-emerald-50"><Check className="w-4 h-4" /></button>
                  <button data-testid={`kudos-reject-${k.id}`} onClick={() => reject(k.id)} className="p-2 rounded-lg text-rose-500 hover:bg-rose-50"><X className="w-4 h-4" /></button>
                </div>} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
