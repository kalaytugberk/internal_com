import React, { useEffect, useState } from "react";
import { api } from "@/api";
import { ChevronLeft, EyeOff, Users, Building2, User, Download, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell,
} from "recharts";

const TABS = [
  { key: "sirket", label: "Şirket", icon: Building2 },
  { key: "org", label: "Organizasyon Birimi", icon: Users },
  { key: "kisi", label: "Kişi Bazlı", icon: User },
  { key: "compare", label: "Karşılaştırma", icon: GitCompare },
];
const BAR_COLORS = ["#3B82F6", "#0D9488", "#DB2777", "#CA8A04", "#9333EA"];

export const PulseReport = ({ pulseId, onBack }) => {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("sirket");

  useEffect(() => { api.pulseReport(pulseId).then(setData); }, [pulseId]);

  if (!data) return <div className="py-16 text-center text-slate-400">Rapor yükleniyor...</div>;

  const visibleTabs = TABS.filter((t) => !(t.key === "kisi" && data.anonymous));

  const exportCsv = () => {
    const rows = [];
    rows.push(["Pulse", data.pulse.title]);
    rows.push(["Anonim", data.anonymous ? "Evet" : "Hayır"]);
    rows.push(["Yanıt Oranı", `%${data.response_rate}`]);
    rows.push(["Yanıtlayan", `${data.response_count}/${data.target_count}`]);
    rows.push(["Şirket Ortalaması", data.company.avg]);
    rows.push([]);
    rows.push(["DEPARTMAN KIRILIMI", "Ortalama", "Yanıt Sayısı"]);
    data.org_units.forEach((o) => rows.push([o.department, o.avg, o.count]));
    rows.push([]);
    data.questions.forEach((q, i) => {
      rows.push([`SORU ${i + 1}`, q.text]);
      if (q.type === "skor") {
        rows.push(["Ortalama Skor", q.overall_avg]);
        q.trend.forEach((t) => rows.push([t.date, t.avg]));
      } else {
        q.distribution.forEach((d) => rows.push([d.option, `%${d.percent}`, d.count]));
      }
      rows.push([]);
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pulse-rapor-${data.pulse.title.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Rapor CSV olarak indirildi");
  };

  return (
    <div data-testid="pulse-report">
      <button data-testid="report-back" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-3">
        <ChevronLeft className="w-4 h-4" /> Pulse Listesi
      </button>
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="font-heading font-bold text-2xl text-slate-800">{data.pulse.title}</h2>
          {data.anonymous && <span className="text-xs rounded-full px-2.5 py-1 bg-slate-100 text-slate-500 flex items-center gap-1"><EyeOff className="w-3.5 h-3.5" /> Anonim</span>}
        </div>
        <Button variant="outline" size="sm" data-testid="report-export" onClick={exportCsv}><Download className="w-4 h-4 mr-1.5" /> Dışa Aktar (CSV)</Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
        <Stat label="Yanıt Oranı" value={`%${data.response_rate}`} />
        <Stat label="Yanıtlayan" value={`${data.response_count}/${data.target_count}`} />
        <Stat label="Şirket Ortalaması" value={data.company.avg || "—"} />
        <Stat label="Soru Sayısı" value={data.pulse.questions.length} />
      </div>

      {/* View tabs */}
      <div className="flex gap-2 mt-8 mb-6 border-b border-slate-200">
        {visibleTabs.map((t) => {
          const I = t.icon; const on = tab === t.key;
          return (
            <button key={t.key} data-testid={`report-tab-${t.key}`} onClick={() => setTab(t.key)}
              className={["flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors", on ? "text-blue-600 border-blue-600" : "text-slate-500 border-transparent hover:text-slate-800"].join(" ")}>
              <I className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "sirket" && (
        <div className="space-y-6">
          <Card title="Şirket Geneli Ortalama Skor Trendi">
            <TrendChart data={data.company.trend} />
          </Card>
          {data.questions.map((q) => (
            <QuestionBlock key={q.id} q={q} />
          ))}
        </div>
      )}

      {tab === "org" && (
        <Card title="Departman Ortalamaları (karşılaştırmalı)">
          {data.org_units.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.org_units} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
                <XAxis dataKey="department" tick={{ fontSize: 12, fill: "#64748B" }} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 12, fill: "#64748B" }} />
                <Tooltip />
                <Bar dataKey="avg" radius={[8, 8, 0, 0]} name="Ortalama">
                  {data.org_units.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      )}

      {tab === "kisi" && !data.anonymous && (
        <Card title="Kişi Bazlı Yanıtlar">
          {data.persons.length === 0 ? <Empty /> : (
            <div className="overflow-x-auto pln-scroll">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="py-2 pr-4">Çalışan</th><th className="py-2 pr-4">Departman</th><th className="py-2 pr-4">Tarih</th>
                  {data.pulse.questions.map((q, i) => <th key={q.id} className="py-2 pr-4">S{i + 1}</th>)}
                </tr></thead>
                <tbody>
                  {data.persons.map((p, idx) => (
                    <tr key={idx} data-testid={`person-row-${idx}`} className="border-b border-slate-50">
                      <td className="py-2 pr-4 font-medium text-slate-700">{p.name}</td>
                      <td className="py-2 pr-4 text-slate-500">{p.department}</td>
                      <td className="py-2 pr-4 text-slate-500">{p.date}</td>
                      {data.pulse.questions.map((q) => {
                        const a = p.answers.find((x) => x.question_id === q.id);
                        return <td key={q.id} className="py-2 pr-4 text-slate-600">{a ? (a.score ?? a.choice ?? "—") : "—"}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "compare" && <CompareView pulseId={data.pulse.id} trend={data.company.trend} />}
    </div>
  );
};

const Stat = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
    <p className="text-xs text-slate-400">{label}</p>
    <p className="text-2xl font-heading font-bold text-slate-800 mt-1">{value}</p>
  </div>
);

const Card = ({ title, children }) => (
  <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
    <h3 className="font-heading font-semibold text-slate-700 mb-4">{title}</h3>
    {children}
  </div>
);

const Empty = () => <p className="text-sm text-slate-400 py-8 text-center">Yeterli veri yok.</p>;

const TrendChart = ({ data }) => {
  if (!data || data.length === 0) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#64748B" }} />
        <YAxis domain={[0, 5]} tick={{ fontSize: 12, fill: "#64748B" }} />
        <Tooltip />
        <Line type="monotone" dataKey="avg" name="Ortalama" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4, fill: "#3B82F6" }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
};

const QuestionBlock = ({ q }) => (
  <Card title={q.text}>
    {q.type === "skor" ? (
      <div>
        <p className="text-sm text-slate-500 mb-3">Ortalama skor: <span className="font-bold text-slate-800">{q.overall_avg || "—"}</span> / 5</p>
        <TrendChart data={q.trend} />
      </div>
    ) : (
      q.distribution.length === 0 ? <Empty /> : (
        <div className="space-y-3">
          {q.distribution.map((d, i) => (
            <div key={d.option} data-testid={`dist-${d.option}`}>
              <div className="flex justify-between text-sm mb-1"><span className="text-slate-600">{d.option}</span><span className="text-slate-400">%{d.percent} ({d.count})</span></div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${d.percent}%`, background: BAR_COLORS[i % BAR_COLORS.length] }} />
              </div>
            </div>
          ))}
        </div>
      )
    )}
    {q.comments && q.comments.length > 0 && (
      <div className="mt-5 pt-4 border-t border-slate-100">
        <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Yorumlar</p>
        <div className="space-y-2">
          {q.comments.map((c, i) => (
            <div key={i} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span className="font-medium text-slate-700">{c.name}:</span> <span className="text-slate-600">{c.text}</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </Card>
);


const CompareView = ({ pulseId, trend }) => {
  const dates = (trend || []).map((t) => t.date);
  const first = dates[0] || "2026-07-01";
  const last = dates[dates.length - 1] || "2026-08-31";
  const mid = dates[Math.floor(dates.length / 2)] || first;

  const [aStart, setAStart] = useState(first);
  const [aEnd, setAEnd] = useState(mid);
  const [bStart, setBStart] = useState(mid);
  const [bEnd, setBEnd] = useState(last);
  const [res, setRes] = useState(null);

  const run = () => {
    api.pulseCompare(pulseId, { a_start: aStart, a_end: aEnd, b_start: bStart, b_end: bEnd })
      .then(setRes)
      .catch(() => toast.error("Karşılaştırma yapılamadı"));
  };

  useEffect(() => { run(); /* initial */ }, []); // eslint-disable-line

  return (
    <div className="space-y-6">
      <Card title="İki Dönemi Karşılaştır">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
            <p className="font-semibold text-blue-700 mb-3">Dönem A</p>
            <div className="flex gap-3">
              <div className="flex-1"><Label className="text-xs">Başlangıç</Label><Input type="date" data-testid="cmp-a-start" value={aStart} onChange={(e) => setAStart(e.target.value)} /></div>
              <div className="flex-1"><Label className="text-xs">Bitiş</Label><Input type="date" data-testid="cmp-a-end" value={aEnd} onChange={(e) => setAEnd(e.target.value)} /></div>
            </div>
          </div>
          <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-4">
            <p className="font-semibold text-teal-700 mb-3">Dönem B</p>
            <div className="flex gap-3">
              <div className="flex-1"><Label className="text-xs">Başlangıç</Label><Input type="date" data-testid="cmp-b-start" value={bStart} onChange={(e) => setBStart(e.target.value)} /></div>
              <div className="flex-1"><Label className="text-xs">Bitiş</Label><Input type="date" data-testid="cmp-b-end" value={bEnd} onChange={(e) => setBEnd(e.target.value)} /></div>
            </div>
          </div>
        </div>
        <div className="mt-4"><Button data-testid="cmp-run" className="bg-blue-500 hover:bg-blue-600" onClick={run}>Karşılaştır</Button></div>
      </Card>

      {res && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
              <p className="text-xs text-blue-600">Dönem A Ortalama</p>
              <p className="text-2xl font-heading font-bold text-slate-800 mt-1" data-testid="cmp-a-avg">{res.a.avg || "—"}</p>
              <p className="text-[11px] text-slate-400 mt-1">{res.a.count} yanıt</p>
            </div>
            <div className="rounded-2xl border border-teal-100 bg-teal-50/40 p-4">
              <p className="text-xs text-teal-600">Dönem B Ortalama</p>
              <p className="text-2xl font-heading font-bold text-slate-800 mt-1" data-testid="cmp-b-avg">{res.b.avg || "—"}</p>
              <p className="text-[11px] text-slate-400 mt-1">{res.b.count} yanıt</p>
            </div>
            <div className={["rounded-2xl border p-4", res.diff >= 0 ? "border-emerald-100 bg-emerald-50/40" : "border-rose-100 bg-rose-50/40"].join(" ")}>
              <p className="text-xs text-slate-500">Fark (B - A)</p>
              <p className={["text-2xl font-heading font-bold mt-1", res.diff >= 0 ? "text-emerald-600" : "text-rose-600"].join(" ")} data-testid="cmp-diff">{res.diff > 0 ? "+" : ""}{res.diff}</p>
              <p className="text-[11px] text-slate-400 mt-1">{res.diff >= 0 ? "Yükseliş" : "Düşüş"}</p>
            </div>
          </div>
          <Card title="Genel Trend (referans)">
            <TrendChart data={res.trend} />
          </Card>
        </>
      )}
    </div>
  );
};
