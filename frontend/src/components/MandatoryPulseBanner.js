import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { useApp } from "@/context/AppContext";
import { AlertTriangle, ArrowRight } from "lucide-react";

// Simulated block for mandatory unfilled pulses (visual warning only).
export const MandatoryPulseBanner = () => {
  const { role, currentEmployeeId, pulseRefresh } = useApp();
  const navigate = useNavigate();
  const [pending, setPending] = useState(null);

  useEffect(() => {
    if (role !== "employee" || !currentEmployeeId) { setPending(null); return; }
    api.pulseFeed(currentEmployeeId).then((list) => {
      setPending(list.find((p) => p.mandatory && !p.filled) || null);
    });
  }, [role, currentEmployeeId, pulseRefresh]);

  if (!pending) return null;

  return (
    <div data-testid="mandatory-pulse-banner" className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-3 flex-wrap">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-800 flex-1 min-w-0">
          <span className="font-semibold">Zorunlu pulse:</span> "{pending.title}" anketini doldurmadan devam edemezsiniz.
        </p>
        <button data-testid="mandatory-pulse-cta" onClick={() => navigate(`/ic-iletisim/pulse/${pending.id}/fill`)}
          className="inline-flex items-center gap-1 rounded-full bg-amber-500 text-white text-xs font-semibold px-3 py-1.5 hover:bg-amber-600 transition-colors">
          Şimdi Doldur <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
