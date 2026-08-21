import React from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Home, Users, Radio, Building2, Calendar, Search, Bell, Settings, ChevronDown, ShieldCheck, UserRound } from "lucide-react";
import { useApp } from "@/context/AppContext";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { KudosBell } from "@/components/KudosNotifications";

const TABS = [
  { to: "/", label: "Ana Sayfa", icon: Home, end: true },
  { to: "/takim", label: "Takım", icon: Users },
  { to: "/ic-iletisim", label: "İç İletişim", icon: Radio },
  { to: "/ik", label: "İK", icon: Building2 },
  { to: "/takvim", label: "Takvim", icon: Calendar },
];

const initials = (name) =>
  (name || "??").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export const Shell = ({ children }) => {
  const { role, setRole, employees, currentEmployeeId, setCurrentEmployeeId, currentEmployee } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const isCommsActive = location.pathname.startsWith("/ic-iletisim") || location.pathname.startsWith("/admin");

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          {/* Logo + Search */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              data-testid="logo-btn"
              onClick={() => navigate("/")}
              className="w-9 h-9 rounded-xl bg-blue-500 text-white font-heading font-extrabold grid place-items-center shadow-sm"
            >
              P
            </button>
            <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-full px-4 py-2 w-56 lg:w-72">
              <Search className="w-4 h-4 text-slate-400" strokeWidth={2} />
              <input
                data-testid="global-search"
                placeholder="Her yerde ara..."
                className="bg-transparent outline-none text-sm text-slate-600 placeholder:text-slate-400 w-full"
              />
            </div>
          </div>

          {/* Center tabs */}
          <nav className="flex-1 flex items-center justify-center gap-1 sm:gap-3 overflow-x-auto pln-scroll">
            {TABS.filter((t) => !(t.to === "/ik" && role !== "admin")).map((t) => {
              const active = t.to === "/ic-iletisim" ? isCommsActive : undefined;
              return (
                <NavLink
                  key={t.to}
                  to={t.to}
                  end={t.end}
                  data-testid={`nav-${t.to === "/" ? "home" : t.to.replace("/", "")}`}
                  className={({ isActive }) => {
                    const on = active !== undefined ? active : isActive;
                    return [
                      "relative flex flex-col items-center px-3 py-2.5 text-xs font-medium transition-colors shrink-0",
                      on ? "text-blue-600" : "text-slate-500 hover:text-slate-800",
                    ].join(" ");
                  }}
                >
                  {({ isActive }) => {
                    const on = active !== undefined ? active : isActive;
                    const I = t.icon;
                    return (
                      <>
                        <I className="w-5 h-5 mb-0.5" strokeWidth={on ? 2.2 : 1.75} />
                        <span className="whitespace-nowrap">{t.label}</span>
                        {on && <span className="absolute -bottom-[9px] left-2 right-2 h-0.5 rounded-full bg-blue-600" />}
                      </>
                    );
                  }}
                </NavLink>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Role switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  data-testid="role-switcher"
                  className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  {role === "admin" ? <ShieldCheck className="w-4 h-4 text-blue-600" /> : <UserRound className="w-4 h-4 text-blue-600" />}
                  {role === "admin" ? "Admin/İK" : "Çalışan"}
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Rol Seç</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={role} onValueChange={setRole}>
                  <DropdownMenuRadioItem value="admin" data-testid="role-option-admin">Admin/İK</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="employee" data-testid="role-option-employee">Çalışan</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                {role === "employee" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Çalışan Olarak Görüntüle</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={currentEmployeeId || ""} onValueChange={setCurrentEmployeeId}>
                      {employees.map((e) => (
                        <DropdownMenuRadioItem key={e.id} value={e.id} data-testid={`emp-option-${e.id}`}>
                          {e.name} · {e.department}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {role === "admin" && (
              <button
                data-testid="admin-panel-link"
                onClick={() => navigate("/admin")}
                className="hidden sm:flex items-center gap-1.5 rounded-full bg-blue-500 text-white px-3 py-1.5 text-xs font-semibold hover:bg-blue-600 transition-colors"
              >
                <ShieldCheck className="w-4 h-4" /> Admin Paneli
              </button>
            )}

            <button data-testid="settings-btn" aria-label="Ayarlar" className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <KudosBell />
            <div className="flex items-center gap-2 pl-1">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-bold grid place-items-center overflow-hidden">
                {role === "employee" && currentEmployee?.avatar
                  ? <img src={currentEmployee.avatar} alt="" className="w-full h-full object-cover" data-testid="nav-avatar" />
                  : initials(role === "employee" ? currentEmployee?.name : "Selin Tekin")}
              </div>
              <span className="hidden lg:block text-xs font-semibold text-slate-600">PROFİLİM</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full">{children}</main>
    </div>
  );
};
