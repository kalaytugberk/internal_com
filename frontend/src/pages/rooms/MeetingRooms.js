import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { useApp } from "@/context/AppContext";
import { AudiencePicker } from "@/components/AudiencePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ChevronLeft, DoorOpen, Trash2, Plus, Users, MapPin, Calendar } from "lucide-react";
import { toast } from "sonner";
import { audienceSummary } from "@/lib/constants";

const blankRoom = () => ({ name: "", location: "", capacity: "", equipment: "", approve_mode: "auto", audience: { all: true } });
const RES_STATUS = { confirmed: "Onaylı", pending: "Onay Bekliyor", cancelled: "İptal" };

export const RoomsManager = () => {
  const [rooms, setRooms] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(null);

  const load = () => api.rooms().then(setRooms);
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name.trim()) return toast.error("Oda adı zorunlu");
    const payload = { name: form.name, location: form.location, capacity: form.capacity ? parseInt(form.capacity, 10) : null, equipment: form.equipment, approve_mode: form.approve_mode, audience: form.audience };
    if (form.id) await api.updateRoom(form.id, payload); else await api.createRoom(payload);
    setOpen(false); load(); toast.success("Oda kaydedildi");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div><h2 className="font-heading font-bold text-xl text-slate-800">Toplantı Odası</h2><p className="text-sm text-slate-500">Oda tanımla; çakışma kontrollü rezervasyon.</p></div>
        <Button data-testid="add-room-btn" className="bg-blue-500 hover:bg-blue-600" onClick={() => { setForm(blankRoom()); setOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Yeni Oda</Button>
      </div>
      <div className="space-y-3">
        {rooms.length === 0 && <div className="text-sm text-slate-400 py-10 text-center">Henüz oda yok.</div>}
        {rooms.map((r) => (
          <div key={r.id} data-testid={`room-row-${r.id}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-indigo-50 grid place-items-center shrink-0"><DoorOpen className="w-6 h-6 text-indigo-500" /></div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-800 truncate">{r.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-3 flex-wrap"><span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {r.location || "—"}</span><span className="flex items-center gap-1"><Users className="w-3 h-3" /> {r.capacity || "—"}</span><span>{r.approve_mode === "auto" ? "Otomatik onay" : "Onay gerekli"}</span><span>Hedef: {audienceSummary(r.audience)}</span></p>
            </div>
            <button data-testid={`room-edit-${r.id}`} onClick={() => { setForm({ ...r, capacity: r.capacity || "" }); setOpen(true); }} className="p-2 rounded-lg text-slate-400 hover:text-blue-500">Düzenle</button>
            <button data-testid={`room-del-${r.id}`} onClick={async () => { await api.deleteRoom(r.id); load(); }} className="p-2 rounded-lg text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto pln-scroll">
          <DialogHeader><DialogTitle className="font-heading">{form?.id ? "Odayı Düzenle" : "Yeni Oda"}</DialogTitle><DialogDescription>Oda bilgileri, onay modu ve hedef kitle.</DialogDescription></DialogHeader>
          {form && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="mb-1.5 block">Oda Adı</Label><Input data-testid="room-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label className="mb-1.5 block">Lokasyon / Kat</Label><Input data-testid="room-location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="mb-1.5 block">Kapasite</Label><Input type="number" data-testid="room-capacity" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></div>
                <div>
                  <Label className="mb-1.5 block">Onay Modu</Label>
                  <Select value={form.approve_mode} onValueChange={(v) => setForm({ ...form, approve_mode: v })}><SelectTrigger data-testid="room-approve"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="auto">Otomatik onay</SelectItem><SelectItem value="approval">Onay gerekli</SelectItem></SelectContent></Select>
                </div>
              </div>
              <div><Label className="mb-1.5 block">Ekipman</Label><Input data-testid="room-equipment" value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value })} placeholder="Projeksiyon, TV..." /></div>
              <div><Label className="mb-2 block">Hedef Kitle</Label><AudiencePicker value={form.audience} onChange={(a) => setForm({ ...form, audience: a })} testPrefix="room-seg" /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>İptal</Button><Button data-testid="room-save-btn" className="bg-blue-500 hover:bg-blue-600" onClick={save}>Kaydet</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const RoomsPage = () => {
  const navigate = useNavigate();
  const { currentEmployeeId } = useApp();
  const [rooms, setRooms] = useState([]);
  const [mine, setMine] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(null);

  const loadMine = () => { if (currentEmployeeId) api.reservations({ employee_id: currentEmployeeId }).then(setMine); };
  useEffect(() => { if (currentEmployeeId) api.roomsFeed(currentEmployeeId).then(setRooms); }, [currentEmployeeId]);
  useEffect(() => { loadMine(); }, [currentEmployeeId]);

  const reserve = async () => {
    if (!form.date || !form.start || !form.end) return toast.error("Tarih ve saat gerekli");
    if (form.end <= form.start) return toast.error("Bitiş, başlangıçtan sonra olmalı");
    try {
      await api.createReservation({ room_id: form.room.id, employee_id: currentEmployeeId, date: form.date, start: form.start, end: form.end, title: form.title || "" });
      setOpen(false); loadMine(); toast.success(form.room.approve_mode === "auto" ? "Rezervasyon onaylandı" : "Rezervasyon onaya gönderildi");
    } catch (e) { toast.error(e?.response?.data?.detail || "Rezervasyon başarısız"); }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <button data-testid="rooms-page-back" onClick={() => navigate("/ic-iletisim")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4"><ChevronLeft className="w-4 h-4" /> İç İletişim</button>
      <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-800 flex items-center gap-2"><DoorOpen className="w-7 h-7 text-indigo-500" /> Toplantı Odası</h1>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {rooms.length === 0 && <div className="sm:col-span-2 rounded-2xl border border-dashed border-slate-300 bg-white/70 py-16 text-center text-slate-400 text-sm">Sana açık oda yok.</div>}
        {rooms.map((r) => (
          <div key={r.id} data-testid={`room-card-${r.id}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-heading font-bold text-slate-800 text-lg">{r.name}</h3>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-3 flex-wrap"><span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {r.location || "—"}</span><span className="flex items-center gap-1"><Users className="w-3 h-3" /> {r.capacity || "—"} kişi</span></p>
            {r.equipment && <p className="text-xs text-slate-400 mt-1">{r.equipment}</p>}
            <Button data-testid={`room-reserve-${r.id}`} className="mt-3 bg-indigo-500 hover:bg-indigo-600 w-full" onClick={() => { setForm({ room: r, date: "", start: "", end: "", title: "" }); setOpen(true); }}><Calendar className="w-4 h-4 mr-1" /> Rezerve Et</Button>
          </div>
        ))}
      </div>

      <h3 className="font-heading font-semibold text-slate-700 mt-8 mb-3">Rezervasyonlarım</h3>
      <div className="space-y-2">
        {mine.filter((m) => m.status !== "cancelled").length === 0 && <div className="text-sm text-slate-400">Rezervasyonun yok.</div>}
        {mine.filter((m) => m.status !== "cancelled").map((m) => (
          <div key={m.id} data-testid={`my-res-${m.id}`} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center justify-between gap-3">
            <div className="min-w-0"><span className="font-medium text-slate-700 text-sm">{m.room_name}</span><span className="text-xs text-slate-400 ml-2">{m.date} · {m.start}-{m.end}</span></div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[11px] rounded-full px-2 py-0.5 ${m.status === "confirmed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{RES_STATUS[m.status]}</span>
              <button data-testid={`res-cancel-${m.id}`} onClick={async () => { await api.cancelReservation(m.id); loadMine(); }} className="text-xs text-rose-500 hover:text-rose-600">İptal</button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-heading">{form?.room?.name} · Rezervasyon</DialogTitle><DialogDescription>Tarih ve saat aralığı seçin.</DialogDescription></DialogHeader>
          {form && (
            <div className="space-y-3 py-2">
              <div><Label className="mb-1.5 block">Tarih</Label><Input type="date" data-testid="res-date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="mb-1.5 block">Başlangıç</Label><Input type="time" data-testid="res-start" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></div>
                <div><Label className="mb-1.5 block">Bitiş</Label><Input type="time" data-testid="res-end" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></div>
              </div>
              <div><Label className="mb-1.5 block">Başlık (ops.)</Label><Input data-testid="res-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>İptal</Button><Button data-testid="res-save-btn" className="bg-indigo-500 hover:bg-indigo-600" onClick={reserve}>Rezerve Et</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
