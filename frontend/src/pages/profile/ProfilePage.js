import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/api";
import { useApp } from "@/context/AppContext";
import { Icon } from "@/lib/icons";
import { ChevronLeft, Zap, Flame, Medal, Trophy, BadgeCheck, Bus, MapPin, Mail, Phone, Clock } from "lucide-react";

const COLORS = { sky: "bg-sky-50 text-sky-600", violet: "bg-violet-50 text-violet-600", emerald: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600", rose: "bg-rose-50 text-rose-600", orange: "bg-orange-50 text-orange-600" };

const fmtDate = (d) => { try { return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }); } catch (e) { return ""; } };

export const ProfilePage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentEmployeeId } = useApp();
  const targetId = id || currentEmployeeId;
  const [p, setP] = useState(null);

  useEffect(() => { setP(null); if (targetId) api.profile(targetId).then(setP); }, [targetId]);

  if (!targetId) return <div className="max-w-4xl mx-auto px-6 py-16 text-center text-slate-400">Profil görmek için üst menüden bir çalışan seçin.</div>;
  if (!p) return <div className="max-w-4xl mx-auto px-6 py-16 text-center text-slate-400" data-testid="profile-loading">Yükleniyor...</div>;

  const e = p.employee;
  const earned = p.badges.filter((b) => b.earned).length;
  const isOwn = !id || id === currentEmployeeId;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8" data-testid="profile-page">
      <button data-testid="profile-back" onClick={() => (isOwn ? navigate("/ic-iletisim") : navigate(-1))} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4"><ChevronLeft className="w-4 h-4" /> {isOwn ? "İç İletişim" : "Geri"}</button>

      <div className="rounded-2xl border border-slate-100 shadow-sm p-6 bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center gap-5 flex-wrap">
        {e.avatar ? <img src={e.avatar} alt="" className="w-20 h-20 rounded-2xl object-cover bg-white/20" /> : <div className="w-20 h-20 rounded-2xl bg-white/20 grid place-items-center text-2xl font-bold">{(e.name || "?").charAt(0)}</div>}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-heading font-bold" data-testid="profile-name">{e.name}</h1>
          <p className="text-white/80 text-sm">{e.title} · {e.department} · {e.location}</p>
          <p className="text-white/70 text-xs mt-0.5">{e.seniority} kıdem</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-white/80">
            {e.email && <span className="inline-flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {e.email}</span>}
            {e.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {e.phone}</span>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold flex items-center gap-1 justify-end"><Zap className="w-6 h-6" />{p.metrics.total_points}</p>
          <p className="text-white/70 text-xs">Seviye {p.level.level} · {p.level.name}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[[`#${p.rank}/${p.total_people}`, "Sıralama", Trophy], [p.metrics.streak, "Gün Seri", Flame], [earned, "Rozet", Medal], [p.metrics.kudos_received, "Kudos Aldı", Zap]].map(([v, l, I], i) => (
          <div key={i} className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 text-center">
            <I className="w-5 h-5 text-blue-500 mx-auto" />
            <p className="font-bold text-lg text-slate-800 mt-1">{v}</p>
            <p className="text-[11px] text-slate-400">{l}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>{p.next_level ? `Sonraki: ${p.next_level.name}` : "En yüksek seviye"}</span>
          <span>{p.next_level ? `${p.to_next} puan kaldı` : "🏆"}</span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${p.progress}%` }} /></div>
      </div>

      <div className="mt-6">
        <h3 className="font-heading font-semibold text-slate-700 mb-3 flex items-center gap-2"><Medal className="w-5 h-5 text-amber-500" /> Rozetler</h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {p.badges.map((b) => (
            <div key={b.code} data-testid={`profile-badge-${b.code}`} title={b.description}
              className={`rounded-2xl border p-4 text-center ${b.earned ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-100 opacity-60"}`}>
              <div className={`w-11 h-11 rounded-full mx-auto grid place-items-center ${b.earned ? "bg-amber-100 text-amber-600" : "bg-slate-200 text-slate-400"}`}><Icon name={b.icon} className="w-6 h-6" /></div>
              <p className={`text-xs font-semibold mt-2 ${b.earned ? "text-slate-800" : "text-slate-500"}`}>{b.name}</p>
              {!b.earned && <p className="text-[10px] text-slate-400 mt-0.5">{b.current}/{b.threshold}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
          <h3 className="font-heading font-semibold text-slate-700 mb-3 flex items-center gap-2"><BadgeCheck className="w-5 h-5 text-blue-500" /> Topluluk Uzmanlıkları</h3>
          {p.expert_in.length === 0 ? <p className="text-sm text-slate-400">Henüz uzman olduğun topluluk yok.</p> : (
            <div className="flex flex-wrap gap-2">
              {p.expert_in.map((c) => (
                <button key={c.id} data-testid={`profile-expert-${c.id}`} onClick={() => navigate(`/ic-iletisim/topluluk/${c.id}`)}
                  className={`inline-flex items-center gap-1.5 text-sm rounded-full px-3 py-1.5 ${COLORS[c.color] || COLORS.sky}`}>
                  <Icon name={c.icon} className="w-4 h-4" /> {c.name} <BadgeCheck className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
          <h3 className="font-heading font-semibold text-slate-700 mb-3 flex items-center gap-2"><Bus className="w-5 h-5 text-emerald-500" /> Servis Durağı</h3>
          {p.route ? (
            <div data-testid="profile-route">
              <p className="font-semibold text-slate-800">{p.route.route_name} <span className="text-xs font-normal text-slate-400">({p.route.direction === "donus" ? "Dönüş" : "Gidiş"})</span></p>
              <p className="text-sm text-slate-600 mt-1 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-emerald-500" /> {p.route.stop_name} {p.route.time && <span className="text-slate-400">· {p.route.time}</span>}</p>
            </div>
          ) : <p className="text-sm text-slate-400">Servis durağı seçilmemiş.{isOwn && <> <button onClick={() => navigate("/ic-iletisim/servis")} className="text-blue-600 hover:underline">Servis seç</button></>}</p>}
        </div>
      </div>

      {p.activity?.length > 0 && (
        <div className="mt-6">
          <h3 className="font-heading font-semibold text-slate-700 mb-3 flex items-center gap-2"><Clock className="w-5 h-5 text-slate-400" /> Son Aktiviteler</h3>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
            {p.activity.map((a, i) => (
              <div key={i} data-testid={`activity-${i}`} className="flex items-start gap-3 p-3.5">
                <div className="w-8 h-8 rounded-full bg-slate-50 text-slate-500 grid place-items-center shrink-0"><Icon name={a.icon} className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0"><p className="text-sm text-slate-700">{a.text}</p>{a.sub && <p className="text-xs text-slate-400 mt-0.5 truncate">{a.sub}</p>}</div>
                <span className="text-[11px] text-slate-400 shrink-0">{fmtDate(a.date)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
