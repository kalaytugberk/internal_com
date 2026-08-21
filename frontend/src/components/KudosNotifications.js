import React, { useEffect, useState } from "react";
import { api } from "@/api";
import { useApp } from "@/context/AppContext";
import { Icon } from "@/lib/icons";
import { Bell, PartyPopper, X } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

export const KudosBell = () => {
  const { currentEmployeeId, role } = useApp();
  const [items, setItems] = useState([]);

  const load = () => { if (currentEmployeeId) api.inbox(currentEmployeeId).then((r) => setItems(r.items || [])); };
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [currentEmployeeId, role]);

  const markSeen = async () => { if (currentEmployeeId) { await api.inboxSeen(currentEmployeeId); setItems([]); } };

  return (
    <DropdownMenu onOpenChange={(o) => { if (o) load(); }}>
      <DropdownMenuTrigger asChild>
        <button data-testid="notifications-btn" aria-label="Bildirimler" className="relative p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
          <Bell className="w-5 h-5" />
          {items.length > 0 && <span data-testid="notif-count" className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold grid place-items-center">{items.length}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Bildirimler</span>
          {items.length > 0 && <button data-testid="notif-mark-seen" onClick={markSeen} className="text-[11px] text-blue-600 hover:underline">Tümünü okundu işaretle</button>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-400">Yeni bildirim yok</div>
        ) : (
          <div className="max-h-80 overflow-y-auto pln-scroll">
            {items.map((it) => (
              <div key={it.id} data-testid={`notif-item-${it.id}`} className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-slate-50">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 grid place-items-center shrink-0"><Icon name={it.icon} className="w-4 h-4" /></div>
                <div className="text-sm text-slate-600">{it.text}{it.sub && <p className="text-xs text-slate-400 mt-0.5">{it.sub}</p>}</div>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const KudosCelebration = () => {
  const { currentEmployeeId } = useApp();
  const [items, setItems] = useState([]);

  useEffect(() => { if (currentEmployeeId) api.kudosNotifications(currentEmployeeId).then((r) => setItems(r.items || [])); }, [currentEmployeeId]);

  const dismiss = async () => { if (currentEmployeeId) { await api.markKudosSeen(currentEmployeeId); setItems([]); } };

  if (items.length === 0) return null;
  return (
    <div data-testid="kudos-celebration" className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 flex items-start gap-3">
      <div className="w-11 h-11 rounded-xl bg-blue-500 text-white grid place-items-center shrink-0"><PartyPopper className="w-6 h-6" /></div>
      <div className="flex-1 min-w-0">
        <p className="font-heading font-bold text-slate-800">Tebrikler! {items.length} yeni takdir aldın 🎉</p>
        <div className="mt-1.5 space-y-1">
          {items.slice(0, 3).map((k) => (
            <p key={k.id} className="text-sm text-slate-600"><span className="font-semibold">{k.from_name}</span> sana <span className="font-semibold text-blue-600">{k.value_label}</span> kudos'u verdi</p>
          ))}
        </div>
      </div>
      <button data-testid="kudos-celebration-dismiss" onClick={dismiss} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/60"><X className="w-4 h-4" /></button>
    </div>
  );
};
