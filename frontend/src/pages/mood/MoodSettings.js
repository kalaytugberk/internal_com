import React, { useEffect, useState } from "react";
import { api } from "@/api";
import { MoodReport } from "@/pages/mood/MoodReport";
import { AudiencePicker } from "@/components/AudiencePicker";
import { IconPicker } from "@/components/IconPicker";
import { emptyAudience } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BarChart3, Smile, Bell, MessageSquare, Info } from "lucide-react";
import { toast } from "sonner";

export const MoodSettings = () => {
  const [cfg, setCfg] = useState(null);
  const [report, setReport] = useState(false);

  useEffect(() => { api.moodConfig().then(setCfg); }, []);

  const save = async () => {
    if (!cfg.display_name?.trim()) return toast.error("Görünen ad zorunlu");
    const payload = {
      display_name: cfg.display_name, icon: cfg.icon, status: cfg.status,
      audience: cfg.audience, allow_comment: cfg.allow_comment,
      reminder_enabled: cfg.reminder_enabled, reminder_time: cfg.reminder_time,
    };
    const updated = await api.updateMoodConfig(payload);
    setCfg(updated); toast.success("Günlük Mod ayarları kaydedildi");
  };

  if (!cfg) return <div className="py-16 text-center text-slate-400">Yükleniyor...</div>;
  if (report) return <MoodReport onBack={() => setReport(false)} />;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="font-heading font-bold text-xl text-slate-800">Günlük Mod Ayarları</h2>
          <p className="text-sm text-slate-500">Tek, sabit bir kategori — çoğaltılamaz. Yalnızca yapılandırırsınız.</p>
        </div>
        <Button data-testid="mood-report-btn" variant="outline" onClick={() => setReport(true)}><BarChart3 className="w-4 h-4 mr-1.5" /> Raporu Gör</Button>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-6 space-y-5">
        <div className="flex items-end gap-3">
          <div><Label className="mb-1.5 block">İkon</Label><IconPicker value={cfg.icon} onChange={(v) => setCfg({ ...cfg, icon: v })} testPrefix="mood-icon" /></div>
          <div className="flex-1"><Label className="mb-1.5 block">Görünen Ad</Label>
            <Input data-testid="mood-name-input" value={cfg.display_name} onChange={(e) => setCfg({ ...cfg, display_name: e.target.value })} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
          <span className="text-sm font-medium text-slate-700">Durum: {cfg.status === "active" ? "Aktif" : "Pasif"}</span>
          <Switch data-testid="mood-status" checked={cfg.status === "active"} onCheckedChange={(c) => setCfg({ ...cfg, status: c ? "active" : "passive" })} />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
          <span className="text-sm font-medium text-slate-700 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-slate-400" /> Opsiyonel yorum alanı ("Bu modu seçme sebebin?")</span>
          <Switch data-testid="mood-allowcomment" checked={cfg.allow_comment} onCheckedChange={(c) => setCfg({ ...cfg, allow_comment: c })} />
        </div>

        <div className="rounded-xl border border-slate-200 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700 flex items-center gap-2"><Bell className="w-4 h-4 text-slate-400" /> Hatırlatma bildirimi</span>
            <Switch data-testid="mood-reminder" checked={cfg.reminder_enabled} onCheckedChange={(c) => setCfg({ ...cfg, reminder_enabled: c })} />
          </div>
          {cfg.reminder_enabled && (
            <div className="mt-3 flex items-center gap-3">
              <Label className="text-sm text-slate-500">Saat</Label>
              <Input type="time" data-testid="mood-reminder-time" className="w-36" value={cfg.reminder_time || "17:00"} onChange={(e) => setCfg({ ...cfg, reminder_time: e.target.value })} />
              <span className="text-xs text-slate-400">O gün henüz giriş yapmayan çalışana bu saatte uygulama içi hatırlatma gösterilir.</span>
            </div>
          )}
        </div>

        <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-600">Cevap tipi sabittir: <span className="font-semibold">Emoji / Skor (1-5)</span>. Gizlilik gereği bireysel veriler hiçbir raporda gösterilmez.</p>
        </div>

        <div>
          <Label className="mb-2 block">Hedef Kitle</Label>
          <AudiencePicker value={cfg.audience || emptyAudience()} onChange={(a) => setCfg({ ...cfg, audience: a })} testPrefix="mood-seg" />
        </div>

        <div className="flex justify-end">
          <Button data-testid="mood-save-btn" className="bg-blue-500 hover:bg-blue-600" onClick={save}>Kaydet</Button>
        </div>
      </div>
    </div>
  );
};
