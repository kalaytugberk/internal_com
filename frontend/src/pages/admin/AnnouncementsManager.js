import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/api";
import { Icon } from "@/lib/icons";
import { AudiencePicker } from "@/components/AudiencePicker";
import { STATUS_META, CHANNELS, emptyAudience, audienceSummary } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Check, X, Pin, Search } from "lucide-react";
import { toast } from "sonner";

const blank = () => ({
  title: "", body: "", image: "", subcategory_id: "", audience: emptyAudience(),
  channels: ["mail"], status: "onay_bekliyor",
});

const FILTERS = [
  { key: "all", label: "Tümü" },
  { key: "taslak", label: "Taslak" },
  { key: "onay_bekliyor", label: "Onay Bekliyor" },
  { key: "yayinda", label: "Yayında" },
  { key: "pasif", label: "Pasif" },
];

export const AnnouncementsManager = () => {
  const [items, setItems] = useState([]);
  const [subs, setSubs] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  const load = () => api.announcements().then(setItems);
  useEffect(() => { load(); api.subcategories().then(setSubs); }, []);

  const subName = (id) => subs.find((s) => s.id === id)?.name || "—";

  const filtered = useMemo(() => items.filter((a) => {
    const okStatus = filter === "all" || a.status === filter;
    const okQ = !q || a.title.toLowerCase().includes(q.toLowerCase());
    return okStatus && okQ;
  }), [items, filter, q]);

  const toggleChannel = (key) => {
    const has = form.channels.includes(key);
    setForm({ ...form, channels: has ? form.channels.filter((c) => c !== key) : [...form.channels, key] });
  };

  const onImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, image: reader.result }));
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error("Başlık zorunlu");
    if (!form.subcategory_id) return toast.error("Duyuru kategorisi seçin");
    const payload = { ...form, image: form.image || null };
    if (form.id) { const { id, ...rest } = payload; await api.updateAnnouncement(id, rest); }
    else await api.createAnnouncement(payload);
    setOpen(false); load(); toast.success("Duyuru kaydedildi");
  };

  const act = async (fn, id, msg) => { await fn(id); load(); toast.success(msg); };

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="font-heading font-bold text-xl text-slate-800">Duyurular</h2>
          <p className="text-sm text-slate-500">Duyuru oluştur, onayla ve öne çıkar.</p>
        </div>
        <Button data-testid="add-announcement-btn" className="bg-blue-500 hover:bg-blue-600"
          onClick={() => { setForm(blank()); setOpen(true); }} disabled={subs.length === 0}>
          <Plus className="w-4 h-4 mr-1" /> Yeni Duyuru
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-3 py-1.5">
          <Search className="w-4 h-4 text-slate-400" />
          <input data-testid="ann-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Başlıkta ara..."
            className="bg-transparent outline-none text-sm w-40" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button key={f.key} data-testid={`filter-${f.key}`} onClick={() => setFilter(f.key)}
              className={["text-xs rounded-full px-3 py-1.5 font-medium transition-colors", filter === f.key ? "bg-blue-500 text-white" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"].join(" ")}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && <div className="text-sm text-slate-400 py-10 text-center">Kayıt bulunamadı.</div>}
        {filtered.map((a) => {
          const sm = STATUS_META[a.status];
          return (
            <div key={a.id} data-testid={`ann-row-${a.id}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
              {a.image && <img src={a.image} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {a.pinned && <Pin className="w-3.5 h-3.5 text-amber-500" />}
                  <h3 className="font-semibold text-slate-800 truncate">{a.title}</h3>
                  <span className={`text-[11px] rounded-full px-2 py-0.5 ${sm.cls}`}>{sm.label}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{subName(a.subcategory_id)} · {audienceSummary(a.audience)} · {a.channels.join(", ") || "kanal yok"}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {a.status === "onay_bekliyor" && (
                  <>
                    <button data-testid={`approve-${a.id}`} onClick={() => act(api.approveAnnouncement, a.id, "Yayınlandı")}
                      className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50" title="Onayla"><Check className="w-4 h-4" /></button>
                    <button data-testid={`reject-${a.id}`} onClick={() => act(api.rejectAnnouncement, a.id, "Reddedildi")}
                      className="p-2 rounded-lg text-rose-600 hover:bg-rose-50" title="Reddet"><X className="w-4 h-4" /></button>
                  </>
                )}
                <button data-testid={`pin-${a.id}`} onClick={() => act(api.pinAnnouncement, a.id, a.pinned ? "Pin kaldırıldı" : "Pinlendi")}
                  className={`p-2 rounded-lg hover:bg-amber-50 ${a.pinned ? "text-amber-500" : "text-slate-400"}`} title="Pinle"><Pin className="w-4 h-4" /></button>
                <button data-testid={`ann-edit-${a.id}`} onClick={() => { setForm({ ...a, image: a.image || "" }); setOpen(true); }}
                  className="p-2 rounded-lg text-slate-400 hover:text-blue-500"><Pencil className="w-4 h-4" /></button>
                <button data-testid={`ann-del-${a.id}`} onClick={() => act(api.deleteAnnouncement, a.id, "Silindi")}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto pln-scroll">
          <DialogHeader><DialogTitle className="font-heading">{form?.id ? "Duyuruyu Düzenle" : "Yeni Duyuru"}</DialogTitle><DialogDescription>Duyuru içeriğini, kanallarını ve hedef kitlesini girin.</DialogDescription></DialogHeader>
          {form && (
            <div className="space-y-4 py-2">
              <div>
                <Label className="mb-1.5 block">Başlık</Label>
                <Input data-testid="ann-title-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Duyuru başlığı" />
              </div>
              <div>
                <Label className="mb-1.5 block">Metin</Label>
                <Textarea data-testid="ann-body-input" rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Duyuru metni..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1.5 block">Duyuru Kategorisi</Label>
                  <Select value={form.subcategory_id} onValueChange={(v) => setForm({ ...form, subcategory_id: v })}>
                    <SelectTrigger data-testid="ann-sub-select"><SelectValue placeholder="Seçin" /></SelectTrigger>
                    <SelectContent>
                      {subs.map((s) => <SelectItem key={s.id} value={s.id} data-testid={`ann-sub-opt-${s.id}`}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block">Durum</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger data-testid="ann-status-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="taslak">Taslak</SelectItem>
                      <SelectItem value="onay_bekliyor">Onay Bekliyor</SelectItem>
                      <SelectItem value="yayinda">Yayında</SelectItem>
                      <SelectItem value="pasif">Pasif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block">Görsel (yükle veya URL)</Label>
                <div className="flex items-center gap-3">
                  <Input data-testid="ann-image-url" value={form.image?.startsWith("data:") ? "" : form.image} placeholder="https://..."
                    onChange={(e) => setForm({ ...form, image: e.target.value })} />
                  <input id="ann-img-file" type="file" accept="image/*" onChange={onImage} className="hidden" />
                  <Button type="button" variant="outline" onClick={() => document.getElementById("ann-img-file").click()} data-testid="ann-image-upload">Yükle</Button>
                </div>
                {form.image && <img src={form.image} alt="" className="mt-2 h-24 rounded-lg object-cover" />}
              </div>
              <div>
                <Label className="mb-2 block">Bildirim Kanalları</Label>
                <div className="flex gap-5">
                  {CHANNELS.map((c) => (
                    <label key={c.key} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                      <Checkbox checked={form.channels.includes(c.key)} onCheckedChange={() => toggleChannel(c.key)} data-testid={`ann-ch-${c.key}`} />
                      {c.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Hedef Kitle</Label>
                <AudiencePicker value={form.audience} onChange={(a) => setForm({ ...form, audience: a })} testPrefix="ann-seg" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button data-testid="ann-save-btn" className="bg-blue-500 hover:bg-blue-600" onClick={save}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
