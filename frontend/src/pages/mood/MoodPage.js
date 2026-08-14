import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { useApp } from "@/context/AppContext";
import { ScoreSelector } from "@/components/ScoreSelector";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, CheckCircle2, Angry, Frown, Meh, Smile, Laugh } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { toast } from "sonner";

const FACE = { 1: Angry, 2: Frown, 3: Meh, 4: Smile, 5: Laugh };
const FACE_COLOR = { 1: "text-rose-500", 2: "text-orange-500", 3: "text-amber-500", 4: "text-lime-600", 5: "text-emerald-600" };

export const MoodPage = () => {
  const navigate = useNavigate();
  const { currentEmployeeId, bumpMood } = useApp();
  const [cfg, setCfg] = useState(null);
  const [today, setToday] = useState(undefined);
  const [score, setScore] = useState(null);
  const [comment, setComment] = useState("");
  const [history, setHistory] = useState(null);

  const reload = () => {
    if (!currentEmployeeId) return;
    api.moodToday(currentEmployeeId).then((r) => setToday(r.entry));
    api.moodMyHistory(currentEmployeeId).then(setHistory);
  };
  useEffect(() => { api.moodConfig().then(setCfg); }, []);
  useEffect(() => { reload(); }, [currentEmployeeId]);

  const submit = async () => {
    if (!score) return toast.error("Lütfen bir emoji seç");
    const res = await api.submitMood({ employee_id: currentEmployeeId, score, comment: comment || null });
    if (res.already) toast.info("Bugün zaten giriş yaptın");
    else toast.success("Kaydedildi, teşekkürler!");
    if (bumpMood) bumpMood();
    reload();
  };

  const TodayFace = today ? FACE[today.score] : null;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <button data-testid="mood-back" onClick={() => navigate("/ic-iletisim")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4">
        <ChevronLeft className="w-4 h-4" /> İç İletişim
      </button>
      <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-slate-800">{cfg?.display_name || "Günlük Mod"}</h1>
      <p className="text-sm text-slate-500 mt-1">Bugün kendini nasıl hissediyorsun?</p>

      <div className="mt-6 rounded-2xl border border-slate-100 bg-white shadow-sm p-6">
        {today === undefined ? (
          <p className="text-slate-400 text-sm py-6 text-center">Yükleniyor...</p>
        ) : today ? (
          <div data-testid="mood-done" className="flex items-center gap-4 py-2">
            <div className={`w-16 h-16 rounded-2xl bg-slate-50 grid place-items-center ${FACE_COLOR[today.score]}`}>
              {TodayFace && <TodayFace className="w-9 h-9" strokeWidth={1.75} />}
            </div>
            <div>
              <p className="font-heading font-bold text-slate-800 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Bugün girdin</p>
              <p className="text-sm text-slate-500 mt-0.5">Yarın tekrar görüşürüz. Günde yalnızca bir giriş yapılabilir.</p>
              {today.comment && <p className="text-sm text-slate-600 mt-2 italic">"{today.comment}"</p>}
            </div>
          </div>
        ) : (
          <div data-testid="mood-form">
            <ScoreSelector value={score} onChange={setScore} testPrefix="mood-score" />
            {cfg?.allow_comment && (
              <Textarea data-testid="mood-comment" className="mt-4" rows={2} placeholder="Bu modu seçme sebebin? (opsiyonel)" value={comment} onChange={(e) => setComment(e.target.value)} />
            )}
            <div className="mt-4 flex justify-end">
              <Button data-testid="mood-submit" className="bg-blue-500 hover:bg-blue-600 px-8" onClick={submit}>Gönder</Button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-slate-700">Son 7 Günlük Trendin</h3>
          {history && <span className="text-sm text-slate-500">Ortalama: <span className="font-bold text-slate-800">{history.avg7 || "—"}</span> / 5</span>}
        </div>
        {!history || history.trend.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">Henüz yeterli veri yok. Birkaç gün giriş yaptıkça trendin burada görünecek.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={history.trend} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#64748B" }} />
              <YAxis domain={[0, 5]} tick={{ fontSize: 12, fill: "#64748B" }} />
              <Tooltip formatter={(v) => [`${v} / 5`, "Skorum"]} />
              <Line type="monotone" dataKey="score" name="Skorum" stroke="#0D9488" strokeWidth={2.5} dot={{ r: 4, fill: "#0D9488" }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
