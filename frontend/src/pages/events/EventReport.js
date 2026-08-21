import React, { useEffect, useState } from "react";
import { api } from "@/api";
import { ChevronLeft, Users, MapPin, CalendarClock } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, Legend,
} from "recharts";

const COLORS = { katiliyorum: "#3B82F6", belki: "#CA8A04", katilmiyorum: "#F43F5E" };
const LABELS = { katiliyorum: "Katılıyorum", belki: "Belki", katilmiyorum: "Katılmıyorum" };

const fmt = (d) => d ? new Date(d).toLocaleString("tr-TR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export const EventReport = ({ eventId, onBack }) => {
  const [data, setData] = useState(null);
  useEffect(() => { api.eventReport(eventId).then(setData); }, [eventId]);

  if (!data) return <div className="py-16 text-center text-slate-400">Rapor yükleniyor...</div>;

  const pie = ["katiliyorum", "belki", "katilmiyorum"].map((k) => ({ key: k, label: LABELS[k], value: data.counts[k] || 0 }));

  return (
    <div data-testid="event-report">
      <button data-testid="event-report-back" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-3">
        <ChevronLeft className="w-4 h-4" /> Etkinlik Listesi
      </button>
      <h2 className="font-heading font-bold text-2xl text-slate-800">{data.event.title}</h2>
      <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
        <span className="flex items-center gap-1.5"><CalendarClock className="w-4 h-4" /> {fmt(data.event.event_date)}</span>
        <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {data.event.location || "—"}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
        <Stat label="Katılım Oranı" value={`%${data.response_rate}`} />
        <Stat label="Yanıtlayan" value={`${data.total_responded}/${data.target_count}`} />
        <Stat label="Katılıyor" value={data.counts.katiliyorum || 0} color="text-blue-600" />
        <Stat label="Fiili Katılım (QR)" value={data.checkin_count || 0} color="text-emerald-600" />
        <Stat label="Servis Kullanan" value={data.service_count || 0} color="text-indigo-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card title="Genel Katılım Dağılımı">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={pie} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748B" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748B" }} />
              <Tooltip />
              <Bar dataKey="value" name="Kişi" radius={[8, 8, 0, 0]}>
                {pie.map((p) => <Cell key={p.key} fill={COLORS[p.key]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Departman Kırılımı">
          {data.departments.length === 0 ? <p className="text-sm text-slate-400 py-8 text-center">Henüz yanıt yok.</p> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.departments} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
                <XAxis dataKey="department" tick={{ fontSize: 11, fill: "#64748B" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748B" }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="katiliyorum" name="Katılıyor" stackId="a" fill={COLORS.katiliyorum} radius={[0, 0, 0, 0]} />
                <Bar dataKey="belki" name="Belki" stackId="a" fill={COLORS.belki} />
                <Bar dataKey="katilmiyorum" name="Katılmıyor" stackId="a" fill={COLORS.katilmiyorum} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {data.departments.length > 0 && (
        <Card title="Departman Detay Tablosu" className="mt-6">
          <div className="overflow-x-auto pln-scroll">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="py-2 pr-4">Departman</th><th className="py-2 pr-4">Katılıyor</th><th className="py-2 pr-4">Belki</th><th className="py-2 pr-4">Katılmıyor</th><th className="py-2 pr-4">Toplam</th>
              </tr></thead>
              <tbody>
                {data.departments.map((d) => (
                  <tr key={d.department} data-testid={`event-dept-${d.department}`} className="border-b border-slate-50">
                    <td className="py-2 pr-4 font-medium text-slate-700">{d.department}</td>
                    <td className="py-2 pr-4 text-blue-600">{d.katiliyorum}</td>
                    <td className="py-2 pr-4 text-amber-600">{d.belki}</td>
                    <td className="py-2 pr-4 text-rose-600">{d.katilmiyorum}</td>
                    <td className="py-2 pr-4 font-semibold text-slate-700">{d.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

const Stat = ({ label, value, color = "text-slate-800" }) => (
  <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
    <p className="text-xs text-slate-400">{label}</p>
    <p className={`text-2xl font-heading font-bold mt-1 ${color}`}>{value}</p>
  </div>
);

const Card = ({ title, children, className = "" }) => (
  <div className={`rounded-2xl border border-slate-100 bg-white shadow-sm p-5 ${className}`}>
    <h3 className="font-heading font-semibold text-slate-700 mb-4">{title}</h3>
    {children}
  </div>
);
