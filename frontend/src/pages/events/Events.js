import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/api";
import { useApp } from "@/context/AppContext";
import { ChevronLeft, MapPin, CalendarClock, Users, Check, X, HelpCircle, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const fmt = (d) => d ? new Date(d).toLocaleString("tr-TR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

export const EventsFeed = () => {
  const navigate = useNavigate();
  const { currentEmployeeId } = useApp();
  const [items, setItems] = useState([]);

  useEffect(() => { if (currentEmployeeId) api.eventFeed(currentEmployeeId).then(setItems); }, [currentEmployeeId]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <button data-testid="events-back" onClick={() => navigate("/ic-iletisim")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4">
        <ChevronLeft className="w-4 h-4" /> İç İletişim
      </button>
      <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-slate-800">Etkinlikler</h1>
      <p className="text-sm text-slate-500 mt-1">Şirket etkinliklerine katılım durumunu bildir.</p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
        {items.length === 0 && <div className="sm:col-span-2 rounded-2xl border border-dashed border-slate-300 bg-white/70 py-16 text-center text-slate-400 text-sm">Sana açık etkinlik yok.</div>}
        {items.map((e) => (
          <button key={e.id} data-testid={`event-card-${e.id}`} onClick={() => navigate(`/ic-iletisim/etkinlik/${e.id}`)}
            className="text-left bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5">
            {e.image && <img src={e.image} alt="" className="w-full h-40 object-cover" />}
            <div className="p-5">
              <h3 className="font-heading font-bold text-slate-800 text-lg leading-snug">{e.title}</h3>
              <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5" /> {fmt(e.event_date)}</p>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {e.location}</p>
              <div className="mt-3 flex items-center gap-2">
                {e.my_rsvp
                  ? <span className="text-[11px] rounded-full px-2.5 py-1 bg-emerald-100 text-emerald-700">Yanıtın: {rsvpLabel(e.my_rsvp)}</span>
                  : <span className="text-[11px] rounded-full px-2.5 py-1 bg-amber-100 text-amber-700">Yanıt bekleniyor</span>}
                <span className="text-[11px] text-slate-400 flex items-center gap-1"><Users className="w-3 h-3" /> {e.rsvp_counts?.katiliyorum || 0} katılıyor</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const rsvpLabel = (v) => ({ katiliyorum: "Katılıyorum", katilmiyorum: "Katılmıyorum", belki: "Belki" }[v] || v);

export const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentEmployeeId } = useApp();
  const [ev, setEv] = useState(null);

  const load = () => api.event(id, currentEmployeeId).then(setEv);
  useEffect(() => { if (currentEmployeeId) load(); }, [id, currentEmployeeId]);

  const rsvp = async (response) => {
    const res = await api.rsvpEvent(id, { employee_id: currentEmployeeId, response });
    setEv((e) => ({ ...e, my_rsvp: res.my_rsvp, rsvp_counts: res.rsvp_counts }));
    toast.success("Yanıtın kaydedildi");
  };

  if (!ev) return <div className="py-16 text-center text-slate-400">Yükleniyor...</div>;

  const OPTIONS = [
    { key: "katiliyorum", label: "Katılıyorum", Icon: Check, on: "bg-blue-500 text-white", off: "bg-blue-50 text-blue-600 hover:bg-blue-100" },
    { key: "belki", label: "Belki", Icon: HelpCircle, on: "bg-amber-500 text-white", off: "bg-amber-50 text-amber-600 hover:bg-amber-100", hidden: !ev.allow_maybe },
    { key: "katilmiyorum", label: "Katılmıyorum", Icon: X, on: "bg-rose-500 text-white", off: "bg-rose-50 text-rose-600 hover:bg-rose-100" },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8" data-testid="event-detail">
      <button data-testid="event-back" onClick={() => navigate("/ic-iletisim/etkinlik")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4">
        <ChevronLeft className="w-4 h-4" /> Etkinlikler
      </button>
      {ev.image && <img src={ev.image} alt="" className="w-full rounded-2xl object-cover max-h-80" />}
      <h1 className="text-3xl font-heading font-bold text-slate-800 leading-tight mt-6">{ev.title}</h1>
      <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-500">
        <span className="flex items-center gap-1.5"><CalendarClock className="w-4 h-4" /> {fmt(ev.event_date)}</span>
        <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {ev.location}</span>
      </div>
      <p className="mt-5 text-slate-600 leading-relaxed whitespace-pre-wrap">{ev.description}</p>

      <div className="mt-8 rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
        <p className="font-heading font-semibold text-slate-700 mb-3">Katılım Durumun</p>
        <div className="flex flex-wrap gap-3">
          {OPTIONS.filter((o) => !o.hidden).map((o) => {
            const active = ev.my_rsvp === o.key;
            const I = o.Icon;
            return (
              <button key={o.key} data-testid={`rsvp-${o.key}`} onClick={() => rsvp(o.key)}
                className={["flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all", active ? o.on : o.off].join(" ")}>
                <I className="w-4 h-4" /> {o.label}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex gap-4 text-xs text-slate-400">
          <span>{ev.rsvp_counts?.katiliyorum || 0} katılıyor</span>
          <span>{ev.rsvp_counts?.belki || 0} belki</span>
          <span>{ev.rsvp_counts?.katilmiyorum || 0} katılmıyor</span>
        </div>
      </div>
    </div>
  );
};
