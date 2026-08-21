import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CategoriesManager } from "@/pages/admin/CategoriesManager";
import { AnnouncementsManager } from "@/pages/admin/AnnouncementsManager";
import { PulsesManager } from "@/pages/pulse/PulsesManager";
import { EventsManager } from "@/pages/events/EventsManager";
import { MoodSettings } from "@/pages/mood/MoodSettings";
import { ListingsManager } from "@/pages/listings/ListingsManager";
import { AvatarConcepts } from "@/pages/avatar/AvatarConcepts";
import { RoutesManager } from "@/pages/routes/RoutesManager";
import { NotificationsManager } from "@/pages/notifications/NotificationsManager";
import { HapBilgiManager } from "@/pages/hapbilgi/HapBilgi";
import { DiscountsManager } from "@/pages/discounts/Discounts";
import { CanteenManager } from "@/pages/canteen/Canteen";
import { IsgRamakManager } from "@/pages/isgramak/IsgRamak";
import { RoomsManager } from "@/pages/rooms/MeetingRooms";
import { EnlerManager } from "@/pages/enler/Enler";
import { KutlamaManager } from "@/pages/kutlama/Kutlama";
import { KudosManager } from "@/pages/gamification/Kudos";
import { RozetManager } from "@/pages/gamification/Gamification";
import { GamesManager } from "@/pages/gamification/Games";
import { CommunitiesManager } from "@/pages/community/Community";
import { Layers, Megaphone, ChevronLeft, Activity, CalendarDays, Smile, Tag, Sparkles, Bus, Bell, ShieldAlert, Lightbulb, Percent, Utensils, AlertTriangle, DoorOpen, Star, PartyPopper, Award, Trophy, Gamepad2, Users } from "lucide-react";

const TABS = [
  { key: "categories", label: "Kategori Yönetimi", icon: Layers },
  { key: "announcements", label: "Duyuru Yönetimi", icon: Megaphone },
  { key: "pulse", label: "Pulse Anketleri", icon: Activity },
  { key: "events", label: "Etkinlikler", icon: CalendarDays },
  { key: "mood", label: "Günlük Mod", icon: Smile },
  { key: "listings", label: "İlanlar", icon: Tag },
  { key: "avatar", label: "Avatar Seçimi", icon: Sparkles },
  { key: "routes", label: "Servis Güzergahı", icon: Bus },
  { key: "anlik", label: "Anlık Bildirim", icon: Bell },
  { key: "isg", label: "İSG — Acil Durum", icon: ShieldAlert },
  { key: "hapbilgi", label: "Hap Bilgi", icon: Lightbulb },
  { key: "indirim", label: "İndirim & Ayrıcalıklar", icon: Percent },
  { key: "yemekhane", label: "Yemekhane Listesi", icon: Utensils },
  { key: "isgramak", label: "İSG — Ramak Kala", icon: AlertTriangle },
  { key: "rooms", label: "Toplantı Odası", icon: DoorOpen },
  { key: "enler", label: "Şirketin Enleri", icon: Star },
  { key: "kutlama", label: "Kutlama", icon: PartyPopper },
  { key: "kudos", label: "Kudos", icon: Award },
  { key: "rozet", label: "Rozet / Oyunlaştırma", icon: Trophy },
  { key: "oyun", label: "Oyun", icon: Gamepad2 },
  { key: "topluluk", label: "Topluluk", icon: Users },
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

      {tab === "categories" && <CategoriesManager onOpen={setTab} />}
      {tab === "announcements" && <AnnouncementsManager />}
      {tab === "pulse" && <PulsesManager />}
      {tab === "events" && <EventsManager />}
      {tab === "mood" && <MoodSettings />}
      {tab === "listings" && <ListingsManager />}
      {tab === "avatar" && <AvatarConcepts />}
      {tab === "routes" && <RoutesManager />}
      {tab === "anlik" && <NotificationsManager kind="anlik_bildirim" />}
      {tab === "isg" && <NotificationsManager kind="isg_acil" isg />}
      {tab === "hapbilgi" && <HapBilgiManager />}
      {tab === "indirim" && <DiscountsManager />}
      {tab === "yemekhane" && <CanteenManager />}
      {tab === "isgramak" && <IsgRamakManager />}
      {tab === "rooms" && <RoomsManager />}
      {tab === "enler" && <EnlerManager />}
      {tab === "kutlama" && <KutlamaManager />}
      {tab === "kudos" && <KudosManager />}
      {tab === "rozet" && <RozetManager />}
      {tab === "oyun" && <GamesManager />}
      {tab === "topluluk" && <CommunitiesManager />}
    </div>
  );
};
