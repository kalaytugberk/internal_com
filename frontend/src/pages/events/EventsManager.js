import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/api";
import { AudiencePicker } from "@/components/AudiencePicker";
import { emptyAudience, audienceSummary } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { EventReport } from "@/pages/events/EventReport";
import { Plus, Pencil, Trash2, CalendarClock, MapPin, Users, BarChart3 } from "lucide-react";
import { toast } from "sonner";

const blank = () => ({
  title: "", description: "", image: "", location: "", event_date: "",
  audience: emptyAudience(), status: "yayinda", allow_maybe: true, capacity: "", service_link: false,
});

const STATUS_META = {
  taslak: { label: "Taslak", cls: "bg-slate-100 text-slate-600" },
  yayinda: { label: "Yayında", cls: "bg-emerald-100 text-emerald-700" },
  pasif: { label: "Pasif", cls: "bg-rose-100 text-rose-700" },
};

export const EventsManager = () => {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [reportId, setReportId] = useState(null);

  const load = () => api.events().then(setItems);
  useEffect(() => { load(); }, []);

  const onImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, image: reader.result }));
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error("Başlık zorunlu");
    const payload = { ...form, image: form.image || null, event_date: form.event_date || null, capacity: form.capacity ? parseInt(form.capacity, 10) : null };
    if (form.id) { const { id, category_id, created_at, updated_at, rsvp_counts, ...rest } = payload; await api.updateEvent(id, rest); }
    else await api.createEvent(payload);
    setOpen(false); load(); toast.success("Etkinlik kaydedildi");
  };

  if (reportId) return <EventReport eventId={reportId} onBack={() => setReportId(null)} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="font-heading font-bold text-xl text-slate-800">Etkinlikler</h2>
          <p className="text-sm text-slate-500">Etkinlik oluştur, katılım (RSVP) durumlarını izle.</p>
        </div>
        <Button data-testid="add-event-btn" className="bg-blue-500 hover:bg-blue-600" onClick={() => { setForm(blank()); setOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Yeni Etkinlik
        </Button>
      </div>

      <div className="space-y-3">
        {items.length === 0 && <div className="text-sm text-slate-400 py-10 text-center">Henüz etkinlik yok.</div>}
        {items.map((e) => {
          const sm = STATUS_META[e.status];
          return (
            <div key={e.id} data-testid={`event-row-${e.id}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
              {e.image ? <img src={e.image} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" /> : <div className="w-16 h-16 rounded-lg bg-blue-50 grid place-items-center shrink-0"><CalendarClock className="w-6 h-6 text-blue-500" /></div>}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-slate-800 truncate">{e.title}</h3>
                  <span className={`text-[11px] rounded-full px-2 py-0.5 ${sm.cls}`}>{sm.label}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" /> {e.event_date ? new Date(e.event_date).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {e.location || "—"}</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {e.rsvp_counts?.katiliyorum || 0} katılıyor · {e.rsvp_counts?.belki || 0} belki · {e.rsvp_counts?.katilmiyorum || 0} katılmıyor</span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Hedef: {audienceSummary(e.audience)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button data-testid={`event-report-${e.id}`} onClick={() => setReportId(e.id)} className="p-2 rounded-lg text-blue-600 hover:bg-blue-50" title="Rapor"><BarChart3 className="w-4 h-4" /></button>
                <button data-testid={`event-edit-${e.id}`} onClick={() => { setForm({ ...e, image: e.image || "", event_date: e.event_date ? e.event_date.slice(0, 16) : "" }); setOpen(true); }} className="p-2 rounded-lg text-slate-400 hover:text-blue-500"><Pencil className="w-4 h-4" /></button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button data-testid={`event-del-${e.id}`} className="p-2 rounded-lg text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-heading">Etkinliği sil?</AlertDialogTitle>
                      <AlertDialogDescription>"{e.title}" etkinliği ve tüm katılım (RSVP) kayıtları kalıcı olarak silinecek. Bu işlem geri alınamaz.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel data-testid={`event-del-cancel-${e.id}`}>İptal</AlertDialogCancel>
                      <AlertDialogAction data-testid={`event-del-confirm-${e.id}`} className="bg-rose-500 hover:bg-rose-600"
                        onClick={async () => { await api.deleteEvent(e.id); load(); toast.success("Etkinlik silindi"); }}>Sil</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto pln-scroll">
          <DialogHeader>
            <DialogTitle className="font-heading">{form?.id ? "Etkinliği Düzenle" : "Yeni Etkinlik"}</DialogTitle>
            <DialogDescription>Etkinlik detaylarını girin ve hedef kitlesini seçin.</DialogDescription>
          </DialogHeader>
          {form && (
            <div className="space-y-4 py-2">
              <div><Label className="mb-1.5 block">Başlık</Label><Input data-testid="event-title-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Etkinlik başlığı" /></div>
              <div><Label className="mb-1.5 block">Açıklama</Label><Textarea data-testid="event-desc-input" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="mb-1.5 block">Tarih & Saat</Label><Input type="datetime-local" data-testid="event-date-input" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></div>
                <div><Label className="mb-1.5 block">Konum</Label><Input data-testid="event-location-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="örn. Merkez Ofis" /></div>
              </div>
              <div>
                <Label className="mb-1.5 block">Görsel (yükle veya URL)</Label>
                <div className="flex items-center gap-3">
                  <Input data-testid="event-image-url" value={form.image?.startsWith("data:") ? "" : form.image} placeholder="https://..." onChange={(e) => setForm({ ...form, image: e.target.value })} />
                  <input id="event-img-file" type="file" accept="image/*" onChange={onImage} className="hidden" />
                  <Button type="button" variant="outline" onClick={() => document.getElementById("event-img-file").click()} data-testid="event-image-upload">Yükle</Button>
                </div>
                {form.image && <img src={form.image} alt="" className="mt-2 h-24 rounded-lg object-cover" />}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1.5 block">Durum</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger data-testid="event-status-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="taslak">Taslak</SelectItem>
                      <SelectItem value="yayinda">Yayında</SelectItem>
                      <SelectItem value="pasif">Pasif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3 mt-6">
                  <span className="text-sm font-medium text-slate-700">"Belki" seçeneği</span>
                  <Switch data-testid="event-allowmaybe" checked={form.allow_maybe} onCheckedChange={(c) => setForm({ ...form, allow_maybe: c })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="mb-1.5 block">Kontenjan (opsiyonel)</Label><Input type="number" data-testid="event-capacity" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="boş = sınırsız" /></div>
                <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3 mt-6">
                  <span className="text-sm font-medium text-slate-700">Servis bağlantısı</span>
                  <Switch data-testid="event-servicelink" checked={form.service_link} onCheckedChange={(c) => setForm({ ...form, service_link: c })} />
                </div>
              </div>
              <div><Label className="mb-2 block">Hedef Kitle</Label><AudiencePicker value={form.audience} onChange={(a) => setForm({ ...form, audience: a })} testPrefix="event-seg" /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button data-testid="event-save-btn" className="bg-blue-500 hover:bg-blue-600" onClick={save}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
