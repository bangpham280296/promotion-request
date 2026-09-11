"use client";

import { useState } from "react";
import Button from "@/components/ui/button/Button";
import { DownloadIcon, ArrowUpIcon, PlusIcon } from "@/icons";
import { useModifierMatrix } from "@/hooks/useModifierMatrix";
import ModifierGroupList from "./ModifierGroupList";
import ModifierDetailWorkspace from "./ModifierDetailWorkspace";
import ModifierGroupModal from "./ModifierGroupModal";
import ModifierImportModal from "./ModifierImportModal";
import { exportModifierMatrixToExcel } from "@/lib/excel/modifierExcel";
import { supabase } from "@/lib/supabase/supabaseClient";
import type { ModifierGroupSummary } from "@/types/modifier";
import { toast } from "sonner";

export default function ModifierMatrixContainer() {
  const {
    groups,
    selectedGroup,
    setSelectedGroup,
    baseItems,
    targetItems,
    loading,
    detailLoading,
    fetchGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    addBaseItems,
    removeBaseItem,
    addTargetItem,
    updateTargetItemSurcharge,
    toggleTargetItemActive,
    removeTargetItem,
  } = useModifierMatrix();

  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ModifierGroupSummary | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Group Create / Edit Handlers
  const handleOpenCreateGroup = () => {
    setEditingGroup(null);
    setGroupModalOpen(true);
  };

  const handleOpenEditGroup = (g: ModifierGroupSummary) => {
    setEditingGroup(g);
    setGroupModalOpen(true);
  };

  const handleSaveGroup = async (data: {
    group_name: string;
    description?: string;
    status?: number;
  }) => {
    if (editingGroup) {
      await updateGroup(editingGroup.id, data);
    } else {
      await createGroup(data);
    }
  };

  // Export to Excel Handler
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const { data: allGroups, error } = await supabase
        .from("modifier_groups")
        .select(`
          id,
          group_name,
          description,
          status,
          modifier_group_base_items(item:items(itemcode)),
          modifier_group_items(surcharge_price, is_active, item:items(itemcode))
        `)
        .order("id", { ascending: false });

      if (error) throw error;

      if (!allGroups || allGroups.length === 0) {
        toast.error("No modifier groups found to export.");
        return;
      }

      const formatted = allGroups.map((g: any) => ({
        group_name: g.group_name,
        description: g.description,
        status: g.status,
        base_items: (g.modifier_group_base_items || [])
          .map((bi: any) => bi.item?.itemcode)
          .filter(Boolean),
        target_items: (g.modifier_group_items || [])
          .map((ti: any) => ({
            itemcode: ti.item?.itemcode || "",
            surcharge_price: ti.surcharge_price,
            is_active: ti.is_active,
          }))
          .filter((ti: any) => Boolean(ti.itemcode)),
      }));

      await exportModifierMatrixToExcel(formatted);
      toast.success("Exported Modifier Matrix successfully.");
    } catch (err: any) {
      console.error("Export error:", err);
      toast.error(err.message || "Failed to export Excel.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-800 dark:text-white/90">
            Modifier Matrix Management
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Global catalog for item trade-up, upsize rules, and surcharge pricing
          </p>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setImportModalOpen(true)}
            className="h-9 gap-1.5 text-xs"
          >
            <ArrowUpIcon className="w-3.5 h-3.5" />
            Import Excel
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={exporting || groups.length === 0}
            className="h-9 gap-1.5 text-xs"
          >
            <DownloadIcon className="w-3.5 h-3.5" />
            {exporting ? "Exporting..." : "Export Excel"}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleOpenCreateGroup}
            className="h-9 gap-1.5 text-xs"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            New Group
          </Button>
        </div>
      </div>

      {/* Two-Column Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Groups List (Master ~35%) */}
        <div className="lg:col-span-4">
          <ModifierGroupList
            groups={groups}
            selectedGroup={selectedGroup}
            onSelectGroup={setSelectedGroup}
            onOpenCreate={handleOpenCreateGroup}
            onOpenEdit={handleOpenEditGroup}
            onDeleteGroup={deleteGroup}
            loading={loading}
          />
        </div>

        {/* Right Column: Configuration Workspace (Detail ~65%) */}
        <div className="lg:col-span-8">
          <ModifierDetailWorkspace
            group={selectedGroup}
            baseItems={baseItems}
            targetItems={targetItems}
            onAddBaseItems={addBaseItems}
            onRemoveBaseItem={removeBaseItem}
            onAddTargetItem={addTargetItem}
            onUpdateSurcharge={updateTargetItemSurcharge}
            onToggleTargetActive={toggleTargetItemActive}
            onRemoveTargetItem={removeTargetItem}
            loading={detailLoading}
          />
        </div>
      </div>

      {/* Group Create/Edit Modal */}
      <ModifierGroupModal
        isOpen={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        onSave={handleSaveGroup}
        group={editingGroup}
      />

      {/* Excel Import Modal */}
      <ModifierImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => fetchGroups()}
      />
    </div>
  );
}
