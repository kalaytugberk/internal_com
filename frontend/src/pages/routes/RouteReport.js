import React, { useEffect, useState } from "react";
import { api } from "@/api";
import { ChevronLeft, Bus, Users, MapPin } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

const DIRECTION = { gidis: "Gidiş", donus: "Dönüş" };
const COLORS = ["#3B82F6", "#6366F1", "#0EA5E9", "#14B8A6", "#F59E0B", "#EC4899"];

export const RouteReport = ({ onBack }) => {
  const [data, setData] = useState(null);
  useEffect(() => { api.routesReport().then(setData); }, []);

  if (!data) return <div className="py-16 text-center text-slate-400">Rapor yükleniyor...</div>;

  const chart = data.routes.map((r) => ({ name: r.name, value: r.reg_count }));

  return (
    <div data-testid="route-report">
      <button data-testid="route-report-back" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-3">
        <ChevronLeft className="w-4 h-4" /> Güzergah Listesi
      </button>
      <h2 className="font-heading font-bold text-2xl text-slate-800">Servis Kullanım Raporu</h2>
      <p className="text-sm text-slate-500 mt-1">Güzergah bazında kayıt sayıları ve durak dağılımları.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
        <Stat label="Toplam Kayıt" value={data.total_registrations} color="text-blue-600" />
        <Stat label="Güzergah Sayısı" value={data.routes.length} />
        <Stat label="Çalışan Sayısı" value={data.total_employees} />
      </div>

      <Card title="Güzergah Bazında Kayıt" className="mt-6">
        {chart.length === 0 ? <p className="text-sm text-slate-400 py-8 text-center">Veri yok.</p> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chart} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748B" }} />
              <Tooltip />
              <Bar dataKey="value" name="Kayıt" radius={[8, 8, 0, 0]}>
                {chart.map((c, i) => <Cell key={c.name} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="mt-6 space-y-4">
        {data.routes.map((r) => (
          <Card key={r.id} title={`${r.name} · ${r.city || "—"} · ${DIRECTION[r.direction]}`} data-testid={`route-report-${r.id}`}>
            <p className="text-xs text-slate-400 -mt-2 mb-3 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {r.reg_count} kayıtlı kullanıcı</p>
            {r.stops.length === 0 ? <p className="text-sm text-slate-400">Durak yok.</p> : (
              <div className="space-y-2">
                {r.stops.map((s) => {
                  const pct = r.reg_count ? Math.round((s.count / r.reg_count) * 100) : 0;
                  return (
                    <div key={s.stop_id} data-testid={`route-report-stop-${s.stop_id}`} className="flex items-center gap-3">
                      <div className="w-40 shrink-0 flex items-center gap-1.5 text-sm text-slate-600 truncate"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {s.name}</div>
                      <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 w-16 text-right">{s.count} kişi</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

const Stat = ({ label, value, color = "text-slate-800" }) => (
  <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
    <p className="text-xs text-slate-400">{label}</p>
    <p className={`text-2xl font-heading font-bold mt-1 ${color}`}>{value}</p>
  </div>
);

const Card = ({ title, children, className = "", ...props }) => (
  <div className={`rounded-2xl border border-slate-100 bg-white shadow-sm p-5 ${className}`} {...props}>
    <h3 className="font-heading font-semibold text-slate-700 mb-4">{title}</h3>
    {children}
  </div>
);
