"use client";

import React, { useState, useRef, useEffect, FC } from "react";
import DatePicker from "@/components/form/date-picker";

export interface DateFilterValue {
  preset: string | null;
  from: string | null;
  to: string | null;
}

interface ColumnDateFilterPopoverProps {
  column: "startdate" | "enddate";
  label: string;
  value: DateFilterValue;
  onApply: (filter: DateFilterValue) => void;
  onReset: () => void;
  align?: "left" | "right";
}

export const START_DATE_PRESETS = [
  { id: "all", label: "All", desc: "No preset filter" },
  {
    id: "upcoming",
    label: "Starts in > 1 days",
    badgeColor: "bg-emerald-500",
    textClass: "text-emerald-700 dark:text-emerald-400",
    bgClass: "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/30",
  },
  {
    id: "tomorrow",
    label: "Starts tomorrow",
    badgeColor: "bg-amber-500",
    textClass: "text-amber-700 dark:text-amber-400",
    bgClass: "bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 border-amber-200 dark:border-amber-500/30",
  },
  {
    id: "actived",
    label: "Actived",
    badgeColor: "bg-rose-500",
    textClass: "text-rose-700 dark:text-rose-400",
    bgClass: "bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 border-rose-200 dark:border-rose-500/30",
  },
] as const;

export const END_DATE_PRESETS = [
  { id: "all", label: "All", desc: "No preset filter" },
  {
    id: "running",
    label: "Ends in > 1 days",
    badgeColor: "bg-emerald-500",
    textClass: "text-emerald-700 dark:text-emerald-400",
    bgClass: "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/30",
  },
  {
    id: "tomorrow",
    label: "Ends tomorrow",
    badgeColor: "bg-amber-500",
    textClass: "text-amber-700 dark:text-amber-400",
    bgClass: "bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 border-amber-200 dark:border-amber-500/30",
  },
  {
    id: "ended",
    label: "Ended",
    badgeColor: "bg-rose-500",
    textClass: "text-rose-700 dark:text-rose-400",
    bgClass: "bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 border-rose-200 dark:border-rose-500/30",
  },
] as const;

const ColumnDateFilterPopover: FC<ColumnDateFilterPopoverProps> = ({
  column,
  label,
  value,
  onApply,
  onReset,
  align = "left",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Draft state while popover is open
  const [tempPreset, setTempPreset] = useState<string | null>(value.preset);
  const [tempFrom, setTempFrom] = useState<string>(value.from ?? "");
  const [tempTo, setTempTo] = useState<string>(value.to ?? "");
  const [pickerResetKey, setPickerResetKey] = useState(0);

  // Active status check
  const isActive = Boolean(value.preset || value.from || value.to);

  // Sync draft state with external values whenever opened
  useEffect(() => {
    if (isOpen) {
      setTempPreset(value.preset);
      setTempFrom(value.from ?? "");
      setTempTo(value.to ?? "");
      setPickerResetKey((k) => k + 1);
    }
  }, [isOpen, value]);

  // Handle outside click & escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Do not close if click is inside popover or inside a flatpickr calendar popup
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !target.closest(".flatpickr-calendar")
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const presets = column === "startdate" ? START_DATE_PRESETS : END_DATE_PRESETS;

  const handleSelectPreset = (presetId: string) => {
    if (presetId === "all") {
      setTempPreset(null);
    } else {
      setTempPreset(presetId);
      // Clear custom range when choosing preset to avoid conflict
      setTempFrom("");
      setTempTo("");
      setPickerResetKey((k) => k + 1);
    }
  };

  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    onApply({
      preset: tempPreset,
      from: tempFrom.trim() || null,
      to: tempTo.trim() || null,
    });
    setIsOpen(false);
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTempPreset(null);
    setTempFrom("");
    setTempTo("");
    setPickerResetKey((k) => k + 1);
    onReset();
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      {/* Trigger Button with Funnel Icon & Active indicator */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        title={`Filter ${label}`}
        aria-label={`Filter ${label}`}
        className={`relative inline-flex items-center justify-center p-1 rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
          isActive
            ? "text-brand-500 bg-brand-50 hover:bg-brand-100 dark:bg-brand-500/15 dark:hover:bg-brand-500/25"
            : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06]"
        }`}
      >
        {/* Filter Funnel SVG Icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-3.5 h-3.5"
        >
          <path
            fillRule="evenodd"
            d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.972.206 7.372.601a.75.75 0 01.628.74v2.288a2.25 2.25 0 01-.659 1.59l-4.682 4.683a2.25 2.25 0 00-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 018 18.25v-5.757a2.25 2.25 0 00-.659-1.591L2.659 6.22A2.25 2.25 0 012 4.629V2.34a.75.75 0 01.628-.74z"
            clipRule="evenodd"
          />
        </svg>

        {/* Active Dot indicator */}
        {isActive && (
          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500 ring-2 ring-white dark:ring-gray-900"></span>
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute top-full mt-2 ${
            align === "right" ? "right-0" : "left-0"
          } w-80 sm:w-[350px] rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.1] shadow-2xl dark:shadow-black/70 ring-1 ring-black/5 dark:ring-white/10 z-50 p-4 text-left font-normal normal-case animate-in fade-in zoom-in-95 duration-100`}
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/[0.06]">
            <div>
              <h4 className="text-xs font-semibold text-gray-800 dark:text-white/90">
                Filter {label}
              </h4>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Select status preset or custom range
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-3.5 h-3.5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          <div className="py-3 space-y-4">
            {/* Group A: Quick Badge Presets */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Quick Presets
              </label>
              <div className="space-y-1.5">
                {presets.map((preset) => {
                  const isSelected =
                    preset.id === "all"
                      ? !tempPreset
                      : tempPreset === preset.id;

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all text-left cursor-pointer ${
                        isSelected
                          ? "border-brand-500 bg-brand-50/60 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 shadow-xs"
                          : "border-gray-100 dark:border-white/[0.04] bg-gray-50/50 dark:bg-white/[0.02] text-gray-600 dark:text-gray-300 hover:border-gray-200 dark:hover:border-white/[0.1] hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {"badgeColor" in preset && preset.badgeColor ? (
                          <span
                            className={`w-2 h-2 rounded-full ${preset.badgeColor} shrink-0`}
                          />
                        ) : (
                          <span className="w-2 h-2 rounded-full border border-gray-400 shrink-0" />
                        )}
                        <span>{preset.label}</span>
                      </span>
                      {isSelected && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-3.5 h-3.5 text-brand-500"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Group B: Custom Date Range with project DatePicker component */}
            <div className="pt-3 border-t border-gray-100 dark:border-white/[0.06] space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Custom Range
                </label>
                {(tempFrom || tempTo) && (
                  <button
                    type="button"
                    onClick={() => {
                      setTempFrom("");
                      setTempTo("");
                      setPickerResetKey((k) => k + 1);
                    }}
                    className="text-[11px] text-brand-500 hover:text-brand-600 dark:hover:text-brand-400 font-medium cursor-pointer"
                  >
                    Clear dates
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <div>
                  <DatePicker
                    key={`from-${column}-${pickerResetKey}`}
                    id={`filter-${column}-from`}
                    label="From date"
                    placeholder="Select start date"
                    size="sm"
                    defaultDate={tempFrom || undefined}
                    onChange={(_dates, dateStr) => {
                      setTempFrom(dateStr);
                      setTempPreset(null);
                    }}
                  />
                </div>

                <div>
                  <DatePicker
                    key={`to-${column}-${pickerResetKey}`}
                    id={`filter-${column}-to`}
                    label="To date"
                    placeholder="Select end date"
                    size="sm"
                    defaultDate={tempTo || undefined}
                    onChange={(_dates, dateStr) => {
                      setTempTo(dateStr);
                      setTempPreset(null);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Popover Footer: 2 Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/[0.06] gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/40 cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnDateFilterPopover;
