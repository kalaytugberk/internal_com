import React, { useEffect, useState } from "react";
import { api } from "@/api";
import { AudiencePicker } from "@/components/AudiencePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Plus, Trash2, BarChart3, ChevronLeft, Send, Users } from "lucide-react";
import { toast } from "sonner";

const CHANNELS = [{ key: "sms", label: "SMS" }, { key: "push", label: "Push" }, { key: "mail", label: "Mail" }];
const blank = () => ({ title: "", message: "", channels: ["push"], audience: { all: true }, opt1: "", opt2: "", reminder_enabled: false, reminder_minutes: 15 });

const NotificationReport = ({ id, onBack }) => {
  const [d, setD] = useState(null);
  useEffect(() => { api.notificationReport(id).then(setD); }, [id]);
  if (!d) return <div className="py-16 text-center text-slate-400">Rapor yükleniyor...</div>;
  const total = d.responded_count || 0;
  return (
    <div data-testid="notif-report">
      <button data-testid="notif-report-back" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-3"><ChevronLeft className="w-4 h-4" /> Liste</button>
      <h3 className="font-heading font-bold text-xl text-slate-800">{d.notification.title || d.notification.message}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
        <Stat label="Yanıt Oranı" value={`%${d.response_rate}`} color="text-blue-600" />
        <Stat label="Yanıtlayan" value={`${d.responded_count}/${d.target_count}`} />
        {d.options.map((o) => <Stat key={o.key} label={o.label} value={d.counts[o.key] || 0} />)}
      </div>
      <div className="mt-6 rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
        <p className="font-heading font-semibold text-slate-700 mb-3">Seçenek Dağılımı</p>
        {d.options.map((o) => {
          const c = d.counts[o.key] || 0; const pct = total ? Math.round((c / total) * 100) : 0;
          return (
            <div key={o.key} className="flex items-center gap-3 mb-2">
              <span className="w-40 shrink-0 text-sm text-slate-600 truncate">{o.label}</span>
              <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${pct}%` }} /></div>
              <span className="w-16 text-right text-xs text-slate-500">{c} kişi</span>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6">
        <ListCard title={`Yanıtlayanlar (${d.responded.length})`} rows={d.responded.map((r) => `${r.name} · ${d.options.find((o) => o.key === r.option)?.label || r.option}`)} testid="notif-responded" />
        <ListCard title={`Yanıtlamayanlar (${d.not_responded.length})`} rows={d.not_responded.map((r) => `${r.name} · ${r.department || ""}`)} testid="notif-not-responded" />
      </div>
    </div>
  );
};
const Stat = ({ label, value, color = "text-slate-800" }) => (
  <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4"><p className="text-xs text-slate-400">{label}</p><p className={`text-2xl font-heading font-bold mt-1 ${color}`}>{value}</p></div>
);
const ListCard = ({ title, rows, testid }) => (
  <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5" data-testid={testid}>
    <p className="font-heading font-semibold text-slate-700 mb-3">{title}</p>
    {rows.length === 0 ? <p className="text-sm text-slate-400">—</p> : <ul className="space-y-1.5">{rows.map((r, i) => <li key={i} className="text-sm text-slate-600">{r}</li>)}</ul>}
  </div>
);

export const NotificationsManager = ({ kind, isg = false }) => {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [reportId, setReportId] = useState(null);

  const load = () => api.notifications(kind).then(setItems);
  useEffect(() => { load(); }, [kind]);

  const toggleCh = (k) => setForm((f) => ({ ...f, channels: f.channels.includes(k) ? f.channels.filter((x) => x !== k) : [...f.channels, k] }));

  const save = async () => {
    if (!form.message.trim()) return toast.error("Mesaj metni zorunlu");
    if (!form.opt1.trim() || !form.opt2.trim()) return toast.error("İki yanıt seçeneği de zorunlu");
    await api.createNotification({
      kind, title: form.title, message: form.message, channels: form.channels, audience: form.audience,
      options: [{ key: "a", label: form.opt1 }, { key: "b", label: form.opt2 }],
      reminder_enabled: form.reminder_enabled, reminder_minutes: parseInt(form.reminder_minutes, 10) || 15,
    });
    setOpen(false); load(); toast.success("Bildirim gönderildi (kanal gönderimi MOCK)");
  };

  if (reportId) return <NotificationReport id={reportId} onBack={() => setReportId(null)} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="font-heading font-bold text-xl text-slate-800">{isg ? "İSG — Acil Durum" : "Anlık Bildirim"}</h2>
          <p className="text-sm text-slate-500">{isg ? "Acil durum bildirimi gönder, gerçek zamanlı yanıtları izle." : "Anlık bildirim gönder ve 2 seçenekli yanıtları takip et."} Kanal gönderimi MOCK.</p>
        </div>
        <Button data-testid="add-notif-btn" className={isg ? "bg-rose-500 hover:bg-rose-600" : "bg-blue-500 hover:bg-blue-600"} onClick={() => { setForm(blank()); setOpen(true); }}>
          <Send className="w-4 h-4 mr-1" /> {isg ? "Acil Bildirim Gönder" : "Yeni Bildirim"}
        </Button>
      </div>

      <div className="space-y-3">
        {items.length === 0 && <div className="text-sm text-slate-400 py-10 text-center">Henüz bildirim yok.</div>}
        {items.map((n) => (
          <div key={n.id} data-testid={`notif-row-${n.id}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-800 truncate">{n.title || n.message}</h3>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {n.responded} yanıt</span>
                {n.options.map((o) => <span key={o.key}>{o.label}: {n.counts[o.key] || 0}</span>)}
                <span>{(n.channels || []).join(", ") || "—"}</span>
              </p>
            </div>
            <button data-testid={`notif-report-${n.id}`} onClick={() => setReportId(n.id)} className="p-2 rounded-lg text-blue-600 hover:bg-blue-50" title="Rapor"><BarChart3 className="w-4 h-4" /></button>
            <AlertDialog>
              <AlertDialogTrigger asChild><button data-testid={`notif-del-${n.id}`} className="p-2 rounded-lg text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle className="font-heading">Bildirimi sil?</AlertDialogTitle><AlertDialogDescription>Bildirim ve tüm yanıtları silinecek.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction className="bg-rose-500 hover:bg-rose-600" data-testid={`notif-del-confirm-${n.id}`} onClick={async () => { await api.deleteNotification(n.id); load(); }}>Sil</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto pln-scroll">
          <DialogHeader><DialogTitle className="font-heading">{isg ? "Acil Durum Bildirimi" : "Yeni Anlık Bildirim"}</DialogTitle><DialogDescription>Mesaj, hedef kitle, kanal ve 2 yanıt seçeneği girin. Gönderim onaysız ve MOCK'tur.</DialogDescription></DialogHeader>
          {form && (
            <div className="space-y-4 py-2">
              <div><Label className="mb-1.5 block">Başlık (opsiyonel)</Label><Input data-testid="notif-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label className="mb-1.5 block">Mesaj (kısa metin)</Label><Textarea data-testid="notif-message" rows={3} maxLength={300} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="SMS karakter sınırına uygun kısa metin" /></div>
              <div>
                <Label className="mb-1.5 block">Kanal (MOCK)</Label>
                <div className="flex gap-5">{CHANNELS.map((c) => <label key={c.key} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer"><Checkbox checked={form.channels.includes(c.key)} onCheckedChange={() => toggleCh(c.key)} data-testid={`notif-ch-${c.key}`} /> {c.label}</label>)}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="mb-1.5 block">Yanıt Seçeneği 1</Label><Input data-testid="notif-opt1" value={form.opt1} onChange={(e) => setForm({ ...form, opt1: e.target.value })} placeholder={isg ? "örn. Güvendeyim" : "örn. Katılıyorum"} /></div>
                <div><Label className="mb-1.5 block">Yanıt Seçeneği 2</Label><Input data-testid="notif-opt2" value={form.opt2} onChange={(e) => setForm({ ...form, opt2: e.target.value })} placeholder={isg ? "örn. Yardıma İhtiyacım Var" : "örn. Katılmıyorum"} /></div>
              </div>
              {isg && (
                <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                  <span className="text-sm font-medium text-slate-700">Yanıtlamayanlara otomatik hatırlatma</span>
                  <div className="flex items-center gap-2">
                    {form.reminder_enabled && <Input type="number" data-testid="notif-reminder-min" className="w-20 h-8" value={form.reminder_minutes} onChange={(e) => setForm({ ...form, reminder_minutes: e.target.value })} />}
                    <Switch data-testid="notif-reminder" checked={form.reminder_enabled} onCheckedChange={(c) => setForm({ ...form, reminder_enabled: c })} />
                  </div>
                </div>
              )}
              <div><Label className="mb-2 block">Hedef Kitle</Label><AudiencePicker value={form.audience} onChange={(a) => setForm({ ...form, audience: a })} testPrefix="notif-seg" /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>İptal</Button><Button data-testid="notif-save-btn" className={isg ? "bg-rose-500 hover:bg-rose-600" : "bg-blue-500 hover:bg-blue-600"} onClick={save}>Gönder</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
