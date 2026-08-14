import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/api";
import { useApp } from "@/context/AppContext";
import { ChevronLeft, Bus, Search, MapPin, Clock, User, Phone, Users, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const DIRECTION = { gidis: "Gidiş", donus: "Dönüş" };
const mapEmbed = (q) => `https://maps.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
const mapLink = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

export const RoutesFeed = () => {
  const navigate = useNavigate();
  const { currentEmployeeId } = useApp();
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [cities, setCities] = useState([]);
  const [city, setCity] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => { api.routeCities().then(setCities); }, []);
  useEffect(() => { if (currentEmployeeId) api.routesFeed(currentEmployeeId, city || undefined).then((d) => { setItems(d); setLoaded(true); }); }, [currentEmployeeId, city]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((r) => r.name.toLowerCase().includes(s) || (r.stops || []).some((st) => st.name.toLowerCase().includes(s)));
  }, [items, q]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <button data-testid="routes-back" onClick={() => navigate("/ic-iletisim")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4">
        <ChevronLeft className="w-4 h-4" /> İç İletişim
      </button>
      <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-slate-800">Servis Güzergahı</h1>
      <p className="text-sm text-slate-500 mt-1">Servis hatlarını, durakları ve saatleri gör; kullandığın durağı işaretle.</p>

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-white rounded-full border border-slate-200 px-4 py-2.5 flex-1">
          <Search className="w-4 h-4 text-slate-400" />
          <input data-testid="routes-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Güzergah veya durak ara..."
            className="bg-transparent outline-none text-sm text-slate-600 w-full" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button data-testid="route-city-all" onClick={() => setCity("")}
            className={["text-xs rounded-full px-3 py-1.5 border transition-colors", city === "" ? "bg-blue-500 text-white border-blue-500" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"].join(" ")}>
            Tümü
          </button>
          {cities.map((c) => (
            <button key={c} data-testid={`route-city-${c}`} onClick={() => setCity(c)}
              className={["text-xs rounded-full px-3 py-1.5 border transition-colors", city === c ? "bg-blue-500 text-white border-blue-500" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"].join(" ")}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
        {!loaded && <div className="sm:col-span-2 py-16 text-center text-slate-400 text-sm">Yükleniyor...</div>}
        {loaded && filtered.length === 0 && <div className="sm:col-span-2 rounded-2xl border border-dashed border-slate-300 bg-white/70 py-16 text-center text-slate-400 text-sm">Uygun güzergah bulunamadı.</div>}
        {loaded && filtered.map((r) => (
          <button key={r.id} data-testid={`route-card-${r.id}`} onClick={() => navigate(`/ic-iletisim/servis/${r.id}`)}
            className="text-left group bg-white rounded-2xl border border-slate-100 shadow-sm p-5 transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 grid place-items-center"><Bus className="w-6 h-6" /></div>
                <div>
                  <h3 className="font-heading font-bold text-slate-800 text-lg leading-snug">{r.name}</h3>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {r.city} · {DIRECTION[r.direction]}</span>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="mt-4 flex items-center gap-3 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {r.stops?.length || 0} durak</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> İlk: {r.stops?.[0]?.time || "—"}</span>
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {r.reg_count || 0} kullanıcı</span>
            </div>
            {r.my_registration && (
              <span className="mt-3 inline-flex items-center gap-1 text-[11px] rounded-full px-2.5 py-1 bg-emerald-100 text-emerald-700">
                <Check className="w-3 h-3" /> Kullanıyorsun: {r.my_registration.stop_name}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export const RouteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentEmployeeId } = useApp();
  const [r, setR] = useState(null);

  const load = () => api.route(id, currentEmployeeId).then(setR);
  useEffect(() => { if (currentEmployeeId) load(); }, [id, currentEmployeeId]);

  const register = async (stopId) => {
    const res = await api.registerRoute(id, { employee_id: currentEmployeeId, stop_id: stopId });
    setR((p) => ({ ...p, my_registration: res.my_registration, reg_count: res.reg_count }));
    toast.success("Bu servisi kullanıyorsun olarak işaretlendi");
  };

  const unregister = async () => {
    const res = await api.unregisterRoute(id, { employee_id: currentEmployeeId });
    setR((p) => ({ ...p, my_registration: null, reg_count: res.reg_count }));
    toast.success("Kaydın kaldırıldı");
  };

  if (!r) return <div className="py-16 text-center text-slate-400">Yükleniyor...</div>;

  const mapQuery = r.stops?.[0]?.location || r.stops?.[0]?.name || r.city;
  const myStop = r.my_registration?.stop_id;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8" data-testid="route-detail">
      <button data-testid="route-detail-back" onClick={() => navigate("/ic-iletisim/servis")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4">
        <ChevronLeft className="w-4 h-4" /> Güzergahlar
      </button>

      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 grid place-items-center"><Bus className="w-7 h-7" /></div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-800 leading-tight">{r.name}</h1>
          <p className="text-sm text-slate-500 flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {r.city} · {DIRECTION[r.direction]} · {r.reg_count || 0} kullanıcı</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-100 bg-white p-3">
          <p className="text-[11px] text-slate-400">Araç / Plaka</p>
          <p className="text-sm font-medium text-slate-700 mt-0.5">{r.vehicle_plate || "—"}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-3">
          <p className="text-[11px] text-slate-400 flex items-center gap-1"><User className="w-3 h-3" /> Şoför</p>
          <p className="text-sm font-medium text-slate-700 mt-0.5">{r.driver_name || "—"}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-3">
          <p className="text-[11px] text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" /> Telefon</p>
          <p className="text-sm font-medium text-slate-700 mt-0.5">{r.driver_phone || "—"}</p>
        </div>
      </div>

      {mapQuery && (
        <div className="mt-6 rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
          <iframe title="Servis haritası" data-testid="route-map" src={mapEmbed(mapQuery)} className="w-full h-56 border-0" loading="lazy" />
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-slate-700">Duraklar & Saatler</h3>
          {r.my_registration && (
            <button data-testid="route-unregister" onClick={unregister} className="text-xs text-rose-500 hover:text-rose-600 font-medium">Kaydımı kaldır</button>
          )}
        </div>
        <div className="relative pl-2">
          {(r.stops || []).map((s, i) => {
            const active = myStop === s.id;
            return (
              <div key={s.id} data-testid={`route-stop-${s.id}`} className="flex items-start gap-3 pb-5 last:pb-0">
                <div className="flex flex-col items-center">
                  <div className={["w-3.5 h-3.5 rounded-full mt-1.5 shrink-0", active ? "bg-emerald-500 ring-4 ring-emerald-100" : "bg-blue-500"].join(" ")} />
                  {i < r.stops.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 my-1" style={{ minHeight: 28 }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-700">{s.name}</span>
                    <span className="text-xs rounded-full px-2 py-0.5 bg-blue-50 text-blue-600 flex items-center gap-1"><Clock className="w-3 h-3" /> {s.time || "—"}</span>
                    {active && <span className="text-[11px] rounded-full px-2 py-0.5 bg-emerald-100 text-emerald-700">Senin durağın</span>}
                  </div>
                  <div className="mt-1 flex items-center gap-3">
                    {s.location && (
                      <a data-testid={`route-stop-map-${s.id}`} href={mapLink(s.location)} target="_blank" rel="noreferrer" className="text-[11px] text-slate-400 hover:text-blue-500 inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Haritada aç
                      </a>
                    )}
                    <button data-testid={`route-stop-select-${s.id}`} onClick={() => register(s.id)}
                      className={["text-[11px] rounded-full px-3 py-1 font-medium transition-colors", active ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600"].join(" ")}>
                      {active ? "Seçili" : "Bu durağı kullanıyorum"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {(!r.stops || r.stops.length === 0) && <p className="text-sm text-slate-400">Bu güzergaha durak eklenmemiş.</p>}
        </div>
      </div>
    </div>
  );
};
