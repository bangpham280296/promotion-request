"use client";

import { useState } from "react";
import Badge from "@/components/ui/badge/Badge";
import BaseItemsSection from "./BaseItemsSection";
import TradeUpItemsSection from "./TradeUpItemsSection";
import AddBaseItemModal from "./AddBaseItemModal";
import AddTradeUpItemModal from "./AddTradeUpItemModal";
import type {
  ModifierGroupSummary,
  ModifierGroupBaseItem,
  ModifierGroupItem,
} from "@/types/modifier";

type Props = {
  group: ModifierGroupSummary | null;
  baseItems: ModifierGroupBaseItem[];
  targetItems: ModifierGroupItem[];
  onAddBaseItems: (groupId: number, itemIds: number[]) => Promise<void>;
  onRemoveBaseItem: (id: number) => Promise<void>;
  onAddTargetItem: (groupId: number, itemId: number, surcharge: number) => Promise<void>;
  onUpdateSurcharge: (id: number, surcharge: number) => Promise<void>;
  onToggleTargetActive: (id: number, isActive: boolean) => Promise<void>;
  onRemoveTargetItem: (id: number) => Promise<void>;
  loading: boolean;
};

export default function ModifierDetailWorkspace({
  group,
  baseItems,
  targetItems,
  onAddBaseItems,
  onRemoveBaseItem,
  onAddTargetItem,
  onUpdateSurcharge,
  onToggleTargetActive,
  onRemoveTargetItem,
  loading,
}: Props) {
  const [showAddBaseModal, setShowAddBaseModal] = useState(false);
  const [showAddTargetModal, setShowAddTargetModal] = useState(false);

  if (!group) {
    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-white/[0.08] dark:bg-gray-900 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-500 mb-3">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h4 className="text-base font-semibold text-gray-800 dark:text-white">
          No Modifier Group Selected
        </h4>
        <p className="mt-1 max-w-sm text-xs text-gray-400">
          Select a modifier group from the list on the left to configure its base products and trade-up price matrix.
        </p>
      </div>
    );
  }

  const existingBaseItemIds = baseItems.map((bi) => bi.item_id);
  const existingTargetItemIds = targetItems.map((ti) => ti.item_id);

  return (
    <div className="flex flex-col space-y-4">
      {/* Workspace Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.08] dark:bg-gray-900 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                {group.group_name}
              </h2>
              <Badge color={group.status === 1 ? "success" : "light"}>
                {group.status === 1 ? "Active" : "Inactive"}
              </Badge>
            </div>
            {group.description && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {group.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <div>
              <span className="text-gray-400">Created: </span>
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {new Date(group.created_at).toLocaleDateString("vi-VN")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 1: Base Items */}
      <BaseItemsSection
        baseItems={baseItems}
        onOpenAdd={() => setShowAddBaseModal(true)}
        onRemove={onRemoveBaseItem}
        loading={loading}
      />

      {/* Section 2: Trade-Up Items & Surcharges */}
      <TradeUpItemsSection
        targetItems={targetItems}
        onOpenAdd={() => setShowAddTargetModal(true)}
        onUpdateSurcharge={onUpdateSurcharge}
        onToggleActive={onToggleTargetActive}
        onRemove={onRemoveTargetItem}
        loading={loading}
      />

      {/* Add Base Item Modal */}
      <AddBaseItemModal
        isOpen={showAddBaseModal}
        onClose={() => setShowAddBaseModal(false)}
        onAdd={(itemIds) => onAddBaseItems(group.id, itemIds)}
        existingItemIds={existingBaseItemIds}
        groupName={group.group_name}
      />

      {/* Add Trade-Up Item Modal */}
      <AddTradeUpItemModal
        isOpen={showAddTargetModal}
        onClose={() => setShowAddTargetModal(false)}
        onAdd={(itemId, surcharge) => onAddTargetItem(group.id, itemId, surcharge)}
        existingItemIds={existingTargetItemIds}
        groupName={group.group_name}
      />
    </div>
  );
}
