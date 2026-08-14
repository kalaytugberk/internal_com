import React, { useEffect, useState } from "react";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { RouteReport } from "@/pages/routes/RouteReport";
import { Plus, Pencil, Trash2, Bus, MapPin, Users, BarChart3, GripVertical } from "lucide-react";
import { toast } from "sonner";

const DIRECTION = { gidis: "Gidiş", donus: "Dönüş" };
const blankStop = () => ({ name: "", time: "", location: "" });
const blank = () => ({
  name: "", direction: "gidis", city: "", vehicle_plate: "", driver_name: "", driver_phone: "",
  stops: [blankStop()], status: "active",
});

export const RoutesManager = () => {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [showReport, setShowReport] = useState(false);

  const load = () => api.routes().then(setItems);
  useEffect(() => { load(); }, []);

  const setStop = (idx, patch) => setForm((f) => ({ ...f, stops: f.stops.map((s, i) => i === idx ? { ...s, ...patch } : s) }));
  const addStop = () => setForm((f) => ({ ...f, stops: [...f.stops, blankStop()] }));
  const removeStop = (idx) => setForm((f) => ({ ...f, stops: f.stops.filter((_, i) => i !== idx) }));

  const save = async () => {
    if (!form.name.trim()) return toast.error("Güzergah adı zorunlu");
    const stops = form.stops.filter((s) => s.name.trim());
    if (stops.length === 0) return toast.error("En az bir durak ekleyin");
    const payload = { ...form, stops };
    if (form.id) { const { id, category_id, created_at, updated_at, reg_count, ...rest } = payload; await api.updateRoute(id, rest); }
    else await api.createRoute(payload);
    setOpen(false); load(); toast.success("Güzergah kaydedildi");
  };

  if (showReport) return <RouteReport onBack={() => setShowReport(false)} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="font-heading font-bold text-xl text-slate-800">Servis Güzergahı</h2>
          <p className="text-sm text-slate-500">Güzergah, durak ve saatleri tanımla; kullanım kayıtlarını izle.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button data-testid="routes-report-btn" variant="outline" onClick={() => setShowReport(true)}><BarChart3 className="w-4 h-4 mr-1" /> Rapor</Button>
          <Button data-testid="add-route-btn" className="bg-blue-500 hover:bg-blue-600" onClick={() => { setForm(blank()); setOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Yeni Güzergah
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {items.length === 0 && <div className="text-sm text-slate-400 py-10 text-center">Henüz güzergah yok.</div>}
        {items.map((r) => (
          <div key={r.id} data-testid={`route-row-${r.id}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-blue-50 grid place-items-center shrink-0"><Bus className="w-6 h-6 text-blue-500" /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-slate-800 truncate">{r.name}</h3>
                <span className={["text-[11px] rounded-full px-2 py-0.5", r.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"].join(" ")}>{r.status === "active" ? "Aktif" : "Pasif"}</span>
                <span className="text-[11px] rounded-full px-2 py-0.5 bg-slate-50 text-slate-500">{DIRECTION[r.direction]}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {r.city || "—"} · {r.stops?.length || 0} durak</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {r.reg_count || 0} kullanıcı</span>
                <span>{r.vehicle_plate || "—"} · {r.driver_name || "—"}</span>
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button data-testid={`route-edit-${r.id}`} onClick={() => { setForm({ ...r, stops: r.stops?.length ? r.stops : [blankStop()] }); setOpen(true); }} className="p-2 rounded-lg text-slate-400 hover:text-blue-500"><Pencil className="w-4 h-4" /></button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button data-testid={`route-del-${r.id}`} className="p-2 rounded-lg text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-heading">Güzergahı sil?</AlertDialogTitle>
                    <AlertDialogDescription>"{r.name}" güzergahı ve tüm kullanım kayıtları kalıcı olarak silinecek. Bu işlem geri alınamaz.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid={`route-del-cancel-${r.id}`}>İptal</AlertDialogCancel>
                    <AlertDialogAction data-testid={`route-del-confirm-${r.id}`} className="bg-rose-500 hover:bg-rose-600"
                      onClick={async () => { await api.deleteRoute(r.id); load(); toast.success("Güzergah silindi"); }}>Sil</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto pln-scroll">
          <DialogHeader>
            <DialogTitle className="font-heading">{form?.id ? "Güzergahı Düzenle" : "Yeni Güzergah"}</DialogTitle>
            <DialogDescription>Güzergah bilgilerini, araç/şoför detayını ve durakları girin.</DialogDescription>
          </DialogHeader>
          {form && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="mb-1.5 block">Güzergah Adı</Label><Input data-testid="route-name-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="örn. Kadıköy Hattı" /></div>
                <div><Label className="mb-1.5 block">Lokasyon (Şehir)</Label><Input data-testid="route-city-input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="örn. İstanbul" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1.5 block">Yön</Label>
                  <Select value={form.direction} onValueChange={(v) => setForm({ ...form, direction: v })}>
                    <SelectTrigger data-testid="route-direction-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gidis">Gidiş</SelectItem>
                      <SelectItem value="donus">Dönüş</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block">Durum</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger data-testid="route-status-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Aktif</SelectItem>
                      <SelectItem value="passive">Pasif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label className="mb-1.5 block">Araç / Plaka</Label><Input data-testid="route-plate-input" value={form.vehicle_plate} onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value })} placeholder="34 ABC 123" /></div>
                <div><Label className="mb-1.5 block">Şoför Adı</Label><Input data-testid="route-driver-input" value={form.driver_name} onChange={(e) => setForm({ ...form, driver_name: e.target.value })} /></div>
                <div><Label className="mb-1.5 block">Şoför Telefon</Label><Input data-testid="route-driverphone-input" value={form.driver_phone} onChange={(e) => setForm({ ...form, driver_phone: e.target.value })} /></div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Duraklar (sırayla)</Label>
                  <Button type="button" size="sm" variant="ghost" data-testid="route-add-stop" onClick={addStop} className="text-blue-600 h-7 px-2"><Plus className="w-3.5 h-3.5 mr-1" /> Durak ekle</Button>
                </div>
                <div className="space-y-2">
                  {form.stops.map((s, i) => (
                    <div key={i} data-testid={`route-stop-row-${i}`} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2">
                      <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
                      <Input data-testid={`route-stop-name-${i}`} value={s.name} onChange={(e) => setStop(i, { name: e.target.value })} placeholder="Durak adı" className="flex-1" />
                      <Input data-testid={`route-stop-time-${i}`} type="time" value={s.time} onChange={(e) => setStop(i, { time: e.target.value })} className="w-28" />
                      <Input data-testid={`route-stop-loc-${i}`} value={s.location || ""} onChange={(e) => setStop(i, { location: e.target.value })} placeholder="Adres/harita" className="flex-1" />
                      <button data-testid={`route-stop-del-${i}`} type="button" onClick={() => removeStop(i)} className="p-1.5 text-slate-400 hover:text-rose-500 shrink-0"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button data-testid="route-save-btn" className="bg-blue-500 hover:bg-blue-600" onClick={save}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
