import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AppProvider, useApp } from "@/context/AppContext";
import { Shell } from "@/components/Shell";
import { MandatoryPulseBanner } from "@/components/MandatoryPulseBanner";
import { Placeholder } from "@/components/Placeholder";
import { InternalComms } from "@/pages/InternalComms";
import { HRPage } from "@/pages/HRPage";
import { AnnouncementsFeed, AnnouncementDetail } from "@/pages/Announcements";
import { PulseFeed } from "@/pages/pulse/PulseFeed";
import { PulseFill } from "@/pages/pulse/PulseFill";
import { EventsFeed, EventDetail } from "@/pages/events/Events";
import { HomePage } from "@/pages/HomePage";
import { CalendarPage } from "@/pages/CalendarPage";
import { MoodPage } from "@/pages/mood/MoodPage";
import { ListingsFeed, ListingCreate, ListingDetail } from "@/pages/listings/Listings";
import { AvatarPage } from "@/pages/avatar/AvatarPage";
import { RoutesFeed, RouteDetail } from "@/pages/routes/Routes";
import { MoodReminderBanner } from "@/components/MoodReminderBanner";
import { AdminPanel } from "@/pages/admin/AdminPanel";

const AdminRoute = ({ children }) => {
  const { role } = useApp();
  return role === "admin" ? children : <Navigate to="/ic-iletisim" replace />;
};

function App() {
  return (
    <div className="App">
      <AppProvider>
        <BrowserRouter>
          <Shell>
            <MandatoryPulseBanner />
            <MoodReminderBanner />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/takim" element={<Placeholder title="Takım" subtitle="Takımınıza ait bilgiler." icon="Users" accent="bg-emerald-50 text-emerald-500" />} />
              <Route path="/ic-iletisim" element={<InternalComms />} />
              <Route path="/ic-iletisim/duyurular" element={<AnnouncementsFeed />} />
              <Route path="/ic-iletisim/duyurular/:id" element={<AnnouncementDetail />} />
              <Route path="/ic-iletisim/pulse" element={<PulseFeed />} />
              <Route path="/ic-iletisim/pulse/:id/fill" element={<PulseFill />} />
              <Route path="/ic-iletisim/etkinlik" element={<EventsFeed />} />
              <Route path="/ic-iletisim/etkinlik/:id" element={<EventDetail />} />
              <Route path="/ic-iletisim/gunluk-mod" element={<MoodPage />} />
              <Route path="/ic-iletisim/ilanlar" element={<ListingsFeed />} />
              <Route path="/ic-iletisim/ilanlar/yeni" element={<ListingCreate />} />
              <Route path="/ic-iletisim/ilanlar/:id" element={<ListingDetail />} />
              <Route path="/ic-iletisim/avatar" element={<AvatarPage />} />
              <Route path="/ic-iletisim/servis" element={<RoutesFeed />} />
              <Route path="/ic-iletisim/servis/:id" element={<RouteDetail />} />
              <Route path="/ik" element={<AdminRoute><HRPage /></AdminRoute>} />
              <Route path="/takvim" element={<CalendarPage />} />
              <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
              <Route path="*" element={<Navigate to="/ic-iletisim" replace />} />
            </Routes>
          </Shell>
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </AppProvider>
    </div>
  );
}

export default App;
