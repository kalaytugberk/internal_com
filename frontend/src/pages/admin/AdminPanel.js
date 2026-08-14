import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CategoriesManager } from "@/pages/admin/CategoriesManager";
import { AnnouncementsManager } from "@/pages/admin/AnnouncementsManager";
import { Layers, Megaphone, ChevronLeft } from "lucide-react";

const TABS = [
  { key: "categories", label: "Kategori Yönetimi", icon: Layers },
  { key: "announcements", label: "Duyuru Yönetimi", icon: Megaphone },
];

export const AdminPanel = () => {
  const [tab, setTab] = useState("categories");
  const navigate = useNavigate();

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
      <button data-testid="admin-back" onClick={() => navigate("/ic-iletisim")}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-3">
        <ChevronLeft className="w-4 h-4" /> İç İletişim
      </button>
      <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-slate-800">Admin Paneli · İç İletişim</h1>
      <p className="text-sm text-slate-500 mt-1">Kategori motorunu ve duyuruları buradan yönetin.</p>

      <div className="flex gap-2 mt-6 mb-8 border-b border-slate-200">
        {TABS.map((t) => {
          const I = t.icon;
          const on = tab === t.key;
          return (
            <button key={t.key} data-testid={`admin-tab-${t.key}`} onClick={() => setTab(t.key)}
              className={["flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                on ? "text-blue-600 border-blue-600" : "text-slate-500 border-transparent hover:text-slate-800"].join(" ")}>
              <I className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "categories" ? <CategoriesManager /> : <AnnouncementsManager />}
    </div>
  );
};
