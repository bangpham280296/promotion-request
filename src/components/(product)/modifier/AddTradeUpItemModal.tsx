"use client";

import { useState, useEffect, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { supabase } from "@/lib/supabase/supabaseClient";
import type { AllItem } from "@/hooks/useItems";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (itemId: number, surcharge: number) => Promise<void>;
  existingItemIds: number[];
  groupName: string;
};

export default function AddTradeUpItemModal({
  isOpen,
  onClose,
  onAdd,
  existingItemIds,
  groupName,
}: Props) {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<AllItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AllItem | null>(null);
  const [surcharge, setSurcharge] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchItems = async (keyword: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from("items")
        .select("id, itemcode, itemname, price, status, itempicker, category:category(id, Description)")
        .order("itemname", { ascending: true })
        .limit(50);

      if (keyword.trim()) {
        query = query.or(`itemname.ilike.%${keyword.trim()}%,itemcode.ilike.%${keyword.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setItems((data as unknown as AllItem[]) || []);
    } catch (err) {
      console.error("Error fetching trade-up candidates:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedItem(null);
      setSurcharge(0);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setSaving(true);
    try {
      await onAdd(selectedItem.id, Math.max(0, surcharge));
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Add Trade-Up Item
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Select a replacement or upsize product for:{" "}
          <span className="font-semibold text-gray-700 dark:text-gray-200">
            {groupName}
          </span>
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Step 1: Select item */}
        <div>
          <Label>
            Select Target Product <span className="text-error-500">*</span>
          </Label>
          <Input
            type="text"
            placeholder="Type to search candidate items..."
            value={search}
            onChange={handleSearchChange}
            className="h-9 text-xs mb-2"
          />

          <div className="h-44 overflow-y-auto rounded-lg border border-gray-200 dark:border-white/[0.08] divide-y divide-gray-100 dark:divide-white/[0.05]">
            {loading ? (
              <div className="py-8 text-center text-xs text-gray-400">Loading...</div>
            ) : items.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">No items found.</div>
            ) : (
              items.map((it) => {
                const isExisting = existingItemIds.includes(it.id);
                const isSelected = selectedItem?.id === it.id;

                return (
                  <div
                    key={it.id}
                    onClick={() => !isExisting && setSelectedItem(it)}
                    className={`flex items-center justify-between p-2 px-3 text-xs ${
                      isExisting
                        ? "opacity-50 cursor-not-allowed bg-gray-50 dark:bg-white/[0.01]"
                        : isSelected
                        ? "bg-brand-50/60 dark:bg-brand-500/20 font-semibold cursor-pointer text-brand-700 dark:text-brand-300"
                        : "hover:bg-gray-50 dark:hover:bg-white/[0.03] cursor-pointer"
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="font-mono font-medium mr-2">{it.itemcode}</span>
                      <span>{it.itemname}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">
                        {it.price ? it.price.toLocaleString("vi-VN") + " ₫" : "0 ₫"}
                      </span>
                      {isExisting && (
                        <span className="text-[10px] text-gray-400">Added</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected preview & surcharge input */}
        {selectedItem && (
          <div className="rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] p-3 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div>
                <p className="text-gray-400">Selected Product:</p>
                <p className="font-semibold text-gray-800 dark:text-white">
                  {selectedItem.itemcode} — {selectedItem.itemname}
                </p>
              </div>
              <div className="text-right">
                <p className="text-gray-400">Standard Price:</p>
                <p className="font-semibold text-gray-800 dark:text-white">
                  {selectedItem.price ? selectedItem.price.toLocaleString("vi-VN") + " ₫" : "0 ₫"}
                </p>
              </div>
            </div>

            <div>
              <Label>
                Surcharge Price (VNĐ) <span className="text-error-500">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                step={500}
                placeholder="e.g. 5000 (enter 0 for free modifier)"
                value={surcharge}
                onChange={(e) => setSurcharge(Number(e.target.value))}
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Extra charge added to the combo price when the customer chooses this option.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
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
            type="submit"
            size="sm"
            disabled={saving || !selectedItem}
          >
            {saving ? "Adding..." : "Add Trade-Up Item"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
