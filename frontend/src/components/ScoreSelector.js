import React from "react";
import { Angry, Frown, Meh, Smile, Laugh } from "lucide-react";

const FACES = [
  { score: 1, Icon: Angry, color: "text-rose-500", bg: "bg-rose-50 ring-rose-400", label: "Çok kötü" },
  { score: 2, Icon: Frown, color: "text-orange-500", bg: "bg-orange-50 ring-orange-400", label: "Kötü" },
  { score: 3, Icon: Meh, color: "text-amber-500", bg: "bg-amber-50 ring-amber-400", label: "Orta" },
  { score: 4, Icon: Smile, color: "text-lime-600", bg: "bg-lime-50 ring-lime-500", label: "İyi" },
  { score: 5, Icon: Laugh, color: "text-emerald-600", bg: "bg-emerald-50 ring-emerald-500", label: "Harika" },
];

export const ScoreSelector = ({ value, onChange, testPrefix = "score" }) => (
  <div className="flex flex-wrap gap-3">
    {FACES.map((f) => {
      const on = value === f.score;
      const I = f.Icon;
      return (
        <button
          key={f.score}
          type="button"
          data-testid={`${testPrefix}-${f.score}`}
          onClick={() => onChange(f.score)}
          className={[
            "flex flex-col items-center gap-1 rounded-2xl px-4 py-3 ring-2 transition-all",
            on ? `${f.bg} scale-105` : "bg-slate-50 ring-transparent hover:bg-slate-100",
          ].join(" ")}
        >
          <I className={`w-8 h-8 ${on ? f.color : "text-slate-400"}`} strokeWidth={1.75} />
          <span className={`text-[11px] font-medium ${on ? "text-slate-700" : "text-slate-400"}`}>{f.score}</span>
        </button>
      );
    })}
  </div>
);
