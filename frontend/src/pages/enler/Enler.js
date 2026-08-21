import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronLeft, Star, Trash2, Plus, Trophy } from "lucide-react";
import { toast } from "sonner";

const METHOD = { auto: "Otomatik", manual: "Manuel", vote: "Oylama", hybrid: "Karma" };
const PERIOD = { haftalik: "Haftalık", aylik: "Aylık", ceyreklik: "Çeyreklik" };

export const EnlerManager = () => {
  const [awards, setAwards] = useState([]);
  const [emps, setEmps] = useState([]);
  const [winners, setWinners] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", method: "manual", period: "aylik" });
  const [win, setWin] = useState(null);

  const load = () => { api.awards().then(setAwards); api.awardWinners().then(setWinners); };
  useEffect(() => { load(); api.employees().then(setEmps); }, []);

  const save = async () => { if (!form.name.trim()) return toast.error("Ödül adı zorunlu"); await api.createAward(form); setOpen(false); setForm({ name: "", method: "manual", period: "aylik" }); load(); toast.success("Ödül eklendi"); };
  const saveWinner = async () => { if (!win.employee_id) return toast.error("Kazanan seçin"); await api.setWinner(win.award_id, { employee_id: win.employee_id, period_label: win.period_label || "" }); setWin(null); load(); toast.success("Kazanan kaydedildi"); };

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div><h2 className="font-heading font-bold text-xl text-slate-800">Şirketin Enleri</h2><p className="text-sm text-slate-500">Ödül başlıkları, belirleme yöntemi ve kazananlar.</p></div>
        <Button data-testid="add-award-btn" className="bg-blue-500 hover:bg-blue-600" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> Yeni Ödül</Button>
      </div>
      <div className="space-y-3">
        {awards.length === 0 && <div className="text-sm text-slate-400 py-8 text-center">Henüz ödül yok.</div>}
        {awards.map((a) => (
          <div key={a.id} data-testid={`award-row-${a.id}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-amber-50 grid place-items-center shrink-0"><Star className="w-6 h-6 text-amber-500" /></div>
            <div className="flex-1 min-w-0"><h3 className="font-semibold text-slate-800 truncate">{a.name}</h3><p className="text-xs text-slate-400 mt-0.5">{METHOD[a.method]} · {PERIOD[a.period]}</p></div>
            <Button variant="outline" size="sm" data-testid={`award-winner-${a.id}`} onClick={() => setWin({ award_id: a.id, employee_id: "", period_label: "" })}>Kazanan Belirle</Button>
            <button data-testid={`award-del-${a.id}`} onClick={async () => { await api.deleteAward(a.id); load(); }} className="p-2 rounded-lg text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>

      {winners.length > 0 && (
        <div className="mt-6">
          <h3 className="font-heading font-semibold text-slate-700 mb-3">Kazananlar</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {winners.map((w) => (
              <div key={w.id} data-testid={`winner-${w.id}`} className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 text-center">
                {w.avatar_url ? <img src={w.avatar_url} alt="" className="w-14 h-14 rounded-full mx-auto object-cover" /> : <div className="w-14 h-14 rounded-full mx-auto bg-amber-50 grid place-items-center"><Trophy className="w-6 h-6 text-amber-500" /></div>}
                <p className="font-semibold text-slate-800 text-sm mt-2">{w.employee_name}</p>
                <p className="text-[11px] text-amber-600">{w.award_name}</p>
                {w.period_label && <p className="text-[11px] text-slate-400">{w.period_label}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-heading">Yeni Ödül Başlığı</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label className="mb-1.5 block">Ödül Adı</Label><Input data-testid="award-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="örn. Ayın Çalışanı" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1.5 block">Yöntem</Label><Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}><SelectTrigger data-testid="award-method"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(METHOD).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="mb-1.5 block">Periyot</Label><Select value={form.period} onValueChange={(v) => setForm({ ...form, period: v })}><SelectTrigger data-testid="award-period"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PERIOD).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>İptal</Button><Button data-testid="award-save-btn" className="bg-blue-500 hover:bg-blue-600" onClick={save}>Kaydet</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!win} onOpenChange={(o) => !o && setWin(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-heading">Kazanan Belirle</DialogTitle></DialogHeader>
          {win && (
            <div className="space-y-4 py-2">
              <div><Label className="mb-1.5 block">Çalışan</Label><Select value={win.employee_id || ""} onValueChange={(v) => setWin({ ...win, employee_id: v })}><SelectTrigger data-testid="winner-emp"><SelectValue placeholder="Seçin" /></SelectTrigger><SelectContent className="max-h-72">{emps.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="mb-1.5 block">Dönem Etiketi</Label><Input data-testid="winner-period" value={win.period_label} onChange={(e) => setWin({ ...win, period_label: e.target.value })} placeholder="örn. Ağustos 2026" /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setWin(null)}>İptal</Button><Button data-testid="winner-save-btn" className="bg-blue-500 hover:bg-blue-600" onClick={saveWinner}>Kaydet</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const EnlerPage = () => {
  const navigate = useNavigate();
  const { currentEmployeeId } = useApp();
  const [winners, setWinners] = useState([]);
  const [awards, setAwards] = useState([]);
  const [emps, setEmps] = useState([]);

  useEffect(() => { api.awardWinners().then(setWinners); api.awards().then(setAwards); api.employees().then(setEmps); }, []);
  const vote = async (aid, nid) => { await api.voteAward(aid, { voter_id: currentEmployeeId, nominee_id: nid }); toast.success("Oyun kaydedildi"); };
  const voteAwards = awards.filter((a) => a.method === "vote" || a.method === "hybrid");

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <button data-testid="enler-page-back" onClick={() => navigate("/ic-iletisim")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4"><ChevronLeft className="w-4 h-4" /> İç İletişim</button>
      <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-800 flex items-center gap-2"><Star className="w-7 h-7 text-amber-500" /> Şirketin Enleri</h1>

      <h3 className="font-heading font-semibold text-slate-700 mt-6 mb-3">Kazananlar Galerisi</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {winners.length === 0 && <div className="col-span-full text-sm text-slate-400">Henüz kazanan yok.</div>}
        {winners.map((w) => (
          <div key={w.id} data-testid={`enler-winner-${w.id}`} className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 text-center">
            {w.avatar_url ? <img src={w.avatar_url} alt="" className="w-16 h-16 rounded-full mx-auto object-cover" /> : <div className="w-16 h-16 rounded-full mx-auto bg-amber-50 grid place-items-center"><Trophy className="w-7 h-7 text-amber-500" /></div>}
            <p className="font-semibold text-slate-800 text-sm mt-2">{w.employee_name}</p>
            <p className="text-[11px] text-amber-600">{w.award_name}</p>
          </div>
        ))}
      </div>

      {voteAwards.length > 0 && (
        <div className="mt-8">
          <h3 className="font-heading font-semibold text-slate-700 mb-3">Oylama</h3>
          {voteAwards.map((a) => (
            <div key={a.id} data-testid={`vote-award-${a.id}`} className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 mb-3">
              <p className="font-semibold text-slate-800 mb-2">{a.name}</p>
              <div className="flex flex-wrap gap-2">
                {emps.slice(0, 8).map((e) => <button key={e.id} data-testid={`vote-${a.id}-${e.id}`} onClick={() => vote(a.id, e.id)} className="text-xs rounded-full px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-600">{e.name}</button>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
