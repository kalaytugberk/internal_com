import React from "react";
import { Icon } from "@/lib/icons";

export const Placeholder = ({ title, subtitle, icon = "Building2", accent = "bg-blue-50 text-blue-500" }) => {
  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-slate-800">{title}</h1>
      <p className="text-sm text-slate-500 mt-1">{subtitle}</p>

      <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white/70 py-20 grid place-items-center text-center">
        <div className={`w-16 h-16 rounded-2xl grid place-items-center mb-4 ${accent}`}>
          <Icon name={icon} className="w-8 h-8" />
        </div>
        <p className="text-slate-500 text-sm max-w-sm">
          Bu bölüm bu aşamada yer tutucu olarak eklenmiştir. Odak modülümüz <span className="font-semibold text-blue-600">İç İletişim</span>.
        </p>
      </div>
    </div>
  );
};
