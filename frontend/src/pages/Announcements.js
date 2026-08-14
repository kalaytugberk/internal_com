import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { useApp } from "@/context/AppContext";
import { Icon } from "@/lib/icons";
import { Pin, ChevronLeft, Sparkles } from "lucide-react";
import { audienceSummary } from "@/lib/constants";

const AnnCard = ({ a, onClick, featured }) => (
  <button
    data-testid={`feed-item-${a.id}`}
    onClick={onClick}
    className={[
      "text-left w-full bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5",
      featured ? "border-amber-200" : "border-slate-100",
    ].join(" ")}
  >
    {a.image && <img src={a.image} alt="" className="w-full h-40 object-cover" />}
    <div className="p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 rounded-full px-2.5 py-1">
          <Icon name={a._subcategory?.icon} className="w-3 h-3" /> {a._subcategory?.name}
        </span>
        {a.pinned && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 rounded-full px-2.5 py-1">
            <Pin className="w-3 h-3" /> Öne Çıkan
          </span>
        )}
      </div>
      <h3 className="font-heading font-bold text-slate-800 text-lg leading-snug">{a.title}</h3>
      <p className="text-sm text-slate-500 mt-2 line-clamp-2">{a.body}</p>
    </div>
  </button>
);

export const AnnouncementsFeed = () => {
  const navigate = useNavigate();
  const { currentEmployeeId } = useApp();
  const [feed, setFeed] = useState([]);

  useEffect(() => {
    if (currentEmployeeId) api.feed(currentEmployeeId).then(setFeed);
  }, [currentEmployeeId]);

  const pinned = feed.filter((a) => a.pinned);
  const rest = feed.filter((a) => !a.pinned);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <button
        data-testid="feed-back"
        onClick={() => navigate("/ic-iletisim")}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-4"
      >
        <ChevronLeft className="w-4 h-4" /> İç İletişim
      </button>
      <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-slate-800">Duyurular</h1>
      <p className="text-sm text-slate-500 mt-1">Size özel yayınlanan şirket duyuruları.</p>

      {pinned.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h2 className="font-heading font-bold text-slate-700">Öne Çıkanlar</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pinned.map((a) => (
              <AnnCard key={a.id} a={a} featured onClick={() => navigate(`/ic-iletisim/duyurular/${a.id}`)} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 space-y-4">
        <h2 className="font-heading font-bold text-slate-700">Tüm Duyurular</h2>
        {feed.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 py-16 text-center text-slate-400 text-sm">
            Hedef kitlenize uygun yayınlanmış duyuru bulunmuyor.
          </div>
        )}
        {rest.map((a) => (
          <AnnCard key={a.id} a={a} onClick={() => navigate(`/ic-iletisim/duyurular/${a.id}`)} />
        ))}
      </div>
    </div>
  );
};

export const AnnouncementDetail = () => {
  const navigate = useNavigate();
  const [ann, setAnn] = useState(null);
  const id = window.location.pathname.split("/").pop();

  useEffect(() => {
    api.announcement(id).then(setAnn).catch(() => setAnn(null));
  }, [id]);

  if (!ann) return <div className="max-w-3xl mx-auto px-6 py-16 text-slate-400">Yükleniyor...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8" data-testid="announcement-detail">
      <button
        data-testid="detail-back"
        onClick={() => navigate("/ic-iletisim/duyurular")}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-4"
      >
        <ChevronLeft className="w-4 h-4" /> Duyurular
      </button>

      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded-full px-3 py-1">
          <Icon name={ann._subcategory?.icon} className="w-3.5 h-3.5" /> {ann._subcategory?.name}
        </span>
        {ann.pinned && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 rounded-full px-3 py-1">
            <Pin className="w-3.5 h-3.5" /> Öne Çıkan
          </span>
        )}
      </div>

      <h1 className="text-3xl font-heading font-bold text-slate-800 leading-tight">{ann.title}</h1>
      <p className="text-xs text-slate-400 mt-2">Hedef Kitle: {audienceSummary(ann.audience)}</p>

      {ann.image && <img src={ann.image} alt="" className="w-full rounded-2xl mt-6 object-cover max-h-96" />}

      <div className="mt-6 text-slate-600 leading-relaxed whitespace-pre-wrap">{ann.body}</div>
    </div>
  );
};
