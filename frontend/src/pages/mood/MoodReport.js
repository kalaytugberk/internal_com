import React, { useEffect, useState } from "react";
import { api } from "@/api";
import { ChevronLeft, Lock, Smile } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const MoodReport = ({ onBack }) => {
  const [dept, setDept] = useState("all");
  const [data, setData] = useState(null);

  useEffect(() => { api.moodReport(dept === "all" ? undefined : dept).then(setData); }, [dept]);

  return (
    <div data-testid="mood-report">
      {onBack && (
        <button data-testid="mood-report-back" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-3">
          <ChevronLeft className="w-4 h-4" /> Ayarlar
        </button>
      )}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-heading font-bold text-2xl text-slate-800">Çalışan Hisleri — Raporlama</h2>
        <Select value={dept} onValueChange={setDept}>
          <SelectTrigger className="w-56" data-testid="mood-dept-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Departmanlar</SelectItem>
            {(data?.departments || []).map((d) => <SelectItem key={d} value={d} data-testid={`mood-dept-${d}`}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-3 rounded-xl bg-slate-100/70 border border-slate-200 p-3 flex items-center gap-2">
        <Lock className="w-4 h-4 text-slate-400 shrink-0" />
        <p className="text-xs text-slate-500">Gizlilik: Tüm veriler yalnızca <span className="font-semibold">ortalama</span> olarak gösterilir. Hiçbir seviyede bireysel giriş görüntülenemez.</p>
      </div>

      {!data ? <div className="py-16 text-center text-slate-400">Yükleniyor...</div> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-6">
              <p className="text-sm text-slate-400">Günün Mutluluk Ortalaması</p>
              <div className="flex items-end gap-2 mt-2">
                <span className="text-4xl font-heading font-bold text-slate-800" data-testid="mood-today-avg">{data.today_avg || "—"}</span>
                <span className="text-slate-400 mb-1">/ 5</span>
                {data.today_avg >= 4 && <Smile className="w-7 h-7 text-emerald-500 mb-1" />}
              </div>
              <p className="text-xs text-slate-400 mt-1">{data.today_count} giriş (bugün)</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-6">
              <p className="text-sm text-slate-400">Son 7 Günün Ortalaması</p>
              <div className="flex items-end gap-2 mt-2">
                <span className="text-4xl font-heading font-bold text-slate-800" data-testid="mood-avg7">{data.avg7 || "—"}</span>
                <span className="text-slate-400 mb-1">/ 5</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Toplam {data.total_entries} giriş</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
            <h3 className="font-heading font-semibold text-slate-700 mb-4">Günlük Ortalama Skor Trendi</h3>
            {data.trend.length === 0 ? <p className="text-sm text-slate-400 py-8 text-center">Yeterli veri yok.</p> : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.trend} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#64748B" }} />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 12, fill: "#64748B" }} />
                  <Tooltip formatter={(v) => [`${v} / 5`, "Ortalama"]} />
                  <Line type="monotone" dataKey="avg" name="Ortalama" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4, fill: "#3B82F6" }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </div>
  );
};
