"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { useUpdateItem, useCategories } from "@/hooks/useItems";
import type { AllItem } from "@/hooks/useItems";
import { toast } from "sonner";

type Props = {
  isOpen: boolean;
  item: AllItem | null;
  onClose: () => void;
  onSuccess: () => void;
};

const STATUS_OPTIONS = [
  { value: "1", label: "Active" },
  { value: "2", label: "Inactive" },
];

export default function ItemEditModal({ isOpen, item, onClose, onSuccess }: Props) {
  const [status, setStatus] = useState<number>(1);
  const [itempicker, setItempicker] = useState<boolean>(false);
  const [price, setPrice] = useState<number>(0);
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const { updateItem, saving, setError } = useUpdateItem();
  const { categories, loading: loadingCategories } = useCategories();

  useEffect(() => {
    if (item) {
      setStatus(item.status);
      setItempicker(item.itempicker);
      setPrice(item.price);
      setCategoryId(item.category?.id ?? null);
      setError(null);
    }
  }, [item, setError]);

  const handleSave = async () => {
    if (!item) return;
    const ok = await updateItem(item.id, { status, itempicker, price, category: categoryId });
    if (ok) {
      toast.success(`Item "${item.itemcode}" updated successfully.`);
      onSuccess();
      onClose();
    } else {
      toast.error("Failed to update item. Please try again.");
    }
  };

  const categoryOptions = [
    { value: "none", label: "— No category —" },
    ...categories.map((cat) => ({ value: String(cat.id), label: cat.Description })),
  ];

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

        {/* Price */}
        <div>
          <Label htmlFor="price-edit">Price (VND)</Label>
          <Input
            id="price-edit"
            type="number"
            min="0"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
        </div>

        {/* Category */}
        <div>
          <Label>Category</Label>
          <Select
            key={`cat-${item?.id}`}
            options={categoryOptions}
            defaultValue={item?.category?.id != null ? String(item.category.id) : "none"}
            placeholder={loadingCategories ? "Loading..." : "Select category"}
            onChange={(val) => setCategoryId(val === "none" ? null : Number(val))}
          />
        </div>

        {/* Status */}
        <div>
          <Label>Status</Label>
          <Select
            key={`status-${item?.id}`}
            options={STATUS_OPTIONS}
            defaultValue={item ? String(item.status) : "1"}
            placeholder="Select status"
            onChange={(val) => setStatus(Number(val))}
          />
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
          <Label htmlFor="itempicker-edit" className="mb-0 cursor-pointer">
            Show in Item Picker
          </Label>
        </div>



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
