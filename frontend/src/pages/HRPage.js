import React from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import {
  Network, Users, Umbrella, Clock, GraduationCap, FileText, MonitorSmartphone,
  Wallet, CreditCard, LineChart, BarChart3, CalendarHeart, Settings, UserPlus, MessagesSquare, ArrowRight,
} from "lucide-react";

const CARDS = [
  { key: "org", title: "Organizasyon Yönetimi", desc: "Organizasyon bilgilerini buradan yönetebilirsiniz.", icon: Network, bg: "bg-[#E6F7F0]", fg: "text-[#0D9488]" },
  { key: "calisan", title: "Çalışan Yönetimi", desc: "Çalışanlarınızın bilgilerini buradan yönetebilirsiniz.", icon: Users, bg: "bg-[#EEF2F7]", fg: "text-[#64748B]" },
  { key: "izin", title: "İzin Yönetimi", desc: "Çalışanlarınızın izinlerini buradan yönetebilirsiniz.", icon: Umbrella, bg: "bg-[#FEF3D7]", fg: "text-[#CA8A04]" },
  { key: "mesai", title: "Fazla Mesai Yönetimi", desc: "Çalışanlarınızın fazla mesai bilgilerini buradan yönetebilirsiniz.", icon: Clock, bg: "bg-[#F3E1EA]", fg: "text-[#BE5A8A]" },
  { key: "egitim", title: "Eğitim Yönetimi", desc: "Çalışanlarınızın eğitim bilgilerini buradan yönetebilirsiniz.", icon: GraduationCap, bg: "bg-[#E4EEE4]", fg: "text-[#5B8266]" },
  { key: "anket", title: "Anket Yönetimi", desc: "Anket süreçlerinizi buradan yönetebilirsiniz.", icon: FileText, bg: "bg-[#E0F0F7]", fg: "text-[#0284C7]" },
  { key: "zimmet", title: "Zimmet Yönetimi", desc: "Çalışanlarınızın zimmet bilgilerini buradan yönetebilirsiniz.", icon: MonitorSmartphone, bg: "bg-[#FBE4EC]", fg: "text-[#DB2777]" },
  { key: "avans", title: "Avans Yönetimi", desc: "Çalışanlarınızın avans bilgilerini buradan yönetebilirsiniz.", icon: Wallet, bg: "bg-[#E4EEEA]", fg: "text-[#4E8878]" },
  { key: "odeme", title: "Ödeme ve Kesintiler", desc: "Ödeme ve Kesinti İşlemlerinizi buradan yönetebilirsiniz.", icon: CreditCard, bg: "bg-[#E3EBF5]", fg: "text-[#3F6BB0]" },
  { key: "performans", title: "Performans Yönetimi", desc: "Çalışanlarınızın hedef ve yetkinliklerini buradan yönetebilirsiniz.", icon: LineChart, bg: "bg-[#DCEDEA]", fg: "text-[#2A8C7C]" },
  { key: "raporlar", title: "İK Raporları", desc: "İK Dashboard ve raporlarınızı buradan yönetebilirsiniz.", icon: BarChart3, bg: "bg-[#E9E6F5]", fg: "text-[#7C6BC0]" },
  { key: "iletisim", title: "İç İletişim Platformu", desc: "Şirket içi aksiyonlarınızı buradan yönetebilirsiniz.", icon: CalendarHeart, bg: "bg-[#FADEDE]", fg: "text-[#D46A6A]", active: true },
  { key: "ayarlar", title: "Sistem Ayarları", desc: "Sistem ayarlarını buradan yönetebilirsiniz.", icon: Settings, bg: "bg-[#EEF1F4]", fg: "text-[#64748B]" },
  { key: "giris", title: "İşe Giriş & Ayrılış", desc: "Çalışanların işe giriş ve ayrılış süreçlerini buradan yönetebilirsiniz.", icon: UserPlus, bg: "bg-[#FCE6D8]", fg: "text-[#E07A47]" },
  { key: "talep", title: "Talep & Öneri Yönetimi", desc: "Çalışan taleplerini ve önerilerini buradan takip edin.", icon: MessagesSquare, bg: "bg-[#E1EBF5]", fg: "text-[#4A79B8]" },
];

export const HRPage = () => {
  const navigate = useNavigate();
  const { role } = useApp();

  const openModule = () => navigate(role === "admin" ? "/admin" : "/ic-iletisim");

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-slate-800">İnsan Kaynakları</h1>
      <p className="text-sm text-slate-500 mt-1">İK işlemlerinizi yapabilirsiniz.</p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CARDS.map((c) => {
          const I = c.icon;
          const clickable = c.active;
          return (
            <button
              key={c.key}
              data-testid={`hr-card-${c.key}`}
              onClick={clickable ? openModule : undefined}
              disabled={!clickable}
              className={[
                "group text-left rounded-2xl p-6 flex items-start gap-4 transition-all",
                c.bg,
                clickable
                  ? "ring-2 ring-transparent hover:ring-[#D46A6A]/40 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
                  : "opacity-95 cursor-default",
              ].join(" ")}
            >
              <div className={`shrink-0 ${c.fg}`}>
                <I className="w-8 h-8" strokeWidth={1.6} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={`font-heading font-bold text-lg ${c.fg}`}>{c.title}</h3>
                  {clickable && (
                    <ArrowRight className={`w-4 h-4 ${c.fg} opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all`} />
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-1 leading-snug">{c.desc}</p>
                {clickable && (
                  <span className="inline-block mt-3 text-[11px] font-semibold text-[#D46A6A] bg-white/60 rounded-full px-2.5 py-1">
                    Modüle Giriş →
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
