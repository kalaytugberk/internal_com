import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { useApp } from "@/context/AppContext";
import { ChevronLeft, Bell, ShieldAlert, CheckCircle2 } from "lucide-react";

const fmt = (d) => d ? new Date(d).toLocaleString("tr-TR", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" }) : "";

export const NotificationsPage = ({ kind }) => {
  const navigate = useNavigate();
  const { currentEmployeeId } = useApp();
  const [items, setItems] = useState([]);
  const isg = kind === "isg_acil";

  const load = () => { if (currentEmployeeId) api.notificationsFeed(currentEmployeeId).then((all) => setItems(all.filter((n) => n.kind === kind))); };
  useEffect(() => { load(); }, [currentEmployeeId, kind]);

  const respond = async (id, key) => { await api.respondNotification(id, { employee_id: currentEmployeeId, option_key: key }); load(); };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <button data-testid="notif-page-back" onClick={() => navigate("/ic-iletisim")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4"><ChevronLeft className="w-4 h-4" /> İç İletişim</button>
      <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-800 flex items-center gap-2">
        {isg ? <ShieldAlert className="w-7 h-7 text-rose-500" /> : <Bell className="w-7 h-7 text-blue-500" />}
        {isg ? "İSG — Acil Durum" : "Anlık Bildirim"}
      </h1>
      <p className="text-sm text-slate-500 mt-1">Sana gelen bildirimler ve yanıt geçmişin.</p>

      <div className="mt-6 space-y-3">
        {items.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 py-16 text-center text-slate-400 text-sm">Bildirim yok.</div>}
        {items.map((n) => (
          <div key={n.id} data-testid={`notif-item-${n.id}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            {n.title && <h3 className="font-heading font-bold text-slate-800">{n.title}</h3>}
            <p className="text-slate-600 mt-0.5">{n.message}</p>
            <p className="text-[11px] text-slate-400 mt-1">{fmt(n.created_at)}</p>
            <div className="mt-3">
              {n.my_response ? (
                <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600"><CheckCircle2 className="w-4 h-4" /> Yanıtın: {n.options.find((o) => o.key === n.my_response)?.label}</span>
              ) : (
                <div className="flex gap-2">
                  {n.options.map((o) => (
                    <button key={o.key} data-testid={`notif-item-opt-${n.id}-${o.key}`} onClick={() => respond(n.id, o.key)}
                      className={`rounded-full text-sm font-semibold px-4 py-1.5 transition-colors ${isg ? "bg-rose-50 text-rose-600 hover:bg-rose-100" : "bg-blue-50 text-blue-600 hover:bg-blue-100"}`}>{o.label}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
