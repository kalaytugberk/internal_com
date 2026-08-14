import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/api";
import { useApp } from "@/context/AppContext";
import { ScoreSelector } from "@/components/ScoreSelector";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ChevronLeft, CheckCircle2, EyeOff, Lock } from "lucide-react";
import { toast } from "sonner";

export const PulseFill = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentEmployeeId, bumpPulse } = useApp();
  const [pulse, setPulse] = useState(null);
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState(false);

  useEffect(() => { api.pulse(id).then(setPulse); }, [id]);

  if (!pulse) return <div className="py-16 text-center text-slate-400">Yükleniyor...</div>;

  const setAns = (qid, patch) => setAnswers((a) => ({ ...a, [qid]: { ...a[qid], ...patch } }));

  const submit = async () => {
    for (const q of pulse.questions) {
      const a = answers[q.id] || {};
      if (q.type === "skor" && !a.score) return toast.error("Tüm skor sorularını yanıtlayın");
      if (q.type === "tek_secim" && !a.choice) return toast.error("Tüm seçim sorularını yanıtlayın");
    }
    const payload = {
      employee_id: currentEmployeeId,
      answers: pulse.questions.map((q) => ({
        question_id: q.id,
        score: answers[q.id]?.score ?? null,
        choice: answers[q.id]?.choice ?? null,
        comment: answers[q.id]?.comment || null,
      })),
    };
    await api.respondPulse(id, payload);
    bumpPulse();
    setDone(true);
  };

  if (done) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center" data-testid="pulse-thanks">
        <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-500 grid place-items-center mx-auto mb-6"><CheckCircle2 className="w-10 h-10" /></div>
        <h1 className="text-2xl font-heading font-bold text-slate-800">Teşekkürler!</h1>
        <p className="text-slate-500 mt-2">Yanıtın kaydedildi. Katılımın çalışan deneyimini iyileştirmemize yardımcı oluyor.</p>
        <div className="flex gap-3 justify-center mt-8">
          <Button variant="outline" onClick={() => navigate("/ic-iletisim/pulse")}>Pulse Listesi</Button>
          <Button className="bg-blue-500 hover:bg-blue-600" onClick={() => navigate("/ic-iletisim")}>İç İletişim</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8" data-testid="pulse-fill">
      <button data-testid="fill-back" onClick={() => navigate("/ic-iletisim/pulse")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4">
        <ChevronLeft className="w-4 h-4" /> Pulse Anketleri
      </button>
      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-slate-800">{pulse.title}</h1>
        {pulse.anonymous && <span className="text-xs rounded-full px-2.5 py-1 bg-slate-100 text-slate-500 flex items-center gap-1"><EyeOff className="w-3.5 h-3.5" /> Anonim</span>}
        {pulse.mandatory && <span className="text-xs rounded-full px-2.5 py-1 bg-rose-50 text-rose-600 flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> Zorunlu</span>}
      </div>
      <p className="text-sm text-slate-500 mt-1">{pulse.questions.length} kısa soru · yaklaşık 1 dakika</p>

      <div className="mt-8 space-y-5">
        {pulse.questions.map((q, i) => (
          <div key={q.id} data-testid={`fill-q-${i}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <p className="font-heading font-semibold text-slate-800 mb-4"><span className="text-blue-500 mr-2">{i + 1}.</span>{q.text}</p>
            {q.type === "skor" ? (
              <ScoreSelector value={answers[q.id]?.score} onChange={(s) => setAns(q.id, { score: s })} testPrefix={`fill-score-${i}`} />
            ) : (
              <RadioGroup value={answers[q.id]?.choice || ""} onValueChange={(v) => setAns(q.id, { choice: v })} className="space-y-2">
                {q.options.map((o, oi) => (
                  <label key={oi} className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer rounded-lg border border-slate-200 px-4 py-2.5 hover:bg-slate-50">
                    <RadioGroupItem value={o} data-testid={`fill-choice-${i}-${oi}`} /> {o}
                  </label>
                ))}
              </RadioGroup>
            )}
            {q.allow_comment && (
              <Textarea data-testid={`fill-comment-${i}`} className="mt-4" rows={2} placeholder="İsteğe bağlı yorum..."
                value={answers[q.id]?.comment || ""} onChange={(e) => setAns(q.id, { comment: e.target.value })} />
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <Button data-testid="pulse-submit" className="bg-blue-500 hover:bg-blue-600 px-8" onClick={submit}>Gönder</Button>
      </div>
    </div>
  );
};
