"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { supabase } from "@/lib/supabase/supabaseClient";
import type { AllItem } from "@/hooks/useItems";

type Props = {
  isOpen: boolean;
  item: AllItem | null;
  onClose: () => void;
  onSuccess: () => void;
};

export default function ItemEditModal({ isOpen, item, onClose, onSuccess }: Props) {
  const [status, setStatus] = useState<number>(1);
  const [itempicker, setItempicker] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setStatus(item.status);
      setItempicker(item.itempicker);
      setError(null);
    }
  }, [item]);

  const handleSave = async () => {
    if (!item) return;
    setSaving(true);
    setError(null);

    const { error } = await supabase
      .from("items")
      .update({ status, itempicker })
      .eq("id", item.id);

    if (error) {
      setError(error.message);
    } else {
      onSuccess();
      onClose();
    }
    setSaving(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-sm p-6">
      <h4 className="mb-1 text-base font-semibold text-gray-800 dark:text-white/90">
        Edit Item
      </h4>
      {item && (
        <p className="mb-6 text-xs text-gray-400 dark:text-gray-500 font-mono">
          {item.itemcode} — {item.itemname}
        </p>
      )}

      <div className="space-y-5">
        {/* Status */}
        <div>
          <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-0 dark:border-white/[0.1] dark:bg-white/[0.05] dark:text-gray-300"
          >
            <option value={1}>Active</option>
            <option value={2}>Inactive</option>
          </select>
        </div>

        {/* Item Picker */}
        <div className="flex items-center gap-3">
          <input
            id="itempicker-edit"
            type="checkbox"
            checked={itempicker}
            onChange={(e) => setItempicker(e.target.checked)}
            className="w-4 h-4 accent-brand-500 cursor-pointer"
          />
          <label
            htmlFor="itempicker-edit"
            className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            Show in Item Picker
          </label>
        </div>

        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </Modal>
  );
}
