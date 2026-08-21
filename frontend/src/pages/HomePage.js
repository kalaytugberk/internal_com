import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { useApp } from "@/context/AppContext";
import { ClipboardCheck, GaugeCircle, CalendarClock, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KudosCelebration } from "@/components/KudosNotifications";

export const HomePage = () => {
  const navigate = useNavigate();
  const { role, currentEmployee, currentEmployeeId, pulseRefresh } = useApp();
  const [pulses, setPulses] = useState([]);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (role === "employee" && currentEmployeeId) {
      api.pulseFeed(currentEmployeeId).then(setPulses);
      api.eventFeed(currentEmployeeId).then(setEvents);
    }
  }, [role, currentEmployeeId, pulseRefresh]);

  const actionPulses = pulses.filter((p) => p.mandatory && !p.filled);
  const upcomingEvents = events.filter((e) => !e.my_rsvp).slice(0, 3);

  if (role === "admin") {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-slate-800">Ana Sayfa</h1>
        <p className="text-sm text-slate-500 mt-1">Admin/İK olarak oturum açtınız.</p>
        <div className="mt-8 rounded-2xl bg-blue-50 border border-blue-100 p-8 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-blue-500 text-white grid place-items-center"><ShieldCheck className="w-7 h-7" /></div>
          <div className="flex-1">
            <h2 className="font-heading font-bold text-lg text-slate-800">İç İletişim Yönetimi</h2>
            <p className="text-sm text-slate-500">Kategorileri, duyuruları, pulse anketlerini ve etkinlikleri yönetin.</p>
          </div>
          <Button data-testid="home-admin-cta" className="bg-blue-500 hover:bg-blue-600" onClick={() => navigate("/admin")}>Admin Paneli</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-slate-800">
        Merhaba{currentEmployee ? `, ${currentEmployee.name.split(" ")[0]}` : ""} 👋
      </h1>
      <p className="text-sm text-slate-500 mt-1">Bugün seni bekleyen aksiyonlar ve etkinlikler.</p>

      <div className="mt-8">
        <KudosCelebration />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Actions widget */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardCheck className="w-5 h-5 text-blue-500" />
            <h2 className="font-heading font-bold text-slate-700">Almam Gereken Aksiyonlar</h2>
          </div>
          <div data-testid="actions-widget" className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 space-y-3">
            {actionPulses.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Bekleyen zorunlu aksiyonun yok. Harika!</p>
              </div>
            ) : (
              actionPulses.map((p) => (
                <div key={p.id} data-testid={`action-pulse-${p.id}`} className="flex items-center gap-4 rounded-xl bg-amber-50/60 border border-amber-100 p-4">
                  <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-600 grid place-items-center shrink-0"><GaugeCircle className="w-6 h-6" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800 truncate">{p.title}</h3>
                      <span className="text-[11px] rounded-full px-2 py-0.5 bg-rose-100 text-rose-600 shrink-0">Zorunlu</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">Pulse Anketi · {p.questions.length} soru · doldurulmayı bekliyor</p>
                  </div>
                  <Button size="sm" className="bg-blue-500 hover:bg-blue-600 shrink-0" data-testid={`action-fill-${p.id}`}
                    onClick={() => navigate(`/ic-iletisim/pulse/${p.id}/fill`)}>Doldur</Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming events mini */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-blue-500" />
              <h2 className="font-heading font-bold text-slate-700">Yaklaşan Etkinlikler</h2>
            </div>
            <button className="text-xs text-blue-600" onClick={() => navigate("/ic-iletisim/etkinlik")}>Tümü</button>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 space-y-3">
            {upcomingEvents.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Yanıt bekleyen etkinlik yok.</p>
            ) : (
              upcomingEvents.map((e) => (
                <button key={e.id} data-testid={`home-event-${e.id}`} onClick={() => navigate(`/ic-iletisim/etkinlik/${e.id}`)}
                  className="w-full text-left flex items-center gap-3 rounded-xl hover:bg-slate-50 p-2 transition-colors">
                  {e.image ? <img src={e.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" /> : <div className="w-12 h-12 rounded-lg bg-blue-50 grid place-items-center shrink-0"><CalendarClock className="w-5 h-5 text-blue-500" /></div>}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{e.title}</p>
                    <p className="text-xs text-slate-400 truncate">{e.event_date ? new Date(e.event_date).toLocaleDateString("tr-TR") : ""}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 ml-auto shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
