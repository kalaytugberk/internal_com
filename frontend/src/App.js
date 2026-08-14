import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AppProvider, useApp } from "@/context/AppContext";
import { Shell } from "@/components/Shell";
import { Placeholder } from "@/components/Placeholder";
import { InternalComms } from "@/pages/InternalComms";
import { AnnouncementsFeed, AnnouncementDetail } from "@/pages/Announcements";
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
            <Routes>
              <Route path="/" element={<Placeholder title="Ana Sayfa" subtitle="Kişisel panonuz." icon="Home" accent="bg-blue-50 text-blue-500" />} />
              <Route path="/takim" element={<Placeholder title="Takım" subtitle="Takımınıza ait bilgiler." icon="Users" accent="bg-emerald-50 text-emerald-500" />} />
              <Route path="/ic-iletisim" element={<InternalComms />} />
              <Route path="/ic-iletisim/duyurular" element={<AnnouncementsFeed />} />
              <Route path="/ic-iletisim/duyurular/:id" element={<AnnouncementDetail />} />
              <Route path="/ik" element={<Placeholder title="İnsan Kaynakları" subtitle="İK işlemlerinizi yapabilirsiniz." icon="Building2" accent="bg-purple-50 text-purple-500" />} />
              <Route path="/takvim" element={<Placeholder title="Takvim" subtitle="Etkinlik ve izin takviminiz." icon="Calendar" accent="bg-amber-50 text-amber-500" />} />
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
