import React from "react";
import { ICON_CHOICES, Icon } from "@/lib/icons";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

export const IconPicker = ({ value, onChange, testPrefix = "icon" }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid={`${testPrefix}-trigger`}
          className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 grid place-items-center border border-blue-100 hover:bg-blue-100 transition-colors"
        >
          <Icon name={value} className="w-5 h-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        <div className="grid grid-cols-6 gap-2">
          {ICON_CHOICES.map((name) => (
            <button
              key={name}
              type="button"
              data-testid={`${testPrefix}-opt-${name}`}
              onClick={() => onChange(name)}
              className={[
                "aspect-square rounded-lg grid place-items-center transition-colors",
                value === name ? "bg-blue-500 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100",
              ].join(" ")}
            >
              <Icon name={name} className="w-4 h-4" />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
