import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { useApp } from "@/context/AppContext";
import { ChevronLeft, ChevronRight, MapPin, CalendarClock } from "lucide-react";

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const CalendarPage = () => {
  const navigate = useNavigate();
  const { role, currentEmployeeId } = useApp();
  const [events, setEvents] = useState([]);
  const [cursor, setCursor] = useState(() => new Date(2026, 7, 1)); // Ağustos 2026
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const load = role === "admin" ? api.events() : (currentEmployeeId ? api.eventFeed(currentEmployeeId) : Promise.resolve([]));
    load.then(setEvents);
  }, [role, currentEmployeeId]);

  const byDay = useMemo(() => {
    const map = {};
    events.forEach((e) => {
      if (!e.event_date) return;
      const k = e.event_date.slice(0, 10);
      (map[k] = map[k] || []).push(e);
    });
    return map;
  }, [events]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const upcoming = useMemo(() =>
    [...events].filter((e) => e.event_date).sort((a, b) => a.event_date.localeCompare(b.event_date)).slice(0, 5),
  [events]);

  const selectedEvents = selected ? (byDay[selected] || []) : [];

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-slate-800">Takvim</h1>
      <p className="text-sm text-slate-500 mt-1">Yaklaşan etkinlikleri aylık takvim üzerinde görüntüleyin.</p>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-lg text-slate-800">{MONTHS[month]} {year}</h2>
            <div className="flex items-center gap-1">
              <button data-testid="cal-prev" onClick={() => setCursor(new Date(year, month - 1, 1))} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"><ChevronLeft className="w-4 h-4" /></button>
              <button data-testid="cal-next" onClick={() => setCursor(new Date(year, month + 1, 1))} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {DAYS.map((d) => <div key={d} className="text-center text-[11px] font-bold uppercase text-slate-400 py-1">{d}</div>)}
            {cells.map((date, i) => {
              if (!date) return <div key={i} />;
              const k = dayKey(date);
              const evs = byDay[k] || [];
              const isSel = selected === k;
              return (
                <button
                  key={i}
                  data-testid={`cal-day-${date.getDate()}`}
                  onClick={() => setSelected(isSel ? null : k)}
                  className={[
                    "aspect-square rounded-xl p-1.5 flex flex-col items-start text-left transition-colors border",
                    evs.length ? "bg-blue-50/60 border-blue-100 hover:bg-blue-100" : "border-transparent hover:bg-slate-50",
                    isSel ? "ring-2 ring-blue-400" : "",
                  ].join(" ")}
                >
                  <span className={`text-xs font-semibold ${evs.length ? "text-blue-700" : "text-slate-600"}`}>{date.getDate()}</span>
                  <div className="mt-1 space-y-0.5 w-full overflow-hidden">
                    {evs.slice(0, 2).map((e) => (
                      <span key={e.id} className="block truncate text-[10px] rounded px-1 py-0.5 bg-blue-500 text-white">{e.title}</span>
                    ))}
                    {evs.length > 2 && <span className="block text-[10px] text-blue-600">+{evs.length - 2} daha</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          {selected && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
              <p className="font-heading font-semibold text-slate-700 mb-2">{selected} etkinlikleri</p>
              {selectedEvents.length === 0 ? <p className="text-sm text-slate-400">Bu günde etkinlik yok.</p> :
                selectedEvents.map((e) => (
                  <button key={e.id} data-testid={`cal-sel-${e.id}`} onClick={() => navigate(`/ic-iletisim/etkinlik/${e.id}`)}
                    className="w-full text-left rounded-lg bg-white p-3 mb-2 hover:shadow-sm transition-shadow">
                    <p className="text-sm font-medium text-slate-700">{e.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" /> {e.location}</p>
                  </button>
                ))}
            </div>
          )}

          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
            <h3 className="font-heading font-bold text-slate-700 mb-3">Yaklaşan Etkinlikler</h3>
            {upcoming.length === 0 ? <p className="text-sm text-slate-400 py-4 text-center">Etkinlik yok.</p> :
              upcoming.map((e) => (
                <button key={e.id} data-testid={`cal-upcoming-${e.id}`} onClick={() => navigate(`/ic-iletisim/etkinlik/${e.id}`)}
                  className="w-full text-left flex items-start gap-3 rounded-lg hover:bg-slate-50 p-2 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 grid place-items-center shrink-0"><CalendarClock className="w-5 h-5 text-blue-500" /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{e.title}</p>
                    <p className="text-xs text-slate-400">{e.event_date ? new Date(e.event_date).toLocaleDateString("tr-TR") : ""}</p>
                  </div>
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
