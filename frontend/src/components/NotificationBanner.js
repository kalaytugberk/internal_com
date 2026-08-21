import React, { useEffect, useState } from "react";
import { api } from "@/api";
import { useApp } from "@/context/AppContext";
import { AlertTriangle, Bell } from "lucide-react";
import { toast } from "sonner";

export const NotificationBanner = () => {
  const { currentEmployeeId, role } = useApp();
  const [items, setItems] = useState([]);

  const load = () => { if (currentEmployeeId) api.notificationsFeed(currentEmployeeId).then(setItems); };
  useEffect(() => { load(); }, [currentEmployeeId]);

  if (role !== "employee") return null;
  const pending = items
    .filter((n) => !n.my_response)
    .sort((a, b) => (a.kind === "isg_acil" ? -1 : 1) - (b.kind === "isg_acil" ? -1 : 1));
  const n = pending[0];
  if (!n) return null;

  const isg = n.kind === "isg_acil";
  const respond = async (key) => {
    await api.respondNotification(n.id, { employee_id: currentEmployeeId, option_key: key });
    toast.success("Yanıtın kaydedildi");
    load();
  };

  return (
    <div data-testid="notif-banner" className={`sticky top-16 z-30 w-full ${isg ? "bg-rose-600" : "bg-blue-600"} text-white shadow-lg`}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          {isg ? <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" /> : <Bell className="w-5 h-5 shrink-0 mt-0.5" />}
          <div className="min-w-0">
            {n.title && <p className="font-heading font-bold leading-tight">{n.title}</p>}
            <p className="text-sm text-white/90">{n.message}</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {n.options.map((o) => (
            <button key={o.key} data-testid={`notif-banner-opt-${o.key}`} onClick={() => respond(o.key)}
              className="rounded-full bg-white/95 hover:bg-white text-slate-800 text-sm font-semibold px-4 py-1.5 transition-colors">{o.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
};
