export const LISTING_TYPES = [
  { key: "satilik", label: "Satılık", cls: "bg-blue-100 text-blue-700" },
  { key: "kiralik", label: "Kiralık", cls: "bg-teal-100 text-teal-700" },
  { key: "araniyor", label: "Aranıyor", cls: "bg-amber-100 text-amber-700" },
];

export const LISTING_STATUS = {
  taslak: { label: "Taslak", cls: "bg-slate-100 text-slate-600" },
  onay_bekliyor: { label: "Onay Bekliyor", cls: "bg-amber-100 text-amber-700" },
  yayinda: { label: "Yayında", cls: "bg-emerald-100 text-emerald-700" },
  reddedildi: { label: "Reddedildi", cls: "bg-rose-100 text-rose-700" },
  suresi_doldu: { label: "Süresi Doldu", cls: "bg-slate-200 text-slate-600" },
  kapali: { label: "Kapatıldı", cls: "bg-slate-200 text-slate-600" },
};

export const typeMeta = (k) => LISTING_TYPES.find((t) => t.key === k) || { label: k, cls: "bg-slate-100 text-slate-600" };

export const remainingDays = (expires_at) => {
  if (!expires_at) return null;
  const diff = Math.ceil((new Date(expires_at) - new Date()) / 86400000);
  return diff > 0 ? diff : 0;
};
