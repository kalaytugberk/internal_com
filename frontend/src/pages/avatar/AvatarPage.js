import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const AvatarPage = () => {
  const navigate = useNavigate();
  const { currentEmployeeId, currentEmployee, refreshEmployees } = useApp();
  const [concepts, setConcepts] = useState([]);
  const [active, setActive] = useState(null);
  const [picked, setPicked] = useState(null);

  useEffect(() => {
    if (currentEmployeeId) api.conceptsFeed(currentEmployeeId).then((c) => { setConcepts(c); if (c[0]) setActive(c[0].id); });
  }, [currentEmployeeId]);

  useEffect(() => { setPicked(currentEmployee?.avatar || null); }, [currentEmployee]);

  const concept = concepts.find((c) => c.id === active);

  const save = async () => {
    if (!picked) return toast.error("Bir avatar seç");
    await api.selectAvatar({ employee_id: currentEmployeeId, avatar: picked });
    await refreshEmployees();
    toast.success("Avatarın güncellendi");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <button data-testid="avatar-back" onClick={() => navigate("/ic-iletisim")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4"><ChevronLeft className="w-4 h-4" /> İç İletişim</button>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-slate-800">Avatar Seçimi</h1>
          <p className="text-sm text-slate-500 mt-1">Profil avatarını seç. İstediğin zaman değiştirebilirsin.</p>
        </div>
        <div className="flex items-center gap-3">
          {picked && <img src={picked} alt="" data-testid="avatar-current" className="w-12 h-12 rounded-full bg-slate-50 object-cover ring-2 ring-blue-200" />}
          <Button data-testid="avatar-save-btn" className="bg-blue-500 hover:bg-blue-600" onClick={save}>Kaydet</Button>
        </div>
      </div>

      {concepts.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white/70 py-16 text-center text-slate-400 text-sm">Sana açık konsept yok.</div>
      ) : (
        <>
          <div className="flex gap-2 mt-6 mb-6 flex-wrap">
            {concepts.map((c) => (
              <button key={c.id} data-testid={`concept-tab-${c.id}`} onClick={() => setActive(c.id)}
                className={["flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors", active === c.id ? "bg-blue-500 text-white" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"].join(" ")}>
                <Sparkles className="w-3.5 h-3.5" /> {c.name}
              </button>
            ))}
          </div>

          {concept && (
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-4">
              {concept.avatars.map((a) => {
                const sel = picked === a;
                return (
                  <button key={a} data-testid={`avatar-opt`} onClick={() => setPicked(a)}
                    className={["relative aspect-square rounded-2xl overflow-hidden bg-slate-50 ring-2 transition-all", sel ? "ring-blue-500 scale-105" : "ring-transparent hover:ring-slate-200"].join(" ")}>
                    <img src={a} alt="" className="w-full h-full object-cover" />
                    {sel && <span className="absolute top-1 right-1 bg-blue-500 text-white rounded-full p-1"><Check className="w-3 h-3" /></span>}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
