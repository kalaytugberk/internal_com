import React, { useEffect, useState } from "react";
import { api } from "@/api";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Users2 } from "lucide-react";

const GROUPS = [
  { key: "departments", label: "Departman" },
  { key: "locations", label: "Lokasyon" },
  { key: "titles", label: "Unvan" },
  { key: "seniorities", label: "Kıdem" },
];

// value: audience object { all, departments, locations, titles, seniorities }
export const SegmentPicker = ({ value, onChange, testPrefix = "seg" }) => {
  const [options, setOptions] = useState({ departments: [], locations: [], titles: [], seniorities: [] });

  useEffect(() => {
    api.segmentOptions().then(setOptions);
  }, []);

  const toggleAll = (checked) => {
    onChange({ all: checked, departments: [], locations: [], titles: [], seniorities: [] });
  };

  const toggleItem = (groupKey, item) => {
    const current = value[groupKey] || [];
    const next = current.includes(item) ? current.filter((i) => i !== item) : [...current, item];
    onChange({ ...value, all: false, [groupKey]: next });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-4" data-testid={`${testPrefix}-picker`}>
      <label className="flex items-center gap-2.5 cursor-pointer">
        <Checkbox
          checked={value.all}
          onCheckedChange={toggleAll}
          data-testid={`${testPrefix}-all`}
        />
        <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <Users2 className="w-4 h-4 text-blue-500" /> Tüm Çalışanlar
        </span>
      </label>

      {!value.all && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {GROUPS.map((g) => (
            <div key={g.key}>
              <Label className="text-xs font-bold uppercase tracking-wide text-slate-400">{g.label}</Label>
              <div className="mt-2 space-y-1.5">
                {(options[g.key] || []).map((item) => (
                  <label key={item} className="flex items-center gap-2 cursor-pointer text-sm text-slate-600">
                    <Checkbox
                      checked={(value[g.key] || []).includes(item)}
                      onCheckedChange={() => toggleItem(g.key, item)}
                      data-testid={`${testPrefix}-${g.key}-${item}`}
                    />
                    {item}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
