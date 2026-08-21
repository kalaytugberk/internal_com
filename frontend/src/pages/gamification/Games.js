import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/api";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { ChevronLeft, Gamepad2, Plus, Trash2, Trophy, Clock, Check, Play, Crown } from "lucide-react";
import { toast } from "sonner";

const Avatar = ({ url, name, size = "w-9 h-9" }) =>
  url ? <img src={url} alt="" className={`${size} rounded-full object-cover bg-slate-100`} />
    : <div className={`${size} rounded-full bg-blue-50 text-blue-600 grid place-items-center font-semibold`}>{(name || "?").charAt(0)}</div>;

export const GamesFeed = () => {
  const navigate = useNavigate();
  const { currentEmployeeId } = useApp();
  const [games, setGames] = useState([]);
  useEffect(() => { if (currentEmployeeId) api.gamesFeed(currentEmployeeId).then(setGames); }, [currentEmployeeId]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <button data-testid="games-back" onClick={() => navigate("/ic-iletisim")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4"><ChevronLeft className="w-4 h-4" /> İç İletişim</button>
      <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-800 flex items-center gap-2"><Gamepad2 className="w-7 h-7 text-violet-500" /> Oyun</h1>
      <p className="text-sm text-slate-500 mt-1">Quiz'leri çöz, doğru cevaplarla puan kazan.</p>

      <div className="mt-6 space-y-3">
        {games.length === 0 && <div className="text-sm text-slate-400 py-10 text-center">Aktif oyun yok.</div>}
        {games.map((g) => (
          <div key={g.id} data-testid={`game-card-${g.id}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-500 grid place-items-center shrink-0"><Gamepad2 className="w-6 h-6" /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-slate-800 truncate">{g.title}</h3>
                {g.is_tournament && <span className="text-[10px] rounded-full px-2 py-0.5 bg-amber-100 text-amber-700 inline-flex items-center gap-1"><Trophy className="w-3 h-3" /> Turnuva</span>}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{g.question_count} soru · soru başına {g.time_limit} sn</p>
            </div>
            {g.played ? (
              <div className="text-right shrink-0">
                <span className="inline-flex items-center gap-1 text-emerald-600 text-sm font-semibold"><Check className="w-4 h-4" /> {g.my_score} puan</span>
                <button data-testid={`game-board-${g.id}`} onClick={() => navigate(`/ic-iletisim/oyun/${g.id}`)} className="block text-xs text-blue-600 hover:underline mt-1">Sonuçlar</button>
              </div>
            ) : (
              <Button data-testid={`game-play-${g.id}`} className="bg-violet-500 hover:bg-violet-600 shrink-0" onClick={() => navigate(`/ic-iletisim/oyun/${g.id}`)}><Play className="w-4 h-4 mr-1" /> Oyna</Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const GamePlay = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentEmployeeId } = useApp();
  const [data, setData] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState(null);
  const [board, setBoard] = useState([]);
  const timer = useRef(null);

  const loadBoard = () => api.gameLeaderboard(id).then(setBoard);

  useEffect(() => {
    if (currentEmployeeId) api.gamePlayData(id, currentEmployeeId).then((d) => {
      setData(d);
      if (d.already_played) { setResult(d.my_result); loadBoard(); }
      else setTimeLeft(d.time_limit);
    });
  }, [id, currentEmployeeId]);

  const answer = (choice) => {
    if (timer.current) clearInterval(timer.current);
    const next = [...answers, choice];
    setAnswers(next);
    if (step + 1 < data.questions.length) { setStep(step + 1); setTimeLeft(data.time_limit); }
    else submit(next);
  };

  const submit = async (finalAnswers) => {
    const r = await api.submitGame(id, { employee_id: currentEmployeeId, answers: finalAnswers });
    setResult({ ...r, correct_count: r.correct_count, score: r.score, total: r.total, perfect: r.perfect });
    loadBoard();
    toast.success(`${r.correct_count}/${r.total} doğru · +${r.score} puan`);
  };

  useEffect(() => {
    if (!data || result || data.already_played) return;
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timer.current); answer(-1); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer.current);
    // eslint-disable-next-line
  }, [step, data, result]);

  if (!data) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <button data-testid="gameplay-back" onClick={() => navigate("/ic-iletisim/oyun")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4"><ChevronLeft className="w-4 h-4" /> Oyunlar</button>
      <h1 className="text-xl sm:text-2xl font-heading font-bold text-slate-800">{data.title}</h1>

      {!result && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">Soru {step + 1} / {data.questions.length}</span>
            <span data-testid="game-timer" className={`inline-flex items-center gap-1 text-sm font-semibold ${timeLeft <= 5 ? "text-rose-500" : "text-slate-600"}`}><Clock className="w-4 h-4" /> {timeLeft}s</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-5"><div className="h-full bg-violet-500 transition-all" style={{ width: `${((step) / data.questions.length) * 100}%` }} /></div>
          <div data-testid="game-question" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <p className="font-heading font-semibold text-lg text-slate-800">{data.questions[step].text}</p>
            <div className="mt-4 space-y-2.5">
              {data.questions[step].options.map((o, i) => (
                <button key={i} data-testid={`game-option-${i}`} onClick={() => answer(i)}
                  className="w-full text-left rounded-xl border border-slate-200 px-4 py-3 text-slate-700 hover:border-violet-400 hover:bg-violet-50 transition-all">{o}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-6">
          <div data-testid="game-result" className={`rounded-2xl p-6 text-center text-white ${result.perfect ? "bg-gradient-to-br from-amber-500 to-orange-500" : "bg-gradient-to-br from-violet-600 to-indigo-600"}`}>
            {result.perfect ? <Crown className="w-10 h-10 mx-auto" /> : <Trophy className="w-10 h-10 mx-auto" />}
            <p className="font-heading font-bold text-2xl mt-2">{result.correct_count}/{result.total} Doğru</p>
            <p className="text-white/80">+{result.score} puan kazandın{result.perfect ? " · Tam puan bonusu! 🎉" : ""}</p>
          </div>

          <h3 className="font-heading font-semibold text-slate-700 mt-6 mb-3 flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" /> Skor Tablosu</h3>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
            {board.map((r) => (
              <div key={r.employee_id} data-testid={`game-lb-${r.employee_id}`} className={`flex items-center gap-3 p-3 ${r.employee_id === currentEmployeeId ? "bg-blue-50/60" : ""}`}>
                <span className="w-6 text-center font-bold text-slate-400">{r.rank}</span>
                <Avatar url={r.avatar} name={r.name} />
                <span className="flex-1 text-sm font-medium text-slate-700 truncate">{r.name}</span>
                <span className="text-xs text-slate-400">{r.correct}/{r.total}</span>
                <span className="text-sm font-bold text-blue-600">{r.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const blankQuestion = () => ({ text: "", options: ["", ""], correct_index: 0 });

export const GamesManager = () => {
  const [games, setGames] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(null);

  const load = () => api.games().then(setGames);
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm({ title: "", description: "", time_limit: 20, is_tournament: false, period: "aylik", status: "active", questions: [blankQuestion()] }); setOpen(true); };
  const openEdit = (g) => { setForm({ ...g }); setOpen(true); };

  const setQ = (i, patch) => setForm({ ...form, questions: form.questions.map((q, idx) => idx === i ? { ...q, ...patch } : q) });
  const setOpt = (qi, oi, val) => setQ(qi, { options: form.questions[qi].options.map((o, idx) => idx === oi ? val : o) });

  const save = async () => {
    if (!form.title.trim()) return toast.error("Başlık zorunlu");
    for (const q of form.questions) {
      if (!q.text.trim()) return toast.error("Tüm soruların metni olmalı");
      if (q.options.filter((o) => o.trim()).length < 2) return toast.error("Her soruda en az 2 seçenek olmalı");
    }
    const payload = { title: form.title, description: form.description, time_limit: Number(form.time_limit) || 20, is_tournament: form.is_tournament, period: form.period, status: form.status, questions: form.questions };
    if (form.id) await api.updateGame(form.id, payload); else await api.createGame(payload);
    setOpen(false); load(); toast.success("Oyun kaydedildi");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div><h2 className="font-heading font-bold text-xl text-slate-800">Oyun Yönetimi</h2><p className="text-sm text-slate-500">Quiz oyunları, soru havuzu ve turnuvalar.</p></div>
        <Button data-testid="add-game-btn" className="bg-blue-500 hover:bg-blue-600" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Yeni Oyun</Button>
      </div>

      <div className="space-y-3">
        {games.length === 0 && <div className="text-sm text-slate-400 py-8 text-center">Henüz oyun yok.</div>}
        {games.map((g) => (
          <div key={g.id} data-testid={`game-row-${g.id}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-violet-50 grid place-items-center shrink-0"><Gamepad2 className="w-6 h-6 text-violet-500" /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2"><h3 className="font-semibold text-slate-800 truncate">{g.title}</h3>{g.is_tournament && <span className="text-[10px] rounded-full px-2 py-0.5 bg-amber-100 text-amber-700">Turnuva</span>}</div>
              <p className="text-xs text-slate-400 mt-0.5">{g.question_count} soru · {g.play_count} oynama · {g.status === "active" ? "Aktif" : "Pasif"}</p>
            </div>
            <Button variant="outline" size="sm" data-testid={`game-edit-${g.id}`} onClick={() => openEdit(g)}>Düzenle</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild><button data-testid={`game-del-${g.id}`} className="p-2 rounded-lg text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle className="font-heading">Oyunu sil?</AlertDialogTitle><AlertDialogDescription>"{g.title}" ve tüm skorları silinecek.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction className="bg-rose-500 hover:bg-rose-600" onClick={async () => { await api.deleteGame(g.id); load(); toast.success("Silindi"); }}>Sil</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto pln-scroll">
          <DialogHeader><DialogTitle className="font-heading">{form?.id ? "Oyunu Düzenle" : "Yeni Oyun"}</DialogTitle><DialogDescription>Quiz başlığını ve sorularını tanımla.</DialogDescription></DialogHeader>
          {form && (
            <div className="space-y-4 py-2">
              <div><Label className="mb-1.5 block">Başlık</Label><Input data-testid="game-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="örn. Şirket Kültürü Quiz'i" /></div>
              <div><Label className="mb-1.5 block">Açıklama</Label><Textarea data-testid="game-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
              <div className="grid grid-cols-3 gap-3 items-end">
                <div><Label className="mb-1.5 block">Süre (sn/soru)</Label><Input type="number" data-testid="game-time" value={form.time_limit} onChange={(e) => setForm({ ...form, time_limit: e.target.value })} /></div>
                <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3 col-span-2">
                  <span className="text-sm font-medium text-slate-700">Turnuva (otomatik periyodik)</span>
                  <Switch data-testid="game-tournament" checked={form.is_tournament} onCheckedChange={(c) => setForm({ ...form, is_tournament: c })} />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between"><Label>Sorular</Label><Button size="sm" variant="ghost" className="text-blue-600 h-7" data-testid="add-question-btn" onClick={() => setForm({ ...form, questions: [...form.questions, blankQuestion()] })}><Plus className="w-4 h-4 mr-1" /> Soru Ekle</Button></div>
                {form.questions.map((q, qi) => (
                  <div key={qi} data-testid={`question-${qi}`} className="rounded-2xl border border-slate-200 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Input data-testid={`question-text-${qi}`} value={q.text} onChange={(e) => setQ(qi, { text: e.target.value })} placeholder={`Soru ${qi + 1}`} />
                      {form.questions.length > 1 && <button data-testid={`question-del-${qi}`} onClick={() => setForm({ ...form, questions: form.questions.filter((_, idx) => idx !== qi) })} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                    <div className="space-y-2">
                      {q.options.map((o, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <button type="button" data-testid={`question-${qi}-correct-${oi}`} onClick={() => setQ(qi, { correct_index: oi })}
                            className={`w-6 h-6 rounded-full border grid place-items-center shrink-0 ${q.correct_index === oi ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 text-transparent"}`}><Check className="w-3.5 h-3.5" /></button>
                          <Input data-testid={`question-${qi}-option-${oi}`} value={o} onChange={(e) => setOpt(qi, oi, e.target.value)} placeholder={`Seçenek ${oi + 1}`} />
                          {q.options.length > 2 && <button onClick={() => setQ(qi, { options: q.options.filter((_, idx) => idx !== oi), correct_index: q.correct_index >= q.options.length - 1 ? 0 : q.correct_index })} className="p-1.5 text-slate-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>}
                        </div>
                      ))}
                      {q.options.length < 5 && <button data-testid={`question-${qi}-add-option`} onClick={() => setQ(qi, { options: [...q.options, ""] })} className="text-xs text-blue-600 hover:underline">+ Seçenek ekle</button>}
                    </div>
                    <p className="text-[11px] text-slate-400">Yeşil daire = doğru cevap</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>İptal</Button><Button data-testid="game-save-btn" className="bg-blue-500 hover:bg-blue-600" onClick={save}>Kaydet</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
