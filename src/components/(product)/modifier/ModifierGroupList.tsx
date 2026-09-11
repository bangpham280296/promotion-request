"use client";

import { useState, useMemo } from "react";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { PencilIcon, TrashBinIcon, PlusIcon } from "@/icons";
import type { ModifierGroupSummary } from "@/types/modifier";

type Props = {
  groups: ModifierGroupSummary[];
  selectedGroup: ModifierGroupSummary | null;
  onSelectGroup: (group: ModifierGroupSummary) => void;
  onOpenCreate: () => void;
  onOpenEdit: (group: ModifierGroupSummary) => void;
  onDeleteGroup: (id: number) => void;
  loading: boolean;
};

const STATUS_FILTERS = [
  { value: "all", label: "All Status" },
  { value: "1", label: "Active" },
  { value: "0", label: "Inactive" },
];

export default function ModifierGroupList({
  groups,
  selectedGroup,
  onSelectGroup,
  onOpenCreate,
  onOpenEdit,
  onDeleteGroup,
  loading,
}: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      const matchSearch =
        search.trim() === "" ||
        g.group_name.toLowerCase().includes(search.toLowerCase()) ||
        (g.description && g.description.toLowerCase().includes(search.toLowerCase()));

      const matchStatus =
        statusFilter === "all" || String(g.status) === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [groups, search, statusFilter]);

  return (
    <div className="flex flex-col h-full rounded-2xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-gray-900 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-white/[0.08] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-white/90 text-sm">
              Modifier Groups
            </h3>
            <p className="text-xs text-gray-400">
              {groups.length} {groups.length === 1 ? "group" : "groups"} configured
            </p>
          </div>
          <Button size="sm" onClick={onOpenCreate} className="h-8 gap-1 text-xs">
            <PlusIcon className="w-3.5 h-3.5" />
            New Group
          </Button>
        </div>

        {/* Search & Filter */}
        <div className="grid grid-cols-5 gap-2">
          <div className="col-span-3">
            <Input
              type="text"
              placeholder="Search groups..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
          <div className="col-span-2">
            <Select
              options={STATUS_FILTERS}
              defaultValue="all"
              onChange={(val) => setStatusFilter(val)}
            />
          </div>
        </div>
      </div>

      {/* List content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[calc(100vh-280px)]">
        {loading && groups.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-400">
            Loading modifier groups...
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-400">
            {search || statusFilter !== "all"
              ? "No modifier groups match your filter."
              : "No modifier groups yet. Click 'New Group' to start."}
          </div>
        ) : (
          filteredGroups.map((g) => {
            const isSelected = selectedGroup?.id === g.id;
            const isConfirmingDelete = deleteConfirmId === g.id;

            return (
              <div
                key={g.id}
                onClick={() => onSelectGroup(g)}
                className={`group relative cursor-pointer rounded-xl border p-3.5 transition-all ${
                  isSelected
                    ? "border-brand-500 bg-brand-50/40 dark:border-brand-500/80 dark:bg-brand-500/10 shadow-sm"
                    : "border-gray-100 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-100/60 dark:border-white/[0.05] dark:bg-white/[0.02] dark:hover:border-white/[0.1] dark:hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4
                        className={`text-sm font-semibold truncate ${
                          isSelected
                            ? "text-brand-700 dark:text-brand-300"
                            : "text-gray-800 dark:text-white/90"
                        }`}
                      >
                        {g.group_name}
                      </h4>
                      <Badge
                        size="sm"
                        color={g.status === 1 ? "success" : "light"}
                      >
                        {g.status === 1 ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    {g.description && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                        {g.description}
                      </p>
                    )}

                    <div className="mt-2.5 flex items-center gap-2 text-[11px] text-gray-400">
                      <span className="rounded bg-gray-200/60 px-1.5 py-0.5 font-medium dark:bg-white/[0.06] text-gray-600 dark:text-gray-300">
                        {g.base_item_count} Base Items
                      </span>
                      <span>•</span>
                      <span className="rounded bg-gray-200/60 px-1.5 py-0.5 font-medium dark:bg-white/[0.06] text-gray-600 dark:text-gray-300">
                        {g.target_item_count} Trade-Up
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    className="flex items-center gap-1 opacity-80 group-hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      title="Edit group"
                      onClick={() => onOpenEdit(g)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-white/[0.1] dark:hover:text-white"
                    >
                      <PencilIcon className="w-3.5 h-3.5" />
                    </button>

                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1 bg-white dark:bg-gray-800 p-1 rounded shadow-lg border border-error-200 z-10">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteGroup(g.id);
                            setDeleteConfirmId(null);
                          }}
                          className="px-1.5 py-0.5 text-[10px] font-semibold text-white bg-error-500 rounded hover:bg-error-600"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-1.5 py-0.5 text-[10px] text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        title="Delete group"
                        onClick={() => setDeleteConfirmId(g.id)}
                        className="rounded p-1 text-gray-400 hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/10"
                      >
                        <TrashBinIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
