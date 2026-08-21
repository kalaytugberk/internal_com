import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/api";
import { AudiencePicker } from "@/components/AudiencePicker";
import { IconPicker } from "@/components/IconPicker";
import { emptyAudience } from "@/lib/constants";
import { LISTING_STATUS, typeMeta, remainingDays } from "@/lib/listings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Settings, ListChecks, Inbox, Check, X, Search, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";

const CHANNELS = [{ key: "mail", label: "Mail" }, { key: "push", label: "Push" }, { key: "sms", label: "SMS" }];
const VIEWS = [
  { key: "settings", label: "Ayarlar", icon: Settings },
  { key: "queue", label: "Onay Kuyruğu", icon: Inbox },
  { key: "all", label: "Tüm İlanlar", icon: ListChecks },
];

export const ListingsManager = () => {
  const [view, setView] = useState("settings");
  const [cfg, setCfg] = useState(null);
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [typeF, setTypeF] = useState("all");
  const [statusF, setStatusF] = useState("all");

  const loadCfg = () => api.listingsConfig().then(setCfg);
  const loadItems = () => api.listings().then(setItems);
  useEffect(() => { loadCfg(); loadItems(); }, []);

  const queue = useMemo(() => items.filter((i) => i.status === "onay_bekliyor"), [items]);
  const filtered = useMemo(() => items.filter((i) => {
    const okT = typeF === "all" || i.type === typeF;
    const okS = statusF === "all" || i.status === statusF;
    const okQ = !q || i.title.toLowerCase().includes(q.toLowerCase());
    return okT && okS && okQ;
  }), [items, typeF, statusF, q]);

  const saveCfg = async () => {
    const updated = await api.updateListingsConfig({
      display_name: cfg.display_name, icon: cfg.icon, status: cfg.status, audience: cfg.audience,
      notification_channels: cfg.notification_channels, default_duration_days: Number(cfg.default_duration_days) || 30,
    });
    setCfg(updated); toast.success("İlan ayarları kaydedildi");
  };
  const toggleChannel = (k) => {
    const cur = cfg.notification_channels || [];
    setCfg({ ...cfg, notification_channels: cur.includes(k) ? cur.filter((c) => c !== k) : [...cur, k] });
  };
  const act = async (fn, id, msg) => { await fn(id); loadItems(); toast.success(msg); };

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {VIEWS.map((v) => {
          const I = v.icon; const on = view === v.key;
          return (
            <button key={v.key} data-testid={`listing-view-${v.key}`} onClick={() => setView(v.key)}
              className={["flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors", on ? "bg-blue-500 text-white" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"].join(" ")}>
              <I className="w-4 h-4" /> {v.label}{v.key === "queue" && queue.length > 0 && <span className="ml-1 rounded-full bg-amber-400 text-white text-[10px] px-1.5">{queue.length}</span>}
            </button>
          );
        })}
      </div>

      {view === "settings" && cfg && (
        <div className="max-w-2xl rounded-2xl border border-slate-100 bg-white shadow-sm p-6 space-y-5">
          <div className="flex items-end gap-3">
            <div><Label className="mb-1.5 block">İkon</Label><IconPicker value={cfg.icon} onChange={(v) => setCfg({ ...cfg, icon: v })} testPrefix="listing-icon" /></div>
            <div className="flex-1"><Label className="mb-1.5 block">Görünen Ad</Label><Input data-testid="listing-name-input" value={cfg.display_name} onChange={(e) => setCfg({ ...cfg, display_name: e.target.value })} /></div>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
            <span className="text-sm font-medium text-slate-700">Durum: {cfg.status === "active" ? "Aktif" : "Pasif"}</span>
            <Switch data-testid="listing-status" checked={cfg.status === "active"} onCheckedChange={(c) => setCfg({ ...cfg, status: c ? "active" : "passive" })} />
          </div>
          <div>
            <Label className="mb-2 block">Yeni ilan bildirim kanalı</Label>
            <div className="flex gap-5">
              {CHANNELS.map((c) => (
                <label key={c.key} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <Checkbox checked={(cfg.notification_channels || []).includes(c.key)} onCheckedChange={() => toggleChannel(c.key)} data-testid={`listing-ch-${c.key}`} /> {c.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block">Varsayılan yayın süresi (gün)</Label>
            <Input type="number" min={1} data-testid="listing-duration" className="w-40" value={cfg.default_duration_days} onChange={(e) => setCfg({ ...cfg, default_duration_days: e.target.value })} />
          </div>
          <div><Label className="mb-2 block">Hedef Kitle</Label><AudiencePicker value={cfg.audience || emptyAudience()} onChange={(a) => setCfg({ ...cfg, audience: a })} testPrefix="listing-seg" /></div>
          <div className="flex justify-end"><Button data-testid="listing-save-btn" className="bg-blue-500 hover:bg-blue-600" onClick={saveCfg}>Kaydet</Button></div>
        </div>
      )}

      {view === "queue" && (
        <div className="space-y-3">
          <h3 className="font-heading font-bold text-slate-700">Onay Bekleyenler ({queue.length})</h3>
          {queue.length === 0 && <p className="text-sm text-slate-400 py-8 text-center">Kuyrukta ilan yok.</p>}
          {queue.map((l) => (
            <Row key={l.id} l={l}
              right={<>
                <button data-testid={`listing-approve-${l.id}`} onClick={() => act(api.approveListing, l.id, "Yayınlandı")} className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50" title="Onayla"><Check className="w-4 h-4" /></button>
                <button data-testid={`listing-reject-${l.id}`} onClick={() => act(api.rejectListing, l.id, "Reddedildi")} className="p-2 rounded-lg text-rose-600 hover:bg-rose-50" title="Reddet"><X className="w-4 h-4" /></button>
              </>} />
          ))}
        </div>
      )}

      {view === "all" && (
        <div>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-3 py-1.5">
              <Search className="w-4 h-4 text-slate-400" />
              <input data-testid="listing-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Başlıkta ara..." className="bg-transparent outline-none text-sm w-40" />
            </div>
            <Select value={typeF} onValueChange={setTypeF}><SelectTrigger className="w-36" data-testid="listing-type-filter"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Tüm Türler</SelectItem><SelectItem value="satilik">Satılık</SelectItem><SelectItem value="kiralik">Kiralık</SelectItem><SelectItem value="araniyor">Aranıyor</SelectItem></SelectContent>
            </Select>
            <Select value={statusF} onValueChange={setStatusF}><SelectTrigger className="w-40" data-testid="listing-status-filter"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Tüm Durumlar</SelectItem>{Object.keys(LISTING_STATUS).map((s) => <SelectItem key={s} value={s}>{LISTING_STATUS[s].label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            {filtered.length === 0 && <p className="text-sm text-slate-400 py-8 text-center">Kayıt yok.</p>}
            {filtered.map((l) => (
              <Row key={l.id} l={l} right={
                <button data-testid={`listing-del-${l.id}`} onClick={() => act(api.deleteListing, l.id, "Silindi")} className="p-2 rounded-lg text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
              } />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Row = ({ l, right }) => {
  const tm = typeMeta(l.type);
  const sm = LISTING_STATUS[l.status];
  const rem = remainingDays(l.expires_at);
  return (
    <div data-testid={`listing-row-${l.id}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
      {l.images?.[0] ? <img src={l.images[0]} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" /> : <div className="w-14 h-14 rounded-lg bg-slate-50 grid place-items-center shrink-0 text-slate-300"><Clock className="w-5 h-5" /></div>}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-slate-800 truncate">{l.title}</h3>
          <span className={`text-[11px] rounded-full px-2 py-0.5 ${tm.cls}`}>{tm.label}</span>
          <span className={`text-[11px] rounded-full px-2 py-0.5 ${sm.cls}`}>{sm.label}</span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">{l.owner_name} · {new Date(l.created_at).toLocaleDateString("tr-TR")}{rem !== null && l.status === "yayinda" ? ` · ${rem} gün kaldı` : ""}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">{right}</div>
    </div>
  );
};
