"use client";

import React, { useState, useRef, useEffect } from "react";

interface Option {
  value: string;
  text: string;
  selected: boolean;
}

interface MultiSelectProps {
  label: string;
  options: Option[];
  defaultSelected?: string[];
  onChange?: (selected: string[]) => void;
  disabled?: boolean;
}

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;

const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  options,
  defaultSelected = [],
  onChange,
  disabled = false,
}) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>(defaultSelected);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (value: string) => {
    const newSelected = selectedOptions.includes(value)
      ? selectedOptions.filter((v) => v !== value)
      : [...selectedOptions, value];
    setSelectedOptions(newSelected);
    if (onChange) onChange(newSelected);
  };

  const removeOption = (e: React.MouseEvent, value: string) => {
    e.stopPropagation();
    const newSelected = selectedOptions.filter((v) => v !== value);
    setSelectedOptions(newSelected);
    if (onChange) onChange(newSelected);
  };

  return (
    <div ref={containerRef} className="w-full">
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
        {label}
      </label>

      <div className="relative w-full">
        {/* Trigger */}
        <div
          onClick={toggleDropdown}
          className={`relative w-full min-h-11 rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm shadow-theme-xs cursor-pointer dark:border-gray-700 dark:bg-gray-900 ${
            isOpen ? "border-brand-300 ring-3 ring-brand-500/10 dark:border-brand-800" : ""
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {selectedOptions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {selectedOptions.map((value) => {
                const option = options.find((o) => o.value === value);
                return (
                  <span
                    key={value}
                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-white/80"
                  >
                    {option?.text ?? value}
                    <button
                      type="button"
                      onClick={(e) => removeOption(e, value)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <svg width="10" height="10" viewBox="0 0 14 14" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M3.40717 4.46881C3.11428 4.17591 3.11428 3.70104 3.40717 3.40815C3.70006 3.11525 4.17494 3.11525 4.46783 3.40815L6.99943 5.93975L9.53095 3.40822C9.82385 3.11533 10.2987 3.11533 10.5916 3.40822C10.8845 3.70112 10.8845 4.17599 10.5916 4.46888L8.06009 7.00041L10.5916 9.53193C10.8845 9.82482 10.8845 10.2997 10.5916 10.5926C10.2987 10.8855 9.82385 10.8855 9.53095 10.5926L6.99943 8.06107L4.46783 10.5927C4.17494 10.8856 3.70006 10.8856 3.40717 10.5927C3.11428 10.2998 3.11428 9.8249 3.40717 9.53201L5.93877 7.00041L3.40717 4.46881Z"
                        />
                      </svg>
                    </button>
                  </span>
                );
              })}
            </div>
          ) : (
            <span className="text-gray-400 dark:text-gray-500 leading-7">Select service type</span>
          )}

          {/* Chevron */}
          <span
            className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none dark:text-gray-400 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M4.79175 7.39551L10.0001 12.6038L15.2084 7.39551"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>

        {/* Dropdown */}
        {isOpen && (
          <ul
            className="absolute left-0 top-full z-50 mt-1 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
            style={{ maxHeight: VISIBLE_ITEMS * ITEM_HEIGHT }}
          >
            {options.map((option) => {
              const isSelected = selectedOptions.includes(option.value);
              return (
                <li
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`flex items-center gap-3 px-4 cursor-pointer text-sm hover:bg-gray-100 dark:hover:bg-white/5 ${
                    isSelected
                      ? "text-brand-600 dark:text-brand-400"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                  style={{ height: ITEM_HEIGHT }}
                >
                  {/* Checkbox */}
                  <span
                    className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-brand-500 border-brand-500"
                        : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                    }`}
                  >
                    {isSelected && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path
                          d="M1 4L3.5 6.5L9 1"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  {option.text}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default MultiSelect;
