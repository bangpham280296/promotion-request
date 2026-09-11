"use client";

import { useState } from "react";
import Button from "@/components/ui/button/Button";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { PlusIcon, TrashBinIcon } from "@/icons";
import InlineSurchargeEdit from "./InlineSurchargeEdit";
import type { ModifierGroupItem } from "@/types/modifier";

type Props = {
  targetItems: ModifierGroupItem[];
  onOpenAdd: () => void;
  onUpdateSurcharge: (id: number, surcharge: number) => Promise<void>;
  onToggleActive: (id: number, isActive: boolean) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
  loading: boolean;
};

export default function TradeUpItemsSection({
  targetItems,
  onOpenAdd,
  onUpdateSurcharge,
  onToggleActive,
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
            Trade-Up Items & Surcharges
          </h4>
          <p className="text-xs text-gray-400">
            Replacement options and additional prices for customers choosing this modifier ({targetItems.length})
          </p>
        </div>
        <Button size="sm" onClick={onOpenAdd} className="h-8 gap-1 text-xs">
          <PlusIcon className="w-3.5 h-3.5" />
          Add Trade-Up Item
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-gray-400">Loading trade-up items...</div>
      ) : targetItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 dark:border-white/[0.08] py-10 text-center">
          <p className="text-xs text-gray-400">
            No trade-up options configured for this group yet.
          </p>
          <button
            type="button"
            onClick={onOpenAdd}
            className="mt-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            + Add first trade-up item
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-white/[0.05]">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-100 bg-gray-50/75 dark:border-white/[0.05] dark:bg-white/[0.02]">
                <TableCell isHeader className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 w-12">
                  #
                </TableCell>
                <TableCell isHeader className="px-3 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 w-28">
                  Item Code
                </TableCell>
                <TableCell isHeader className="px-3 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Target Product Name
                </TableCell>
                <TableCell isHeader className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 w-36">
                  Catalog Price
                </TableCell>
                <TableCell isHeader className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 w-44">
                  Surcharge Price
                </TableCell>
                <TableCell isHeader className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 w-24">
                  Status
                </TableCell>
                <TableCell isHeader className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 w-16">
                  Action
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {targetItems.map((ti, index) => {
                const item = ti.item;

                return (
                  <TableRow
                    key={ti.id}
                    className={`transition-colors hover:bg-gray-50/50 dark:hover:bg-white/[0.02] ${
                      !ti.is_active ? "opacity-60 bg-gray-50/30 dark:bg-white/[0.01]" : ""
                    }`}
                  >
                    <TableCell className="px-3 py-2 text-center text-xs text-gray-400 font-mono">
                      {index + 1}
                    </TableCell>

                    <TableCell className="px-3 py-2 font-mono text-xs font-semibold text-gray-700 dark:text-gray-200">
                      {item?.itemcode || "—"}
                    </TableCell>

                    <TableCell className="px-3 py-2 text-xs text-gray-800 dark:text-gray-100 font-medium">
                      {item?.itemname || `Item #${ti.item_id}`}
                      {item?.category && (
                        <span className="block text-[10px] text-gray-400 font-normal">
                          {item.category.Description}
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="px-3 py-2 text-right text-xs text-gray-500 dark:text-gray-400">
                      {item?.price != null ? `${item.price.toLocaleString("vi-VN")} ₫` : "—"}
                    </TableCell>

                    <TableCell className="px-3 py-2 text-right">
                      <div className="flex justify-end">
                        <InlineSurchargeEdit
                          value={ti.surcharge_price}
                          onSave={(newSurcharge) => onUpdateSurcharge(ti.id, newSurcharge)}
                        />
                      </div>
                    </TableCell>

                    <TableCell className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => onToggleActive(ti.id, !ti.is_active)}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                          ti.is_active
                            ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400 hover:bg-success-100"
                            : "bg-gray-100 text-gray-500 dark:bg-white/[0.05] dark:text-gray-400 hover:bg-gray-200"
                        }`}
                        title={ti.is_active ? "Click to disable" : "Click to enable"}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                            ti.is_active ? "bg-success-500" : "bg-gray-400"
                          }`}
                        />
                        {ti.is_active ? "Active" : "Off"}
                      </button>
                    </TableCell>

                    <TableCell className="px-3 py-2 text-center">
                      <button
                        type="button"
                        title="Remove trade-up item"
                        disabled={removingId === ti.id}
                        onClick={() => handleRemove(ti.id)}
                        className="rounded p-1 text-gray-400 hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/10 transition-colors"
                      >
                        <TrashBinIcon className="w-3.5 h-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
