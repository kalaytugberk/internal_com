import React, { useEffect, useState } from "react";
import { api } from "@/api";
import { AudiencePicker } from "@/components/AudiencePicker";
import { emptyAudience, audienceSummary } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Pencil, Trash2, ChevronLeft, X, BarChart3 } from "lucide-react";
import { toast } from "sonner";

const STYLES = ["thumbs", "bottts", "avataaars", "adventurer", "shapes", "identicon", "fun-emoji", "lorelei"];

const ConceptDialog = ({ open, onOpenChange, initial, onSave }) => {
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial, open]);
  if (!form) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto pln-scroll">
        <DialogHeader>
          <DialogTitle className="font-heading">{form.id ? "Konsepti Düzenle" : "Yeni Konsept"}</DialogTitle>
          <DialogDescription>Konsept adı ve hedef kitlesi. Kitle boşsa üst kategoriden miras alınır.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div><Label className="mb-1.5 block">Konsept Adı</Label><Input data-testid="concept-name-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="örn. Uzay" /></div>
          {!form.id && (
            <div>
              <Label className="mb-1.5 block">Avatar Stili (otomatik üretim)</Label>
              <Select value={form.style} onValueChange={(v) => setForm({ ...form, style: v })}>
                <SelectTrigger data-testid="concept-style"><SelectValue /></SelectTrigger>
                <SelectContent>{STYLES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs text-slate-400 mt-1">Kaydedince 12 avatar otomatik oluşturulur (DiceBear).</p>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <Checkbox checked={form.inherit} onCheckedChange={(c) => setForm({ ...form, inherit: c })} data-testid="concept-inherit" />
            Hedef kitleyi üst kategoriden miras al
          </label>
          {!form.inherit && <AudiencePicker value={form.audience} onChange={(a) => setForm({ ...form, audience: a })} testPrefix="concept-seg" />}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button data-testid="concept-save-btn" className="bg-blue-500 hover:bg-blue-600" onClick={() => { if (!form.name.trim()) return toast.error("İsim zorunlu"); onSave(form); }}>Kaydet</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Gallery = ({ concept, reload }) => (
  <div className="mt-3 pl-4 border-l-2 border-slate-100">
    <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
      {concept.avatars.map((a) => (
        <div key={a} className="relative group aspect-square rounded-lg overflow-hidden bg-slate-50">
          <img src={a} alt="" className="w-full h-full object-cover" />
          <button data-testid={`avatar-remove`} onClick={async () => { await api.removeAvatar(concept.id, a); reload(); }}
            className="absolute top-0.5 right-0.5 bg-black/50 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
        </div>
      ))}
      <button data-testid={`avatar-add-${concept.id}`} onClick={async () => { await api.addAvatar(concept.id); reload(); }}
        className="aspect-square rounded-lg border-2 border-dashed border-slate-300 grid place-items-center text-slate-400 hover:border-blue-400 hover:text-blue-500"><Plus className="w-5 h-5" /></button>
    </div>
  </div>
);

export const AvatarConcepts = () => {
  const [concepts, setConcepts] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [report, setReport] = useState(null);

  const load = () => api.concepts().then(setConcepts);
  useEffect(() => { load(); }, []);

  const save = async (form) => {
    const audience = form.inherit ? null : form.audience;
    if (form.id) await api.updateConcept(form.id, { name: form.name, audience });
    else await api.createConcept({ name: form.name, style: form.style, audience, count: 12 });
    setOpen(false); load(); toast.success("Konsept kaydedildi");
  };
  const openNew = () => { setEditing({ name: "", style: "bottts", inherit: true, audience: emptyAudience() }); setOpen(true); };
  const openEdit = (c) => { setEditing({ id: c.id, name: c.name, style: c.style, inherit: !c.audience, audience: c.audience || emptyAudience() }); setOpen(true); };

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="font-heading font-bold text-xl text-slate-800">Avatar Konseptleri</h2>
          <p className="text-sm text-slate-500">Konsept oluştur, hedef kitle ata, avatar galerisini yönet.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="avatar-report-btn" onClick={() => api.avatarReport().then(setReport)}><BarChart3 className="w-4 h-4 mr-1.5" /> Popülerlik</Button>
          <Button data-testid="add-concept-btn" className="bg-blue-500 hover:bg-blue-600" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Yeni Konsept</Button>
        </div>
      </div>

      {report && (
        <div data-testid="avatar-report" className="mb-5 rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
          <h3 className="font-heading font-semibold text-slate-700 mb-3">Konsept Popülerliği ({report.total_selected}/{report.total_employees} seçim yaptı)</h3>
          <div className="space-y-2">
            {report.concepts.map((c) => (
              <div key={c.name}>
                <div className="flex justify-between text-sm mb-1"><span className="text-slate-600">{c.name}</span><span className="text-slate-400">{c.count}</span></div>
                <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-blue-500" style={{ width: `${report.total_selected ? Math.round(100 * c.count / report.total_selected) : 0}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {concepts.map((c) => (
          <div key={c.id} data-testid={`concept-row-${c.id}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <img src={c.cover} alt="" className="w-12 h-12 rounded-xl object-cover bg-slate-50 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-heading font-semibold text-slate-800">{c.name}</h3>
                  <span className={["text-[11px] rounded-full px-2 py-0.5", c.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"].join(" ")}>{c.status === "active" ? "Aktif" : "Pasif"}</span>
                  <span className="text-[11px] rounded-full px-2 py-0.5 bg-blue-50 text-blue-600">{c.avatars.length} avatar</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Hedef: {c.audience ? audienceSummary(c.audience) : "Üstten miras"}</p>
              </div>
              <button data-testid={`concept-gallery-${c.id}`} onClick={() => setExpanded({ ...expanded, [c.id]: !expanded[c.id] })} className="text-xs text-blue-600 px-2">Galeri</button>
              <button data-testid={`concept-edit-${c.id}`} onClick={() => openEdit(c)} className="p-2 text-slate-400 hover:text-blue-500"><Pencil className="w-4 h-4" /></button>
              <button data-testid={`concept-del-${c.id}`} onClick={async () => { await api.deleteConcept(c.id); load(); }} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
            </div>
            {expanded[c.id] && <Gallery concept={c} reload={load} />}
          </div>
        ))}
      </div>

      <ConceptDialog open={open} onOpenChange={setOpen} initial={editing} onSave={save} />
    </div>
  );
};
