import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { useApp } from "@/context/AppContext";
import { Icon } from "@/lib/icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Trophy, Flame, Medal, Zap } from "lucide-react";
import { toast } from "sonner";

const Avatar = ({ url, name, size = "w-12 h-12" }) =>
  url ? <img src={url} alt="" className={`${size} rounded-full object-cover bg-slate-100`} />
    : <div className={`${size} rounded-full bg-blue-50 text-blue-600 grid place-items-center font-semibold`}>{(name || "?").charAt(0)}</div>;

const RANK_TONE = ["text-amber-500", "text-slate-400", "text-orange-400"];

const Leaderboard = ({ rows, highlightId }) => {
  const navigate = useNavigate();
  return (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
    {rows.map((r) => (
      <button key={r.employee_id} data-testid={`lb-row-${r.employee_id}`} onClick={() => navigate(`/profil/${r.employee_id}`)}
        className={`w-full text-left flex items-center gap-3 p-3.5 transition-colors hover:bg-slate-50 ${r.employee_id === highlightId ? "bg-blue-50/60" : ""}`}>
        <div className={`w-7 text-center font-bold ${r.rank <= 3 ? RANK_TONE[r.rank - 1] : "text-slate-400"}`}>{r.rank}</div>
        <Avatar url={r.avatar} name={r.name} size="w-9 h-9" />
        <div className="flex-1 min-w-0"><p className="font-semibold text-slate-800 text-sm truncate">{r.name}</p><p className="text-[11px] text-slate-400">Seviye {r.level} · {r.level_name}</p></div>
        {r.streak > 0 && <span className="inline-flex items-center gap-0.5 text-[11px] text-orange-500"><Flame className="w-3.5 h-3.5" />{r.streak}</span>}
        <span className="inline-flex items-center gap-1 text-sm font-bold text-blue-600"><Zap className="w-4 h-4" />{r.points}</span>
      </button>
    ))}
  </div>
  );
};

export const GamificationPage = () => {
  const navigate = useNavigate();
  const { currentEmployeeId } = useApp();
  const [profile, setProfile] = useState(null);
  const [board, setBoard] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.leaderboard().then(setBoard).catch((e) => setErr("board: " + String(e)));
    if (currentEmployeeId) api.gamiProfile(currentEmployeeId).then(setProfile).catch((e) => setErr("profile: " + String(e)));
  }, [currentEmployeeId]);

  if (!profile) return <div className="max-w-4xl mx-auto px-6 py-16 text-center text-slate-400" data-testid="gami-loading">{err ? `Hata: ${err}` : "Yükleniyor..."}</div>;
  const { level, next_level, progress, to_next, metrics, badges, rank, total_people } = profile;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <button data-testid="gami-back" onClick={() => navigate("/ic-iletisim")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4"><ChevronLeft className="w-4 h-4" /> İç İletişim</button>
      <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-800 flex items-center gap-2"><Trophy className="w-7 h-7 text-amber-500" /> Rozet & Oyunlaştırma</h1>

      <div data-testid="gami-profile-card" className="mt-6 rounded-2xl border border-slate-100 shadow-sm p-6 bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
        <div className="flex items-center gap-4">
          <Avatar url={profile.employee.avatar} name={profile.employee.name} size="w-16 h-16" />
          <div className="flex-1">
            <p className="font-heading font-bold text-xl">{profile.employee.name}</p>
            <p className="text-white/80 text-sm">Seviye {level.level} · {level.name}</p>
          </div>
          <div className="text-right"><p className="text-3xl font-bold flex items-center gap-1"><Zap className="w-6 h-6" />{metrics.total_points}</p><p className="text-white/70 text-xs">toplam puan</p></div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs text-white/80 mb-1">
            <span>{next_level ? `Sonraki: ${next_level.name}` : "En yüksek seviye"}</span>
            <span>{next_level ? `${to_next} puan kaldı` : "🏆"}</span>
          </div>
          <div className="h-2.5 rounded-full bg-white/25 overflow-hidden"><div data-testid="gami-progress" className="h-full bg-white rounded-full transition-all" style={{ width: `${progress}%` }} /></div>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-3 text-center">
          {[[metrics.total_points, "Puan"], [`#${rank}/${total_people}`, "Sıralama"], [metrics.streak, "Gün Seri"], [badges.filter((b) => b.earned).length, "Rozet"]].map(([v, l], i) => (
            <div key={i} className="rounded-xl bg-white/15 py-2.5"><p className="font-bold text-lg">{v}</p><p className="text-[11px] text-white/70">{l}</p></div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="font-heading font-semibold text-slate-700 mb-3 flex items-center gap-2"><Medal className="w-5 h-5 text-amber-500" /> Rozetlerim</h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {badges.map((b) => (
            <div key={b.code} data-testid={`badge-${b.code}`} title={b.description}
              className={`rounded-2xl border p-4 text-center transition-all ${b.earned ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-100 opacity-60"}`}>
              <div className={`w-11 h-11 rounded-full mx-auto grid place-items-center ${b.earned ? "bg-amber-100 text-amber-600" : "bg-slate-200 text-slate-400"}`}><Icon name={b.icon} className="w-6 h-6" /></div>
              <p className={`text-xs font-semibold mt-2 ${b.earned ? "text-slate-800" : "text-slate-500"}`}>{b.name}</p>
              {!b.earned && <p className="text-[10px] text-slate-400 mt-0.5">{b.current}/{b.threshold}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="font-heading font-semibold text-slate-700 mb-3">Liderlik Tablosu</h3>
        <Leaderboard rows={board} highlightId={currentEmployeeId} />
      </div>
    </div>
  );
};

const POINT_LABELS = { kudos_received: "Kudos Alma", kudos_given: "Kudos Verme", game_correct: "Doğru Cevap", game_perfect: "Tam Puan Bonusu" };

export const RozetManager = () => {
  const [cfg, setCfg] = useState(null);
  const [board, setBoard] = useState([]);
  const [pts, setPts] = useState({});

  useEffect(() => {
    api.gamiConfig().then((c) => { setCfg(c); setPts(c.points || {}); });
    api.leaderboard().then(setBoard);
  }, []);

  const savePoints = async () => {
    const clean = Object.fromEntries(Object.entries(pts).map(([k, v]) => [k, Number(v) || 0]));
    const r = await api.updateGamiConfig({ points: clean });
    setCfg(r); setPts(r.points); toast.success("Puan kuralları kaydedildi");
  };

  if (!cfg) return null;
  return (
    <div>
      <div className="mb-5"><h2 className="font-heading font-bold text-xl text-slate-800">Rozet / Oyunlaştırma</h2><p className="text-sm text-slate-500">Puan ekonomisi, seviyeler ve liderlik tablosu.</p></div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="font-heading font-semibold text-slate-700 mb-3">Puan Kuralları</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.keys(POINT_LABELS).map((k) => (
            <div key={k}>
              <label className="text-xs text-slate-500 block mb-1">{POINT_LABELS[k]}</label>
              <Input type="number" data-testid={`point-${k}`} value={pts[k] ?? 0} onChange={(e) => setPts({ ...pts, [k]: e.target.value })} />
            </div>
          ))}
        </div>
        <Button data-testid="save-points-btn" className="mt-4 bg-blue-500 hover:bg-blue-600" onClick={savePoints}>Kaydet</Button>
      </div>

      <div className="mt-5">
        <h3 className="font-heading font-semibold text-slate-700 mb-3">Liderlik Tablosu (Önizleme)</h3>
        <Leaderboard rows={board} />
      </div>
    </div>
  );
};
