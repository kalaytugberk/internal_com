import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { useApp } from "@/context/AppContext";
import { ChevronLeft, GaugeCircle, Lock, EyeOff, CheckCircle2, LineChart as LineIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const HistoryDialog = ({ pulse, employeeId, onClose }) => {
  const [data, setData] = useState(null);
  useEffect(() => { if (pulse) api.pulseMyHistory(pulse.id, employeeId).then(setData); }, [pulse, employeeId]);
  return (
    <Dialog open={!!pulse} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">Kişisel Geçmişim</DialogTitle>
          <DialogDescription>{pulse?.title} — yalnızca senin skorların.</DialogDescription>
        </DialogHeader>
        {!data ? <p className="text-slate-400 py-8 text-center">Yükleniyor...</p> :
          data.history.length === 0 ? <p className="text-slate-400 py-8 text-center">Henüz yanıtın yok.</p> : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.history} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#64748B" }} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 12, fill: "#64748B" }} />
                <Tooltip />
                <Line type="monotone" dataKey="avg" name="Ortalama skorum" stroke="#0D9488" strokeWidth={2.5} dot={{ r: 4, fill: "#0D9488" }} />
              </LineChart>
            </ResponsiveContainer>
          )}
      </DialogContent>
    </Dialog>
  );
};

export const PulseFeed = () => {
  const navigate = useNavigate();
  const { currentEmployeeId, pulseRefresh } = useApp();
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState(null);

  useEffect(() => { if (currentEmployeeId) api.pulseFeed(currentEmployeeId).then(setItems); }, [currentEmployeeId, pulseRefresh]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <button data-testid="pulse-feed-back" onClick={() => navigate("/ic-iletisim")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4">
        <ChevronLeft className="w-4 h-4" /> İç İletişim
      </button>
      <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-slate-800">Pulse Anketleri</h1>
      <p className="text-sm text-slate-500 mt-1">Kısa nabız anketleriyle görüşünü paylaş.</p>

      <div className="mt-8 space-y-4">
        {items.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 py-16 text-center text-slate-400 text-sm">Sana atanmış aktif pulse yok.</div>}
        {items.map((p) => (
          <div key={p.id} data-testid={`pulse-feed-${p.id}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 grid place-items-center shrink-0"><GaugeCircle className="w-6 h-6" /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-heading font-bold text-slate-800">{p.title}</h3>
                {p.filled
                  ? <span className="text-[11px] rounded-full px-2 py-0.5 bg-emerald-100 text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Dolduruldu</span>
                  : <span className="text-[11px] rounded-full px-2 py-0.5 bg-amber-100 text-amber-700">Doldurulmadı</span>}
                {p.mandatory && <span className="text-[11px] rounded-full px-2 py-0.5 bg-rose-50 text-rose-600">Zorunlu</span>}
                {p.anonymous && <span className="text-[11px] rounded-full px-2 py-0.5 bg-slate-100 text-slate-500 flex items-center gap-1"><EyeOff className="w-3 h-3" /> Anonim</span>}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{p.questions.length} soru · {p.frequency === "haftalik" ? "Haftalık" : "Aylık"}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" data-testid={`pulse-history-${p.id}`} onClick={() => setHistory(p)}><LineIcon className="w-4 h-4 mr-1" /> Geçmişim</Button>
              <Button size="sm" className="bg-blue-500 hover:bg-blue-600" data-testid={`pulse-fill-${p.id}`} onClick={() => navigate(`/ic-iletisim/pulse/${p.id}/fill`)}>
                {p.filled ? "Tekrar Doldur" : "Doldur"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <HistoryDialog pulse={history} employeeId={currentEmployeeId} onClose={() => setHistory(null)} />
    </div>
  );
};
