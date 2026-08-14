import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/api";
import { PulseReport } from "@/pages/pulse/PulseReport";
import { SegmentPicker } from "@/components/SegmentPicker";
import { IconPicker } from "@/components/IconPicker";
import { emptyAudience, audienceSummary } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Trash2, Pencil, BarChart3, GaugeCircle, Lock, EyeOff, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";

const MAX_Q = 5;
const blankQuestion = () => ({ text: "", type: "skor", options: ["", ""], allow_comment: false });
const blankPulse = () => ({
  title: "", icon: "Activity", audience: emptyAudience(), status: "active",
  questions: [blankQuestion()], mandatory: false, anonymous: false,
  frequency: "haftalik", start_date: "2026-08-01",
});

const PulseDialog = ({ open, onOpenChange, initial, onSave }) => {
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial, open]);
  if (!form) return null;

  const setQ = (idx, patch) => {
    const qs = form.questions.map((q, i) => (i === idx ? { ...q, ...patch } : q));
    setForm({ ...form, questions: qs });
  };
  const addQuestion = () => {
    if (form.questions.length >= MAX_Q) return toast.error("Bir pulse en fazla 5 soru içerebilir.");
    setForm({ ...form, questions: [...form.questions, blankQuestion()] });
  };
  const removeQuestion = (idx) => {
    if (form.questions.length <= 1) return toast.error("En az 1 soru olmalıdır.");
    setForm({ ...form, questions: form.questions.filter((_, i) => i !== idx) });
  };
  const setOption = (qi, oi, val) => setQ(qi, { options: form.questions[qi].options.map((o, i) => (i === oi ? val : o)) });
  const addOption = (qi) => setQ(qi, { options: [...form.questions[qi].options, ""] });
  const removeOption = (qi, oi) => setQ(qi, { options: form.questions[qi].options.filter((_, i) => i !== oi) });

  const submit = () => {
    if (!form.title.trim()) return toast.error("Pulse başlığı zorunlu");
    for (const q of form.questions) {
      if (!q.text.trim()) return toast.error("Tüm soru metinlerini doldurun");
      if (q.type === "tek_secim" && q.options.filter((o) => o.trim()).length < 2)
        return toast.error("Tek seçim soruları en az 2 şık gerektirir");
    }
    const cleaned = {
      ...form,
      questions: form.questions.map((q) => ({
        ...q,
        options: q.type === "tek_secim" ? q.options.filter((o) => o.trim()) : [],
      })),
    };
    onSave(cleaned);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto pln-scroll">
        <DialogHeader>
          <DialogTitle className="font-heading">{form.id ? "Pulse Düzenle" : "Yeni Pulse Anketi"}</DialogTitle>
          <DialogDescription>Kısa, sık tekrarlanan nabız anketi. En fazla 5 soru, dallanma yoktur.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="flex items-end gap-3">
            <div><Label className="mb-1.5 block">İkon</Label><IconPicker value={form.icon} onChange={(v) => setForm({ ...form, icon: v })} testPrefix="pulse-icon" /></div>
            <div className="flex-1"><Label className="mb-1.5 block">Pulse Başlığı</Label>
              <Input data-testid="pulse-title-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="örn. Haftalık Nabız Anketi" />
            </div>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
              <span className="text-sm font-medium text-slate-700">Zorunlu Pulse</span>
              <Switch data-testid="pulse-mandatory" checked={form.mandatory} onCheckedChange={(c) => setForm({ ...form, mandatory: c })} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
              <span className="text-sm font-medium text-slate-700 flex items-center gap-1"><EyeOff className="w-4 h-4 text-slate-400" /> Anonim Yanıtlar</span>
              <Switch data-testid="pulse-anonymous" checked={form.anonymous} onCheckedChange={(c) => setForm({ ...form, anonymous: c })} />
            </div>
            <div>
              <Label className="mb-1.5 block">Sıklık</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                <SelectTrigger data-testid="pulse-frequency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="haftalik">Haftalık</SelectItem>
                  <SelectItem value="aylik">Aylık</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">Başlangıç Tarihi</Label>
              <Input type="date" data-testid="pulse-startdate" value={form.start_date || ""} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
            <span className="text-sm font-medium text-slate-700">Durum: {form.status === "active" ? "Aktif" : "Pasif"}</span>
            <Switch data-testid="pulse-status" checked={form.status === "active"} onCheckedChange={(c) => setForm({ ...form, status: c ? "active" : "passive" })} />
          </div>

          {/* Question pool */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-bold">Soru Havuzu ({form.questions.length}/{MAX_Q})</Label>
              <Button type="button" size="sm" variant="outline" onClick={addQuestion} data-testid="pulse-add-question" disabled={form.questions.length >= MAX_Q}>
                <Plus className="w-4 h-4 mr-1" /> Soru Ekle
              </Button>
            </div>
            {form.questions.length >= MAX_Q && (
              <p className="flex items-center gap-1 text-xs text-amber-600 mb-2"><AlertTriangle className="w-3.5 h-3.5" /> Maksimum soru sayısına ulaşıldı (5).</p>
            )}
            <p className="text-xs text-slate-400 mb-3">Dallanma (branching) yoktur — sorular her zaman sabit sırada gösterilir.</p>

            <div className="space-y-4">
              {form.questions.map((q, qi) => (
                <div key={qi} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50" data-testid={`pulse-q-${qi}`}>
                  <div className="flex items-start gap-2">
                    <span className="mt-2 text-xs font-bold text-slate-400">#{qi + 1}</span>
                    <div className="flex-1 space-y-3">
                      <Input data-testid={`pulse-q-text-${qi}`} value={q.text} onChange={(e) => setQ(qi, { text: e.target.value })} placeholder="Soru metni" />
                      <div className="flex items-center gap-3 flex-wrap">
                        <Select value={q.type} onValueChange={(v) => setQ(qi, { type: v })}>
                          <SelectTrigger className="w-48" data-testid={`pulse-q-type-${qi}`}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="skor">Skor / Emoji (1-5)</SelectItem>
                            <SelectItem value="tek_secim">Tek Seçim</SelectItem>
                          </SelectContent>
                        </Select>
                        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                          <Switch checked={q.allow_comment} onCheckedChange={(c) => setQ(qi, { allow_comment: c })} data-testid={`pulse-q-comment-${qi}`} />
                          Opsiyonel yorum alanı
                        </label>
                      </div>
                      {q.type === "tek_secim" && (
                        <div className="space-y-2">
                          {q.options.map((o, oi) => (
                            <div key={oi} className="flex items-center gap-2">
                              <Input data-testid={`pulse-q-${qi}-opt-${oi}`} value={o} onChange={(e) => setOption(qi, oi, e.target.value)} placeholder={`Şık ${oi + 1}`} className="h-8" />
                              <button type="button" onClick={() => removeOption(qi, oi)} className="p-1 text-slate-400 hover:text-rose-500"><X className="w-4 h-4" /></button>
                            </div>
                          ))}
                          <Button type="button" size="sm" variant="ghost" onClick={() => addOption(qi)} className="text-blue-600 h-7" data-testid={`pulse-q-${qi}-add-opt`}><Plus className="w-3.5 h-3.5 mr-1" /> Şık ekle</Button>
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={() => removeQuestion(qi)} data-testid={`pulse-q-remove-${qi}`} className="p-1.5 text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Hedef Kitle</Label>
            <SegmentPicker value={form.audience} onChange={(a) => setForm({ ...form, audience: a })} testPrefix="pulse-seg" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button data-testid="pulse-save-btn" className="bg-blue-500 hover:bg-blue-600" onClick={submit}>Kaydet</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const PulsesManager = () => {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [reportId, setReportId] = useState(null);

  const load = () => api.pulses().then(setItems);
  useEffect(() => { load(); }, []);

  const save = async (form) => {
    if (form.id) { const { id, category_id, created_at, ...rest } = form; await api.updatePulse(id, rest); }
    else await api.createPulse(form);
    setOpen(false); load(); toast.success("Pulse kaydedildi");
  };

  if (reportId) return <PulseReport pulseId={reportId} onBack={() => setReportId(null)} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="font-heading font-bold text-xl text-slate-800">Pulse Anketleri</h2>
          <p className="text-sm text-slate-500">Kısa ve sık nabız anketleri oluşturun, yanıt oranlarını izleyin.</p>
        </div>
        <Button data-testid="add-pulse-btn" className="bg-blue-500 hover:bg-blue-600" onClick={() => { setEditing(blankPulse()); setOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Yeni Pulse
        </Button>
      </div>

      <div className="space-y-3">
        {items.length === 0 && <div className="text-sm text-slate-400 py-10 text-center">Henüz pulse yok.</div>}
        {items.map((p) => (
          <div key={p.id} data-testid={`pulse-row-${p.id}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 grid place-items-center shrink-0"><GaugeCircle className="w-6 h-6" /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-slate-800 truncate">{p.title}</h3>
                <span className={["text-[11px] rounded-full px-2 py-0.5", p.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"].join(" ")}>{p.status === "active" ? "Aktif" : "Pasif"}</span>
                {p.mandatory && <span className="text-[11px] rounded-full px-2 py-0.5 bg-rose-50 text-rose-600">Zorunlu</span>}
                {p.anonymous && <span className="text-[11px] rounded-full px-2 py-0.5 bg-slate-100 text-slate-500 flex items-center gap-1"><Lock className="w-3 h-3" /> Anonim</span>}
                <span className="text-[11px] rounded-full px-2 py-0.5 bg-blue-50 text-blue-600">{p.frequency === "haftalik" ? "Haftalık" : "Aylık"}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{p.questions.length} soru · Hedef: {audienceSummary(p.audience)} · Yanıt oranı: %{p.response_rate} ({p.response_count}/{p.target_count})</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button data-testid={`pulse-report-${p.id}`} onClick={() => setReportId(p.id)} className="p-2 rounded-lg text-blue-600 hover:bg-blue-50" title="Rapor"><BarChart3 className="w-4 h-4" /></button>
              <button data-testid={`pulse-edit-${p.id}`} onClick={() => { setEditing({ ...p, questions: p.questions.map((q) => ({ ...q, options: q.options.length ? q.options : ["", ""] })) }); setOpen(true); }} className="p-2 rounded-lg text-slate-400 hover:text-blue-500"><Pencil className="w-4 h-4" /></button>
              <button data-testid={`pulse-del-${p.id}`} onClick={async () => { await api.deletePulse(p.id); load(); toast.success("Silindi"); }} className="p-2 rounded-lg text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>

      <PulseDialog open={open} onOpenChange={setOpen} initial={editing} onSave={save} />
    </div>
  );
};
