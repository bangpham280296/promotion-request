// src/components/voucherify/DiscountMetadataModal.tsx
"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import TextArea from "@/components/form/input/TextArea";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import {
  type DiscountMetadata,
  EMPTY_DISCOUNT_METADATA,
  DISCOUNT_OR_EGC_OPTIONS,
  CAMPAIGN_TYPE_META_OPTIONS,
} from "@/types/discount-metadata";
import { formatThumbnailUrl } from "@/lib/voucherify/utils";

interface Props {
  isOpen: boolean;
  initialValue: DiscountMetadata | null;
  onSave: (metadata: DiscountMetadata) => void;
  onClose: () => void;
}

export default function DiscountMetadataModal({ isOpen, initialValue, onSave, onClose }: Props) {
  const [form, setForm] = useState<DiscountMetadata>(initialValue ?? EMPTY_DISCOUNT_METADATA);
  const [showIntegration, setShowIntegration] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(initialValue ?? EMPTY_DISCOUNT_METADATA);
      setShowIntegration(false);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const set = <K extends keyof DiscountMetadata>(field: K, value: DiscountMetadata[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const setNumber = (field: keyof DiscountMetadata, raw: string) =>
    set(field, (raw === "" ? undefined : Number(raw)) as never);

  const handleSave = () => {
    if (!form.title_en.trim() || !form.title_vi.trim()) {
      toast.error("Title (EN) and Title (VI) are required.", { position: "top-center" });
      return;
    }
    if (!form.short_description_en.trim() || !form.short_description_vi.trim()) {
      toast.error("Short Description (EN) and (VI) are required.", { position: "top-center" });
      return;
    }
    const formattedThumbnail = formatThumbnailUrl(form.thumbnail);
    const sanitizedForm: DiscountMetadata = {
      ...form,
      thumbnail: formattedThumbnail ?? "",
    };
    onSave(sanitizedForm);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 dark:border-white/[0.05] flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white">Voucherify Metadata</h2>
        </div>

        <div className="px-6 py-5 space-y-6 overflow-y-auto min-h-0">
          {/* Group 1: Nội dung hiển thị */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Nội dung hiển thị</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Title (EN) *</Label>
                <Input type="text" value={form.title_en} onChange={(e) => set("title_en", e.target.value)} />
              </div>
              <div>
                <Label>Title (VI) *</Label>
                <Input type="text" value={form.title_vi} onChange={(e) => set("title_vi", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Short Description (EN) *</Label>
                <TextArea rows={2} value={form.short_description_en} onChange={(v) => set("short_description_en", v)} />
              </div>
              <div>
                <Label>Short Description (VI) *</Label>
                <TextArea rows={2} value={form.short_description_vi} onChange={(v) => set("short_description_vi", v)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Long Description / T&C (EN)</Label>
                <TextArea rows={4} value={form.long_description_en ?? ""} onChange={(v) => set("long_description_en", v)} />
              </div>
              <div>
                <Label>Long Description / T&C (VI)</Label>
                <TextArea rows={4} value={form.long_description_vi ?? ""} onChange={(v) => set("long_description_vi", v)} />
              </div>
            </div>
            <div>
              <Label>Thumbnail URL</Label>
              <Input type="text" placeholder="https://... hoặc link Google Drive" value={form.thumbnail ?? ""} onChange={(e) => set("thumbnail", e.target.value)} />
              <p className="mt-1 text-[11px] text-gray-400">
                Nhập link ảnh trực tiếp (.jpg, .png) hoặc link Google Drive (sẽ tự động chuyển đổi sang link ảnh trực tiếp).
              </p>
            </div>
          </div>

          {/* Group 2: Phân loại chiến dịch */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Phân loại chiến dịch</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Discount or EGC</Label>
                <Select
                  options={DISCOUNT_OR_EGC_OPTIONS}
                  defaultValue={form.discount_or_egc}
                  onChange={(val) => set("discount_or_egc", val)}
                />
              </div>
              <div>
                <Label>Program Name</Label>
                <Input type="text" value={form.program_name ?? ""} onChange={(e) => set("program_name", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Campaign Type</Label>
                <Select
                  options={CAMPAIGN_TYPE_META_OPTIONS}
                  defaultValue={form.campaign_type ?? ""}
                  onChange={(val) => set("campaign_type", val as DiscountMetadata["campaign_type"])}
                />
              </div>
              <div>
                <Label>Campaign Type (POS)</Label>
                <Select
                  options={CAMPAIGN_TYPE_META_OPTIONS}
                  defaultValue={form.campaign_type_pos ?? ""}
                  onChange={(val) => set("campaign_type_pos", val as DiscountMetadata["campaign_type_pos"])}
                />
              </div>
              <div>
                <Label>Campaign Type (Non-POS)</Label>
                <Select
                  options={CAMPAIGN_TYPE_META_OPTIONS}
                  defaultValue={form.campaign_type_nonpos ?? ""}
                  onChange={(val) => set("campaign_type_nonpos", val as DiscountMetadata["campaign_type_nonpos"])}
                />
              </div>
            </div>
            <div className="w-40">
              <Label>Display Priority</Label>
              <Input
                type="number"
                min="1"
                value={form.display_priority ?? ""}
                onChange={(e) => setNumber("display_priority", e.target.value)}
              />
            </div>
          </div>

          {/* Group 3: Tích hợp POS/Loyalty (collapsed by default) */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowIntegration((v) => !v)}
              className="text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-brand-500 transition-colors"
            >
              {showIntegration ? "▾" : "▸"} Tích hợp POS/Loyalty (optional)
            </button>
            {showIntegration && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Aloha ID</Label>
                    <Input type="number" value={form.aloha_id ?? ""} onChange={(e) => setNumber("aloha_id", e.target.value)} />
                  </div>
                  <div>
                    <Label>Aloha ID (POS)</Label>
                    <Input type="number" value={form.aloha_id_pos ?? ""} onChange={(e) => setNumber("aloha_id_pos", e.target.value)} />
                  </div>
                  <div>
                    <Label>Aloha ID (Non-POS)</Label>
                    <Input type="number" value={form.aloha_id_nonpos ?? ""} onChange={(e) => setNumber("aloha_id_nonpos", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Loy Tender ID</Label>
                    <Input type="text" value={form.loy_tender_id ?? ""} onChange={(e) => set("loy_tender_id", e.target.value)} />
                  </div>
                  <div>
                    <Label>Loy Tender ID (POS)</Label>
                    <Input type="text" value={form.loy_tender_id_pos ?? ""} onChange={(e) => set("loy_tender_id_pos", e.target.value)} />
                  </div>
                  <div>
                    <Label>Loy Tender ID (Non-POS)</Label>
                    <Input type="text" value={form.loy_tender_id_nonpos ?? ""} onChange={(e) => set("loy_tender_id_nonpos", e.target.value)} />
                  </div>
                </div>
                <div className="w-48">
                  <Label>Loy Tender Amount (VND)</Label>
                  <Input type="number" min="0" value={form.loy_tender_amount ?? ""} onChange={(e) => setNumber("loy_tender_amount", e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {/* Group 4: Giá trị giảm giá */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Giá trị giảm giá</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Save Amount (VND)</Label>
                <Input type="number" min="0" value={form.save_amount ?? ""} onChange={(e) => setNumber("save_amount", e.target.value)} />
              </div>
              <div>
                <Label>Total Discount Amount (VND)</Label>
                <Input type="number" min="0" value={form.total_discount_amount ?? ""} onChange={(e) => setNumber("total_discount_amount", e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-white/[0.05] flex justify-end gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <Button size="sm" onClick={handleSave}>
            Save Metadata
          </Button>
        </div>
      </div>
    </div>
  );
}
