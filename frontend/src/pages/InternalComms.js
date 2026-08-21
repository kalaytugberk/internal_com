import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { useApp } from "@/context/AppContext";
import { Icon } from "@/lib/icons";
import { ArrowRight, Pin, Lock } from "lucide-react";

const FUTURE = [
  { label: "Kudos / Takdir", icon: "Award" },
  { label: "Oyunlaştırma", icon: "Trophy" },
  { label: "İç İlanlar", icon: "Briefcase" },
];

export const InternalComms = () => {
  const navigate = useNavigate();
  const { currentEmployeeId } = useApp();
  const [categories, setCategories] = useState([]);
  const [feed, setFeed] = useState([]);
  const [pulses, setPulses] = useState([]);
  const [events, setEvents] = useState([]);
  const [moodToday, setMoodToday] = useState(undefined);

  useEffect(() => {
    api.categories().then((c) => setCategories(c.filter((x) => x.status === "active")));
  }, []);

  useEffect(() => {
    if (currentEmployeeId) {
      api.feed(currentEmployeeId).then(setFeed);
      api.pulseFeed(currentEmployeeId).then(setPulses);
      api.eventFeed(currentEmployeeId).then(setEvents);
      api.moodToday(currentEmployeeId).then((r) => setMoodToday(r.entry));
    }
  }, [currentEmployeeId]);

  const annPreview = useMemo(() => feed.slice(0, 3), [feed]);
  const pulsePreview = useMemo(() => pulses.slice(0, 3), [pulses]);
  const eventPreview = useMemo(() => events.slice(0, 3), [events]);

  const nav = (cat) => {
    if (cat.category_type === "duyuru") navigate("/ic-iletisim/duyurular");
    else if (cat.category_type === "pulse") navigate("/ic-iletisim/pulse");
    else if (cat.category_type === "etkinlik") navigate("/ic-iletisim/etkinlik");
    else if (cat.category_type === "gunluk_mod") navigate("/ic-iletisim/gunluk-mod");
    else if (cat.category_type === "ilan") navigate("/ic-iletisim/ilanlar");
    else if (cat.category_type === "avatar") navigate("/ic-iletisim/avatar");
    else if (cat.category_type === "servis") navigate("/ic-iletisim/servis");
    else if (cat.category_type === "anlik_bildirim") navigate("/ic-iletisim/anlik");
    else if (cat.category_type === "isg_acil") navigate("/ic-iletisim/isg-acil");
    else if (cat.category_type === "hap_bilgi") navigate("/ic-iletisim/hap-bilgi");
    else if (cat.category_type === "indirim") navigate("/ic-iletisim/indirim");
    else if (cat.category_type === "yemekhane") navigate("/ic-iletisim/yemekhane");
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-slate-800">İç İletişim</h1>
        <p className="text-sm text-slate-500 mt-1">Şirket içi tüm iletişim ve etkileşimleriniz tek bir çatı altında.</p>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {categories.map((cat) => {
          const isDuyuru = cat.category_type === "duyuru";
          const isPulse = cat.category_type === "pulse";
          const isEtkinlik = cat.category_type === "etkinlik";
          const isMood = cat.category_type === "gunluk_mod";
          const isServis = cat.category_type === "servis";
          const expanded = isDuyuru || isPulse || isEtkinlik;
          return (
            <button
              key={cat.id}
              data-testid={`comms-card-${cat.id}`}
              onClick={() => nav(cat)}
              className={[
                "text-left group bg-white rounded-2xl border border-slate-100 shadow-sm p-6 transition-all hover:shadow-md hover:-translate-y-0.5",
                expanded ? "md:col-span-2" : "",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 grid place-items-center">
                    {cat.icon_image ? <img src={cat.icon_image} alt="" className="w-6 h-6 object-contain" /> : <Icon name={cat.icon} className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-slate-800 text-lg">{cat.display_name}</h3>
                    {cat.pinnable && <span className="inline-flex items-center gap-1 text-[11px] text-slate-400"><Pin className="w-3 h-3" /> Pinlenebilir</span>}
                    {isPulse && <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">Nabız anketleri</span>}
                    {isServis && <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">Servis güzergahları & saatleri</span>}
                    {isMood && (
                      moodToday
                        ? <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">Bugün paylaştın ✓</span>
                        : <span className="inline-flex items-center gap-1 text-[11px] text-amber-600">Bugün nasılsın?</span>
                    )}
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
              </div>

              {isDuyuru && (
                <div className="mt-5 space-y-2.5">
                  {annPreview.length === 0 && <p className="text-sm text-slate-400 italic">Henüz görüntülenecek duyuru yok.</p>}
                  {annPreview.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
                      {a.pinned && <Pin className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                      <span className="text-sm text-slate-600 truncate flex-1">{a.title}</span>
                      <span className="text-[11px] text-slate-400 shrink-0">{a._subcategory?.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {isPulse && (
                <div className="mt-5 space-y-2.5">
                  {pulsePreview.length === 0 && <p className="text-sm text-slate-400 italic">Sana atanmış pulse yok.</p>}
                  {pulsePreview.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
                      <span className="text-sm text-slate-600 truncate flex-1">{p.title}</span>
                      {p.filled
                        ? <span className="text-[11px] rounded-full px-2 py-0.5 bg-emerald-100 text-emerald-700 shrink-0">Dolduruldu</span>
                        : <span className="text-[11px] rounded-full px-2 py-0.5 bg-amber-100 text-amber-700 shrink-0">Doldurulmadı</span>}
                    </div>
                  ))}
                </div>
              )}

              {isEtkinlik && (
                <div className="mt-5 space-y-2.5">
                  {eventPreview.length === 0 && <p className="text-sm text-slate-400 italic">Yaklaşan etkinlik yok.</p>}
                  {eventPreview.map((e) => (
                    <div key={e.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
                      <span className="text-sm text-slate-600 truncate flex-1">{e.title}</span>
                      {e.my_rsvp
                        ? <span className="text-[11px] rounded-full px-2 py-0.5 bg-emerald-100 text-emerald-700 shrink-0">Yanıtlandı</span>
                        : <span className="text-[11px] rounded-full px-2 py-0.5 bg-amber-100 text-amber-700 shrink-0">Yanıt bekliyor</span>}
                    </div>
                  ))}
                </div>
              )}
            </button>
          );
        })}

        {FUTURE.map((f) => (
          <div key={f.label} data-testid={`comms-future-${f.label}`} className="rounded-2xl border border-dashed border-slate-200 bg-white/50 p-6 flex flex-col justify-between opacity-70">
            <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-400 grid place-items-center"><Icon name={f.icon} className="w-6 h-6" /></div>
            <div className="mt-6 flex items-center justify-between">
              <h3 className="font-heading font-semibold text-slate-500">{f.label}</h3>
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-100 rounded-full px-2 py-0.5"><Lock className="w-3 h-3" /> Yakında</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
