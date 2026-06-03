"use client";

import { useState, useEffect, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { useCreateItem, useCategories } from "@/hooks/useItems";
import { supabase } from "@/lib/supabase/supabaseClient";
import { toast } from "sonner";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

type CodeStatus = "idle" | "checking" | "available" | "taken";

const STATUS_OPTIONS = [
  { value: "1", label: "Active" },
  { value: "2", label: "Inactive" },
];

export default function CreateItemModal({ isOpen, onClose, onSuccess }: Props) {
  const [itemcode, setItemcode] = useState("");
  const [itemname, setItemname] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [status, setStatus] = useState<number>(1);
  const [itempicker, setItempicker] = useState<boolean>(false);
  const [codeStatus, setCodeStatus] = useState<CodeStatus>("idle");
  const [validationError, setValidationError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { createItem, saving } = useCreateItem();
  const { categories, loading: loadingCategories } = useCategories();

  const categoryOptions = [
    { value: "none", label: "— No category —" },
    ...categories.map((cat) => ({ value: String(cat.id), label: cat.Description })),
  ];

  // Debounced itemcode existence check
  useEffect(() => {
    const code = itemcode.trim();
    if (!code) {
      setCodeStatus("idle");
      return;
    }

    setCodeStatus("checking");
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from("items")
        .select("id")
        .eq("itemcode", code)
        .maybeSingle();

      setCodeStatus(data ? "taken" : "available");
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [itemcode]);

  const handleSave = async () => {
    setValidationError(null);
    if (!itemcode.trim()) {
      setValidationError("Item Code is required.");
      return;
    }
    if (codeStatus === "taken") {
      setValidationError("Item Code already exists.");
      return;
    }
    if (codeStatus === "checking") {
      setValidationError("Checking item code, please wait...");
      return;
    }
    if (!itemname.trim()) {
      setValidationError("Item Name is required.");
      return;
    }

    const ok = await createItem({ itemcode, itemname, price, status, itempicker, category: categoryId });
    if (ok) {
      toast.success(`Item "${itemcode.trim()}" created successfully.`);
      onSuccess();
      onClose();
    } else {
      toast.error("Failed to create item. Please try again.");
    }
  };

  const codeHint = {
    idle: null,
    checking: <span className="text-xs text-gray-400">Checking...</span>,
    available: <span className="text-xs text-green-500">✓ Available</span>,
    taken: <span className="text-xs text-red-400">✗ Item code already exists</span>,
  }[codeStatus];

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-sm p-6">
      <h4 className="mb-6 text-base font-semibold text-gray-800 dark:text-white/90">
        New Item
      </h4>

      <div className="space-y-5">

        {/* Item Code */}
        <div>
          <Label htmlFor="create-itemcode">Item Code</Label>
          <Input
            id="create-itemcode"
            type="text"
            placeholder="e.g. 300001"
            value={itemcode}
            onChange={(e) => setItemcode(e.target.value)}
            error={codeStatus === "taken"}
            success={codeStatus === "available"}
          />
          {codeHint && <div className="mt-1">{codeHint}</div>}
        </div>

        {/* Item Name */}
        <div>
          <Label htmlFor="create-itemname">Item Name</Label>
          <Input
            id="create-itemname"
            type="text"
            placeholder="e.g. Burger Zinger"
            value={itemname}
            onChange={(e) => setItemname(e.target.value)}
          />
        </div>

        {/* Price */}
        <div>
          <Label htmlFor="create-price">Price (VND)</Label>
          <Input
            id="create-price"
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
            options={categoryOptions}
            defaultValue="none"
            placeholder={loadingCategories ? "Loading..." : "Select category"}
            onChange={(val) => setCategoryId(val === "none" ? null : Number(val))}
          />
        </div>

        {/* Status */}
        <div>
          <Label>Status</Label>
          <Select
            options={STATUS_OPTIONS}
            defaultValue="1"
            placeholder="Select status"
            onChange={(val) => setStatus(Number(val))}
          />
        </div>

        {/* Item Picker */}
        <div className="flex items-center gap-3">
          <input
            id="create-itempicker"
            type="checkbox"
            checked={itempicker}
            onChange={(e) => setItempicker(e.target.checked)}
            className="w-4 h-4 accent-brand-500 cursor-pointer"
          />
          <Label htmlFor="create-itempicker" className="mb-0 cursor-pointer">
            Show in Item Picker
          </Label>
        </div>

        {validationError && (
          <p className="text-xs text-red-400">{validationError}</p>
        )}

      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || codeStatus === "taken" || codeStatus === "checking"}
        >
          {saving ? "Creating..." : "Create"}
        </Button>
      </div>
    </Modal>
  );
}
