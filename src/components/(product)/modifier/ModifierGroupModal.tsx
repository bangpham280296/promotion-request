"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import type { ModifierGroupSummary } from "@/types/modifier";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { group_name: string; description?: string; status?: number }) => Promise<any>;
  group?: ModifierGroupSummary | null;
};

const STATUS_OPTIONS = [
  { value: "1", label: "Active" },
  { value: "0", label: "Inactive" },
];

export default function ModifierGroupModal({ isOpen, onClose, onSave, group }: Props) {
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (group) {
      setGroupName(group.group_name);
      setDescription(group.description || "");
      setStatus(group.status);
    } else {
      setGroupName("");
      setDescription("");
      setStatus(1);
    }
    setError(null);
  }, [group, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setError("Group name is required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        group_name: groupName.trim(),
        description: description.trim() || undefined,
        status,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save group");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          {group ? "Edit Modifier Group" : "Create Modifier Group"}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {group
            ? "Update group name, description, and operational status."
            : "Define a new modifier rule group for combo trade-up components."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>
            Group Name <span className="text-error-500">*</span>
          </Label>
          <Input
            type="text"
            placeholder="e.g. Drink Upsize (STD to LRG)"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            disabled={saving}
          />
        </div>

        <div>
          <Label>Description</Label>
          <textarea
            className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-gray-900 dark:text-white"
            rows={3}
            placeholder="Optional description of the trade-up rule or eligibility..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={saving}
          />
        </div>

        <div>
          <Label>Status</Label>
          <Select
            options={STATUS_OPTIONS}
            defaultValue={String(status)}
            onChange={(val) => setStatus(Number(val))}
          />
        </div>

        {error && (
          <div className="rounded-lg bg-error-50 p-3 text-xs text-error-600 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Saving..." : group ? "Update Group" : "Create Group"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
