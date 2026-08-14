import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { useApp } from "@/context/AppContext";
import { Smile, ArrowRight } from "lucide-react";

// Simulated in-app reminder: shows if reminder enabled, employee hasn't entered today,
// and current time is at/after the configured reminder time.
export const MoodReminderBanner = () => {
  const { role, currentEmployeeId, moodRefresh } = useApp();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (role !== "employee" || !currentEmployeeId) { setShow(false); return; }
    Promise.all([api.moodConfig().catch(() => null), api.moodToday(currentEmployeeId)]).then(([cfg, today]) => {
      if (!cfg || cfg.status !== "active" || !cfg.reminder_enabled || today.entry) { setShow(false); return; }
      const [h, m] = (cfg.reminder_time || "17:00").split(":").map(Number);
      const now = new Date();
      const past = now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
      setShow(past);
    });
  }, [role, currentEmployeeId, moodRefresh]);

  if (!show) return null;
  return (
    <div data-testid="mood-reminder-banner" className="bg-teal-50 border-b border-teal-200">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-3 flex-wrap">
        <Smile className="w-4 h-4 text-teal-600 shrink-0" />
        <p className="text-sm text-teal-800 flex-1 min-w-0"><span className="font-semibold">Günlük Mod:</span> Bugün kendini nasıl hissettiğini henüz paylaşmadın.</p>
        <button data-testid="mood-reminder-cta" onClick={() => navigate("/ic-iletisim/gunluk-mod")}
          className="inline-flex items-center gap-1 rounded-full bg-teal-500 text-white text-xs font-semibold px-3 py-1.5 hover:bg-teal-600 transition-colors">
          Şimdi Paylaş <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
