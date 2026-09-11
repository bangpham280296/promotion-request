"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import { supabase } from "@/lib/supabase/supabaseClient";
import type { AllItem } from "@/hooks/useItems";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (itemIds: number[]) => Promise<void>;
  existingItemIds: number[];
  groupName: string;
};

export default function AddBaseItemModal({
  isOpen,
  onClose,
  onAdd,
  existingItemIds,
  groupName,
}: Props) {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<AllItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchItems = async (keyword: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from("items")
        .select("id, itemcode, itemname, price, status, itempicker, category:category(id, Description)")
        .order("itemname", { ascending: true })
        .limit(60);

      if (keyword.trim()) {
        query = query.or(`itemname.ilike.%${keyword.trim()}%,itemcode.ilike.%${keyword.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setItems((data as unknown as AllItem[]) || []);
    } catch (err) {
      console.error("Error fetching items for picker:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedIds([]);
      setSearch("");
      fetchItems("");
    }
  }, [isOpen]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchItems(val);
    }, 250);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const available = items
      .filter((it) => !existingItemIds.includes(it.id))
      .map((it) => it.id);
    setSelectedIds((prev) => Array.from(new Set([...prev, ...available])));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleSave = async () => {
    if (selectedIds.length === 0) return;
    setSaving(true);
    try {
      await onAdd(selectedIds);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Add Base Items
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Select base combo products that will trigger modifier options in:{" "}
          <span className="font-semibold text-gray-700 dark:text-gray-200">
            {groupName}
          </span>
        </p>
      </div>

      {/* Search and bulk select bar */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search by item code or product name..."
            value={search}
            onChange={handleSearchChange}
            className="h-9 text-xs"
          />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={handleSelectAllFiltered}
            className="text-brand-600 hover:text-brand-700 dark:text-brand-400 font-medium"
          >
            Select All
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={handleDeselectAll}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Item list */}
      <div className="h-80 overflow-y-auto rounded-xl border border-gray-200 dark:border-white/[0.08] divide-y divide-gray-100 dark:divide-white/[0.05]">
        {loading ? (
          <div className="py-12 text-center text-xs text-gray-400">
            Searching products...
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-400">
            No products found.
          </div>
        ) : (
          items.map((item) => {
            const isExisting = existingItemIds.includes(item.id);
            const isChecked = selectedIds.includes(item.id);

            return (
              <label
                key={item.id}
                className={`flex items-center justify-between p-2.5 px-3 transition-colors ${
                  isExisting
                    ? "opacity-50 cursor-not-allowed bg-gray-50/70 dark:bg-white/[0.01]"
                    : isChecked
                    ? "bg-brand-50/40 dark:bg-brand-500/10 cursor-pointer"
                    : "hover:bg-gray-50 dark:hover:bg-white/[0.03] cursor-pointer"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    type="checkbox"
                    disabled={isExisting}
                    checked={isChecked || isExisting}
                    onChange={() => !isExisting && toggleSelect(item.id)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-white/[0.2] dark:bg-gray-800"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-200">
                        {item.itemcode}
                      </span>
                      <span className="text-xs text-gray-800 dark:text-gray-100 truncate">
                        {item.itemname}
                      </span>
                    </div>
                    {item.category && (
                      <span className="text-[11px] text-gray-400">
                        {item.category.Description}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pl-3">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    {item.price ? item.price.toLocaleString("vi-VN") + " ₫" : "0 ₫"}
                  </span>
                  {isExisting && (
                    <span className="text-[10px] uppercase font-semibold text-gray-400 bg-gray-100 dark:bg-white/[0.05] px-1.5 py-0.5 rounded">
                      Already in group
                    </span>
                  )}
                </div>
              </label>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {selectedIds.length} item(s) selected
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving || selectedIds.length === 0}
          >
            {saving ? "Adding..." : `Add Selected (${selectedIds.length})`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
