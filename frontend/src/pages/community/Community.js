import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/api";
import { useApp } from "@/context/AppContext";
import { Icon } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { AudiencePicker } from "@/components/AudiencePicker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { emptyAudience } from "@/lib/constants";
import { ChevronLeft, Users, MessageSquare, Plus, Pin, Trash2, Send, BadgeCheck, CheckCircle2, BarChart3, Circle } from "lucide-react";
import { toast } from "sonner";

const COLORS = { sky: "bg-sky-50 text-sky-600", violet: "bg-violet-50 text-violet-600", emerald: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600", rose: "bg-rose-50 text-rose-600", orange: "bg-orange-50 text-orange-600" };

const Avatar = ({ url, name, size = "w-9 h-9" }) =>
  url ? <img src={url} alt="" className={`${size} rounded-full object-cover bg-slate-100`} />
    : <div className={`${size} rounded-full bg-blue-50 text-blue-600 grid place-items-center font-semibold text-xs`}>{(name || "?").charAt(0)}</div>;

const ExpertBadge = () => <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-blue-600 bg-blue-50 rounded-full px-1.5 py-0.5"><BadgeCheck className="w-3 h-3" /> Uzman</span>;

export const CommunitiesFeed = () => {
  const navigate = useNavigate();
  const { currentEmployeeId } = useApp();
  const [items, setItems] = useState([]);
  useEffect(() => { if (currentEmployeeId) api.communitiesFeed(currentEmployeeId).then(setItems); }, [currentEmployeeId]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <button data-testid="community-back" onClick={() => navigate("/ic-iletisim")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4"><ChevronLeft className="w-4 h-4" /> İç İletişim</button>
      <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-800 flex items-center gap-2"><Users className="w-7 h-7 text-blue-500" /> Topluluk</h1>
      <p className="text-sm text-slate-500 mt-1">İlgi alanına göre topluluklarda sohbet et, tartış, oyla.</p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.length === 0 && <div className="col-span-full text-sm text-slate-400 py-10 text-center">Sana açık topluluk yok.</div>}
        {items.map((c) => (
          <button key={c.id} data-testid={`community-card-${c.id}`} onClick={() => navigate(`/ic-iletisim/topluluk/${c.id}`)}
            className="text-left bg-white rounded-2xl border border-slate-100 shadow-sm p-5 transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className={`w-11 h-11 rounded-xl grid place-items-center ${COLORS[c.color] || COLORS.sky}`}><Icon name={c.icon} className="w-6 h-6" /></div>
            <h3 className="font-heading font-bold text-slate-800 text-lg mt-3">{c.name}</h3>
            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{c.description}</p>
            <p className="text-xs text-slate-400 mt-3">{c.post_count} gönderi{c.is_expert ? " · Sen uzmansın ✓" : ""}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

const PostCard = ({ post, isAdmin, employeeId, onChange }) => {
  const [comment, setComment] = useState("");
  const addComment = async () => { if (!comment.trim()) return; await api.commentPost(post.id, { author_id: employeeId, body: comment }); setComment(""); onChange(); };
  const vote = async (oid) => { await api.votePost(post.id, { employee_id: employeeId, option_id: oid }); onChange(); };
  const myVote = post.type === "anket" ? post.options.find((o) => (o.votes || []).includes(employeeId))?.id : null;

  return (
    <div data-testid={`post-${post.id}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-3">
        <Avatar url={post.author?.avatar} name={post.author?.name} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5"><span className="font-semibold text-slate-800 text-sm">{post.author?.name}</span>{post.author?.is_expert && <ExpertBadge />}</div>
          <p className="text-[11px] text-slate-400">{post.author?.department}</p>
        </div>
        {post.pinned && <Pin className="w-4 h-4 text-amber-500" />}
        {isAdmin && (
          <div className="flex gap-1">
            <button data-testid={`post-pin-${post.id}`} onClick={async () => { await api.pinPost(post.id); onChange(); }} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500"><Pin className="w-4 h-4" /></button>
            <button data-testid={`post-del-${post.id}`} onClick={async () => { await api.deletePost(post.id); onChange(); }} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="flex items-center gap-2">
          {post.type === "anket" && <BarChart3 className="w-4 h-4 text-violet-500" />}
          <h3 className="font-heading font-semibold text-slate-800">{post.title}</h3>
        </div>
        {post.body && <p className="text-sm text-slate-600 mt-1.5 whitespace-pre-wrap">{post.body}</p>}

        {post.type === "anket" && (
          <div className="mt-3 space-y-2">
            {post.options.map((o) => (
              <button key={o.id} data-testid={`poll-option-${o.id}`} onClick={() => vote(o.id)}
                className={`w-full text-left relative overflow-hidden rounded-xl border px-3 py-2.5 transition-all ${myVote === o.id ? "border-violet-400" : "border-slate-200 hover:border-violet-300"}`}>
                <div className="absolute inset-y-0 left-0 bg-violet-50" style={{ width: `${o.percent}%` }} />
                <div className="relative flex items-center justify-between">
                  <span className="text-sm text-slate-700 flex items-center gap-1.5">{myVote === o.id ? <CheckCircle2 className="w-4 h-4 text-violet-500" /> : <Circle className="w-4 h-4 text-slate-300" />} {o.text}</span>
                  <span className="text-xs font-semibold text-slate-500">%{o.percent} ({o.count})</span>
                </div>
              </button>
            ))}
            <p className="text-[11px] text-slate-400">Toplam {post.total_votes} oy</p>
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-slate-50 pt-3 space-y-2.5">
        {(post.comments || []).map((c) => (
          <div key={c.id} data-testid={`comment-${c.id}`} className={`flex items-start gap-2.5 rounded-xl p-2.5 ${c.verified ? "bg-emerald-50/60 border border-emerald-100" : "bg-slate-50"}`}>
            <Avatar url={c.author?.avatar} name={c.author?.name} size="w-7 h-7" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-slate-700 text-xs">{c.author?.name}</span>
                {c.author?.is_expert && <ExpertBadge />}
                {c.verified && <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600"><CheckCircle2 className="w-3 h-3" /> Doğrulanmış cevap</span>}
              </div>
              <p className="text-sm text-slate-600 mt-0.5">{c.body}</p>
            </div>
            {isAdmin && (
              <div className="flex gap-1 shrink-0">
                <button data-testid={`comment-verify-${c.id}`} title="Doğrula" onClick={async () => { await api.verifyComment(post.id, c.id); onChange(); }} className="p-1 text-slate-400 hover:text-emerald-500"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                <button data-testid={`comment-del-${c.id}`} onClick={async () => { await api.deleteComment(post.id, c.id); onChange(); }} className="p-1 text-slate-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            )}
          </div>
        ))}
        <div className="flex items-center gap-2">
          <Input data-testid={`comment-input-${post.id}`} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Yorum yaz..." onKeyDown={(e) => e.key === "Enter" && addComment()} className="h-9" />
          <Button size="sm" data-testid={`comment-send-${post.id}`} className="bg-blue-500 hover:bg-blue-600 shrink-0" onClick={addComment}><Send className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  );
};

const ChatPanel = ({ cid, employeeId, isAdmin }) => {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const seen = useRef(new Set());
  const lastTs = useRef(null);
  const wsRef = useRef(null);
  const pollRef = useRef(null);
  const boxRef = useRef(null);

  const add = (arr) => setMsgs((prev) => {
    const next = [...prev];
    for (const m of arr) {
      if (!seen.current.has(m.id)) { seen.current.add(m.id); next.push(m); lastTs.current = m.created_at; }
    }
    return next;
  });

  const scrollDown = () => { setTimeout(() => { if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight; }, 50); };

  useEffect(() => {
    let stopped = false;
    api.communityMessages(cid).then((m) => { add(m); scrollDown(); });

    const startPolling = () => {
      if (pollRef.current || stopped) return;
      pollRef.current = setInterval(async () => {
        const m = await api.communityMessages(cid, lastTs.current);
        if (m.length) { add(m); scrollDown(); }
      }, 3000);
    };

    try {
      const wsUrl = (process.env.REACT_APP_BACKEND_URL || "").replace(/^http/, "ws") + `/api/ws/community/${cid}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onmessage = (ev) => { try { const d = JSON.parse(ev.data); if (d.kind === "message") { add([d.data]); scrollDown(); } } catch (e) {} };
      ws.onerror = startPolling;
      ws.onclose = () => { if (!stopped) startPolling(); };
    } catch (e) { startPolling(); }

    return () => { stopped = true; if (wsRef.current) wsRef.current.close(); if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line
  }, [cid]);

  const send = async () => {
    if (!text.trim()) return;
    const t = text; setText("");
    const m = await api.sendMessage(cid, { author_id: employeeId, text: t });
    add([m]); scrollDown();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[520px]">
      <div ref={boxRef} data-testid="chat-box" className="flex-1 overflow-y-auto pln-scroll p-4 space-y-3">
        {msgs.length === 0 && <p className="text-center text-sm text-slate-400 py-10">Henüz mesaj yok. İlk mesajı sen yaz!</p>}
        {msgs.map((m) => {
          const mine = m.author_id === employeeId;
          return (
            <div key={m.id} data-testid={`msg-${m.id}`} className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
              <Avatar url={m.author?.avatar} name={m.author?.name} size="w-7 h-7" />
              <div className={`max-w-[70%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[11px] text-slate-400">{m.author?.name}</span>
                  {m.author?.is_expert && <ExpertBadge />}
                </div>
                <div className={`rounded-2xl px-3.5 py-2 text-sm ${mine ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-700"}`}>{m.text}</div>
              </div>
              {isAdmin && <button data-testid={`msg-del-${m.id}`} onClick={async () => { await api.deleteMessage(m.id); setMsgs((p) => p.filter((x) => x.id !== m.id)); }} className="p-1 text-slate-300 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>}
            </div>
          );
        })}
      </div>
      <div className="border-t border-slate-100 p-3 flex items-center gap-2">
        <Input data-testid="chat-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Mesaj yaz..." onKeyDown={(e) => e.key === "Enter" && send()} />
        <Button data-testid="chat-send" className="bg-blue-500 hover:bg-blue-600 shrink-0" onClick={send}><Send className="w-4 h-4" /></Button>
      </div>
    </div>
  );
};

export const CommunityDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentEmployeeId, role } = useApp();
  const isAdmin = role === "admin";
  const [community, setCommunity] = useState(null);
  const [tab, setTab] = useState("chat");
  const [posts, setPosts] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "tartisma", title: "", body: "", options: ["", ""] });

  const loadPosts = () => api.communityPosts(id).then(setPosts);
  useEffect(() => { api.community(id).then(setCommunity); loadPosts(); }, [id]);

  const createPost = async () => {
    if (!form.title.trim()) return toast.error("Başlık zorunlu");
    const payload = { author_id: currentEmployeeId, type: form.type, title: form.title, body: form.body };
    if (form.type === "anket") {
      const opts = form.options.map((o) => o.trim()).filter(Boolean);
      if (opts.length < 2) return toast.error("Anket için en az 2 seçenek");
      payload.options = opts;
    }
    await api.createPost(id, payload);
    setOpen(false); setForm({ type: "tartisma", title: "", body: "", options: ["", ""] }); loadPosts(); toast.success("Gönderi eklendi");
  };

  if (!community) return <div className="max-w-4xl mx-auto px-6 py-16 text-center text-slate-400">Yükleniyor...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <button data-testid="community-detail-back" onClick={() => navigate("/ic-iletisim/topluluk")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4"><ChevronLeft className="w-4 h-4" /> Topluluklar</button>
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-xl grid place-items-center ${COLORS[community.color] || COLORS.sky}`}><Icon name={community.icon} className="w-6 h-6" /></div>
        <div><h1 className="text-2xl font-heading font-bold text-slate-800">{community.name}</h1><p className="text-sm text-slate-500">{community.description}</p></div>
      </div>
      {community.expert_people?.length > 0 && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400">Uzmanlar:</span>
          {community.expert_people.map((e) => <span key={e.id} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 rounded-full pl-1 pr-2 py-0.5"><Avatar url={e.avatar} name={e.name} size="w-5 h-5" /> {e.name}</span>)}
        </div>
      )}

      <div className="flex gap-2 mt-6 border-b border-slate-200">
        {[["chat", "Sohbet", MessageSquare], ["posts", "Gönderiler", BarChart3]].map(([k, l, I]) => (
          <button key={k} data-testid={`community-tab-${k}`} onClick={() => setTab(k)}
            className={["flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors", tab === k ? "text-blue-600 border-blue-600" : "text-slate-500 border-transparent hover:text-slate-800"].join(" ")}>
            <I className="w-4 h-4" /> {l}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "chat" && <ChatPanel cid={id} employeeId={currentEmployeeId} isAdmin={isAdmin} />}
        {tab === "posts" && (
          <div className="space-y-4">
            <Button data-testid="new-post-btn" className="bg-blue-500 hover:bg-blue-600" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> Yeni Gönderi</Button>
            {posts.length === 0 && <div className="text-sm text-slate-400 py-8 text-center">Henüz gönderi yok.</div>}
            {posts.map((p) => <PostCard key={p.id} post={p} isAdmin={isAdmin} employeeId={currentEmployeeId} onChange={loadPosts} />)}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-heading">Yeni Gönderi</DialogTitle><DialogDescription>Tartışma başlat veya anket oluştur.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              {[["tartisma", "Tartışma"], ["anket", "Anket"]].map(([k, l]) => (
                <button key={k} data-testid={`post-type-${k}`} onClick={() => setForm({ ...form, type: k })}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${form.type === k ? "border-blue-500 bg-blue-50 text-blue-600" : "border-slate-200 text-slate-600"}`}>{l}</button>
              ))}
            </div>
            <div><Label className="mb-1.5 block">Başlık</Label><Input data-testid="post-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Başlık" /></div>
            {form.type === "tartisma" && <div><Label className="mb-1.5 block">İçerik</Label><Textarea data-testid="post-body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={3} /></div>}
            {form.type === "anket" && (
              <div className="space-y-2">
                <Label>Seçenekler</Label>
                {form.options.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input data-testid={`post-option-${i}`} value={o} onChange={(e) => setForm({ ...form, options: form.options.map((x, idx) => idx === i ? e.target.value : x) })} placeholder={`Seçenek ${i + 1}`} />
                    {form.options.length > 2 && <button onClick={() => setForm({ ...form, options: form.options.filter((_, idx) => idx !== i) })} className="p-1.5 text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                ))}
                <button data-testid="add-option-btn" onClick={() => setForm({ ...form, options: [...form.options, ""] })} className="text-xs text-blue-600 hover:underline">+ Seçenek ekle</button>
              </div>
            )}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>İptal</Button><Button data-testid="post-save-btn" className="bg-blue-500 hover:bg-blue-600" onClick={createPost}>Paylaş</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ICON_OPTS = ["Users", "Code", "Dumbbell", "Coffee", "BookOpen", "Rocket", "Heart", "Gamepad2"];
const COLOR_OPTS = ["sky", "violet", "emerald", "amber", "rose", "orange"];

export const CommunitiesManager = () => {
  const [items, setItems] = useState([]);
  const [emps, setEmps] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [expertFor, setExpertFor] = useState(null);

  const load = () => api.communities().then(setItems);
  useEffect(() => { load(); api.employees().then(setEmps); }, []);

  const openNew = () => { setForm({ name: "", description: "", icon: "Users", color: "sky", audience: emptyAudience(), status: "active" }); setOpen(true); };
  const openEdit = (c) => { setForm({ ...c }); setOpen(true); };
  const save = async () => {
    if (!form.name.trim()) return toast.error("Ad zorunlu");
    const payload = { name: form.name, description: form.description, icon: form.icon, color: form.color, audience: form.audience, status: form.status };
    if (form.id) await api.updateCommunity(form.id, payload); else await api.createCommunity(payload);
    setOpen(false); load(); toast.success("Topluluk kaydedildi");
  };
  const toggleExpert = async (empId) => { const r = await api.toggleExpert(expertFor.id, empId); setExpertFor({ ...expertFor, experts: r.experts }); load(); };

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div><h2 className="font-heading font-bold text-xl text-slate-800">Topluluk Yönetimi</h2><p className="text-sm text-slate-500">Toplulukları, hedef kitleyi ve uzmanları yönet.</p></div>
        <Button data-testid="add-community-btn" className="bg-blue-500 hover:bg-blue-600" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Yeni Topluluk</Button>
      </div>
      <div className="space-y-3">
        {items.length === 0 && <div className="text-sm text-slate-400 py-8 text-center">Henüz topluluk yok.</div>}
        {items.map((c) => (
          <div key={c.id} data-testid={`community-row-${c.id}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg grid place-items-center shrink-0 ${COLORS[c.color] || COLORS.sky}`}><Icon name={c.icon} className="w-6 h-6" /></div>
            <div className="flex-1 min-w-0"><h3 className="font-semibold text-slate-800 truncate">{c.name}</h3><p className="text-xs text-slate-400 mt-0.5">{c.post_count} gönderi · {(c.experts || []).length} uzman</p></div>
            <Button variant="outline" size="sm" data-testid={`community-experts-${c.id}`} onClick={() => setExpertFor(c)}>Uzmanlar</Button>
            <Button variant="outline" size="sm" data-testid={`community-edit-${c.id}`} onClick={() => openEdit(c)}>Düzenle</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild><button data-testid={`community-del-${c.id}`} className="p-2 rounded-lg text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle className="font-heading">Topluluğu sil?</AlertDialogTitle><AlertDialogDescription>"{c.name}", tüm gönderileri ve mesajları silinecek.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction className="bg-rose-500 hover:bg-rose-600" onClick={async () => { await api.deleteCommunity(c.id); load(); toast.success("Silindi"); }}>Sil</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto pln-scroll">
          <DialogHeader><DialogTitle className="font-heading">{form?.id ? "Topluluğu Düzenle" : "Yeni Topluluk"}</DialogTitle><DialogDescription>Ad, görsel ve hedef kitle.</DialogDescription></DialogHeader>
          {form && (
            <div className="space-y-4 py-2">
              <div><Label className="mb-1.5 block">Ad</Label><Input data-testid="community-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label className="mb-1.5 block">Açıklama</Label><Textarea data-testid="community-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="mb-1.5 block">İkon</Label><Select value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })}><SelectTrigger data-testid="community-icon"><SelectValue /></SelectTrigger><SelectContent>{ICON_OPTS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
                <div><Label className="mb-1.5 block">Renk</Label><Select value={form.color} onValueChange={(v) => setForm({ ...form, color: v })}><SelectTrigger data-testid="community-color"><SelectValue /></SelectTrigger><SelectContent>{COLOR_OPTS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div><Label className="mb-1.5 block">Hedef Kitle</Label><AudiencePicker value={form.audience} onChange={(a) => setForm({ ...form, audience: a })} testPrefix="comm-aud" /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>İptal</Button><Button data-testid="community-save-btn" className="bg-blue-500 hover:bg-blue-600" onClick={save}>Kaydet</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!expertFor} onOpenChange={(o) => !o && setExpertFor(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto pln-scroll">
          <DialogHeader><DialogTitle className="font-heading">Uzmanlar · {expertFor?.name}</DialogTitle><DialogDescription>Uzman olarak işaretlenen çalışanların gönderileri ✓ Uzman rozetiyle görünür.</DialogDescription></DialogHeader>
          {expertFor && (
            <div className="space-y-1.5 py-2">
              {emps.map((e) => {
                const on = (expertFor.experts || []).includes(e.id);
                return (
                  <button key={e.id} data-testid={`expert-toggle-${e.id}`} onClick={() => toggleExpert(e.id)}
                    className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2 transition-all ${on ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}>
                    <Avatar url={e.avatar} name={e.name} size="w-8 h-8" />
                    <div className="flex-1 text-left"><p className="text-sm font-medium text-slate-700">{e.name}</p><p className="text-[11px] text-slate-400">{e.department}</p></div>
                    {on && <BadgeCheck className="w-5 h-5 text-blue-500" />}
                  </button>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
