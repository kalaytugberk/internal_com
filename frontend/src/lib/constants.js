export const STATUS_META = {
  taslak: { label: "Taslak", cls: "bg-slate-100 text-slate-600" },
  onay_bekliyor: { label: "Onay Bekliyor", cls: "bg-amber-100 text-amber-700" },
  yayinda: { label: "Yayında", cls: "bg-emerald-100 text-emerald-700" },
  pasif: { label: "Pasif", cls: "bg-rose-100 text-rose-700" },
};

export const REPORTING_LEVELS = [
  { key: "kisi", label: "Kişi" },
  { key: "organizasyon", label: "Organizasyon Birimi" },
  { key: "sirket", label: "Şirket" },
];

export const CHANNELS = [
  { key: "mail", label: "Mail" },
  { key: "push", label: "Push" },
  { key: "sms", label: "SMS" },
];

export const emptyAudience = () => ({
  all: true, departments: [], locations: [], titles: [], seniorities: [],
});

export const audienceSummary = (aud) => {
  if (!aud || aud.all) return "Tüm Çalışanlar";
  const parts = [];
  ["departments", "locations", "titles", "seniorities"].forEach((k) => {
    (aud[k] || []).forEach((v) => parts.push(v));
  });
  return parts.length ? parts.join(", ") : "Tüm Çalışanlar";
};
