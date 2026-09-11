"use client";

import { useState } from "react";
import Button from "@/components/ui/button/Button";
import { PlusIcon, TrashBinIcon } from "@/icons";
import type { ModifierGroupBaseItem } from "@/types/modifier";

type Props = {
  baseItems: ModifierGroupBaseItem[];
  onOpenAdd: () => void;
  onRemove: (id: number) => Promise<void>;
  loading: boolean;
};

export default function BaseItemsSection({
  baseItems,
  onOpenAdd,
  onRemove,
  loading,
}: Props) {
  const [removingId, setRemovingId] = useState<number | null>(null);

  const handleRemove = async (id: number) => {
    setRemovingId(id);
    try {
      await onRemove(id);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-gray-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
            Base Items
          </h4>
          <p className="text-xs text-gray-400">
            Original combo components that qualify for this modifier group ({baseItems.length})
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onOpenAdd} className="h-8 gap-1 text-xs">
          <PlusIcon className="w-3.5 h-3.5" />
          Add Base Items
        </Button>
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-gray-400">Loading base items...</div>
      ) : baseItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 dark:border-white/[0.08] py-6 text-center">
          <p className="text-xs text-gray-400">
            No base items attached to this group yet.
          </p>
          <button
            type="button"
            onClick={onOpenAdd}
            className="mt-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            + Attach base items now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
          {baseItems.map((bi) => {
            const item = bi.item;
            return (
              <div
                key={bi.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50/70 p-2.5 px-3 dark:border-white/[0.05] dark:bg-white/[0.02]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400">
                      {item?.itemcode || "—"}
                    </span>
                    <span className="text-xs font-medium text-gray-800 dark:text-white/90 truncate">
                      {item?.itemname || `Item #${bi.item_id}`}
                    </span>
                  </div>
                  {item?.price != null && (
                    <span className="text-[11px] text-gray-400">
                      {item.price.toLocaleString("vi-VN")} ₫
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  title="Remove item"
                  disabled={removingId === bi.id}
                  onClick={() => handleRemove(bi.id)}
                  className="rounded p-1 text-gray-400 hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/10 transition-colors"
                >
                  <TrashBinIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
