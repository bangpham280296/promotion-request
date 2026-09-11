"use client";

import { useState, useRef, useEffect } from "react";
import { PencilIcon, CheckLineIcon, CloseLineIcon } from "@/icons";

type Props = {
  value: number;
  onSave: (newVal: number) => Promise<void>;
};

export default function InlineSurchargeEdit({ value, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(value));
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const handleSave = async () => {
    const parsed = Number(inputValue.replace(/[^0-9.-]/g, ""));
    if (isNaN(parsed) || parsed < 0) {
      setInputValue(String(value));
      setEditing(false);
      return;
    }
    if (parsed === value) {
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      await onSave(parsed);
      setEditing(false);
    } catch {
      setInputValue(String(value));
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      setInputValue(String(value));
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="number"
          min="0"
          step="500"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={saving}
          className="w-24 rounded border border-brand-500 bg-white px-2 py-0.5 text-xs text-right font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:bg-gray-800 dark:text-white"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded p-1 text-success-600 hover:bg-success-50 dark:hover:bg-success-500/10"
        >
          <CheckLineIcon className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            setInputValue(String(value));
            setEditing(false);
          }}
          disabled={saving}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.05]"
        >
          <CloseLineIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="group inline-flex items-center gap-1.5 cursor-pointer rounded px-1.5 py-0.5 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
      title="Click to edit surcharge"
    >
      <span className="font-semibold text-gray-800 dark:text-white text-xs">
        {value === 0 ? "0 ₫ (Free)" : `${value.toLocaleString("vi-VN")} ₫`}
      </span>
      <PencilIcon className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
