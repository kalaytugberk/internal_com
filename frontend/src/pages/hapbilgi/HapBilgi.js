import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Heart, ChevronLeft, Lightbulb } from "lucide-react";
import { toast } from "sonner";

export const HapBilgiManager = () => {
  const [topics, setTopics] = useState([]);
  const [posts, setPosts] = useState([]);
  const [newTopic, setNewTopic] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(null);

  const load = () => { api.hapTopics().then(setTopics); api.hapPosts().then(setPosts); };
  useEffect(() => { load(); }, []);

  const addTopic = async () => { if (!newTopic.trim()) return; await api.createHapTopic({ name: newTopic }); setNewTopic(""); load(); };
  const onImage = (e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => setForm((p) => ({ ...p, image: r.result })); r.readAsDataURL(f); };
  const save = async () => {
    if (!form.title.trim()) return toast.error("Başlık zorunlu");
    await api.createHapPost({ title: form.title, body: form.body, image: form.image || null, topic_id: form.topic_id || null });
    setOpen(false); load(); toast.success("İçerik yayınlandı");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div><h2 className="font-heading font-bold text-xl text-slate-800">Hap Bilgi</h2><p className="text-sm text-slate-500">Konu başlıkları tanımla, kısa bilgilendirmeler yayınla.</p></div>
        <Button data-testid="add-hap-btn" className="bg-blue-500 hover:bg-blue-600" onClick={() => { setForm({ title: "", body: "", image: "", topic_id: topics[0]?.id || "" }); setOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Yeni İçerik</Button>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 mb-5">
        <p className="font-heading font-semibold text-slate-700 mb-2">Konu Başlıkları</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {topics.map((t) => (
            <span key={t.id} data-testid={`hap-topic-${t.id}`} className="inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1 bg-blue-50 text-blue-600">
              {t.name}<button data-testid={`hap-topic-del-${t.id}`} onClick={async () => { await api.deleteHapTopic(t.id); load(); }} className="hover:text-rose-500"><Trash2 className="w-3 h-3" /></button>
            </span>
          ))}
          {topics.length === 0 && <span className="text-xs text-slate-400">Henüz konu başlığı yok.</span>}
        </div>
        <div className="flex gap-2">
          <Input data-testid="hap-topic-input" value={newTopic} onChange={(e) => setNewTopic(e.target.value)} placeholder="örn. Sağlık" className="max-w-xs" />
          <Button variant="outline" onClick={addTopic} data-testid="hap-topic-add">Ekle</Button>
        </div>
      </div>

      <div className="space-y-3">
        {posts.length === 0 && <div className="text-sm text-slate-400 py-10 text-center">Henüz içerik yok.</div>}
        {posts.map((p) => (
          <div key={p.id} data-testid={`hap-row-${p.id}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
            {p.image ? <img src={p.image} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" /> : <div className="w-14 h-14 rounded-lg bg-amber-50 grid place-items-center shrink-0"><Lightbulb className="w-6 h-6 text-amber-500" /></div>}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-800 truncate">{p.title}</h3>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-3">{p.topic_name && <span className="rounded-full px-2 py-0.5 bg-slate-50">{p.topic_name}</span>}<span className="inline-flex items-center gap-1"><Heart className="w-3 h-3" /> {p.reaction_total ?? p.like_count ?? 0}</span></p>
            </div>
            <button data-testid={`hap-del-${p.id}`} onClick={async () => { await api.deleteHapPost(p.id); load(); }} className="p-2 rounded-lg text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-heading">Yeni Hap Bilgi</DialogTitle><DialogDescription>Başlık, kısa metin, opsiyonel görsel ve konu başlığı.</DialogDescription></DialogHeader>
          {form && (
            <div className="space-y-4 py-2">
              <div><Label className="mb-1.5 block">Başlık</Label><Input data-testid="hap-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label className="mb-1.5 block">Metin</Label><Textarea data-testid="hap-body" rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
              <div>
                <Label className="mb-1.5 block">Konu Başlığı</Label>
                <Select value={form.topic_id || undefined} onValueChange={(v) => setForm({ ...form, topic_id: v })}>
                  <SelectTrigger data-testid="hap-topic-select"><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>{topics.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block">Görsel (opsiyonel)</Label>
                <input id="hap-img" type="file" accept="image/*" onChange={onImage} className="hidden" />
                <Button type="button" variant="outline" onClick={() => document.getElementById("hap-img").click()} data-testid="hap-image-upload">Yükle</Button>
                {form.image && <img src={form.image} alt="" className="mt-2 h-20 rounded-lg object-cover" />}
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>İptal</Button><Button data-testid="hap-save-btn" className="bg-blue-500 hover:bg-blue-600" onClick={save}>Yayınla</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const HapBilgiPage = () => {
  const navigate = useNavigate();
  const { currentEmployeeId } = useApp();
  const [topics, setTopics] = useState([]);
  const [posts, setPosts] = useState([]);
  const [topic, setTopic] = useState("");

  const load = () => { if (currentEmployeeId) api.hapFeed(currentEmployeeId, topic || undefined).then(setPosts); };
  useEffect(() => { api.hapTopics().then(setTopics); }, []);
  useEffect(() => { load(); }, [currentEmployeeId, topic]);

  const like = async (id, emoji) => { const r = await api.hapReact(id, currentEmployeeId, emoji); setPosts((ps) => ps.map((p) => p.id === id ? { ...p, reactions_count: r.reactions_count, my_reactions: r.my_reactions } : p)); };
  const EMOJIS = ["👍", "❤️", "😮"];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <button data-testid="hap-page-back" onClick={() => navigate("/ic-iletisim")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4"><ChevronLeft className="w-4 h-4" /> İç İletişim</button>
      <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-800 flex items-center gap-2"><Lightbulb className="w-7 h-7 text-amber-500" /> Hap Bilgi</h1>
      <div className="mt-5 flex flex-wrap gap-2">
        <button data-testid="hap-filter-all" onClick={() => setTopic("")} className={`text-xs rounded-full px-3 py-1.5 border ${topic === "" ? "bg-blue-500 text-white border-blue-500" : "bg-white text-slate-500 border-slate-200"}`}>Tümü</button>
        {topics.map((t) => <button key={t.id} data-testid={`hap-filter-${t.id}`} onClick={() => setTopic(t.id)} className={`text-xs rounded-full px-3 py-1.5 border ${topic === t.id ? "bg-blue-500 text-white border-blue-500" : "bg-white text-slate-500 border-slate-200"}`}>{t.name}</button>)}
      </div>
      <div className="mt-6 space-y-4">
        {posts.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 py-16 text-center text-slate-400 text-sm">İçerik yok.</div>}
        {posts.map((p) => (
          <div key={p.id} data-testid={`hap-card-${p.id}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {p.image && <img src={p.image} alt="" className="w-full h-44 object-cover" />}
            <div className="p-5">
              {p.topic_name && <span className="text-[11px] rounded-full px-2 py-0.5 bg-amber-50 text-amber-600">{p.topic_name}</span>}
              <h3 className="font-heading font-bold text-slate-800 text-lg mt-1.5">{p.title}</h3>
              <p className="text-slate-600 mt-1 whitespace-pre-wrap">{p.body}</p>
              <div className="mt-3 flex items-center gap-2">
                {EMOJIS.map((em) => {
                  const on = (p.my_reactions || []).includes(em);
                  const cnt = (p.reactions_count || {})[em] || 0;
                  return (
                    <button key={em} data-testid={`hap-react-${p.id}-${em}`} onClick={() => like(p.id, em)}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm border transition-colors ${on ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                      <span className="text-base leading-none">{em}</span>{cnt > 0 && <span className="text-xs">{cnt}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
