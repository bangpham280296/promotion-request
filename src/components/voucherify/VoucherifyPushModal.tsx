// src/components/voucherify/VoucherifyPushModal.tsx
"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import ProductSearchInput from "./ProductSearchInput";
import type {
  VoucherifyMode,
  DiscountOrEgc,
  CampaignTypeOption,
  DiscountType,
  UnitEffect,
  AmountEffect,
  PercentEffect,
  VoucherifyTemplate,
  VoucherifyProduct,
  PushCampaignInput,
  PushCampaignResponse,
} from "@/types/voucherify";

interface PushItem {
  reqdtlid: string;
  reqid:    string;
  itemname: string;
  startdate?: string;
  enddate?:   string;
  price?:     number | null;
}

interface Props {
  isOpen:         boolean;
  onClose:        () => void;
  item:           PushItem | null;
  pushing:        boolean;
  pushCampaign:   (data: PushCampaignInput) => Promise<PushCampaignResponse>;
  fetchTemplates: () => Promise<VoucherifyTemplate[]>;
  searchProducts: (q: string) => Promise<VoucherifyProduct[]>;
}

type Step = 1 | 2;

const DISCOUNT_OR_EGC_OPTIONS: { value: DiscountOrEgc; label: string }[] = [
  { value: "discount", label: "Discount" },
  { value: "egc",      label: "EGC (Tender / Gift Card)" },
];
const CAMPAIGN_TYPE_OPTIONS: { value: CampaignTypeOption; label: string }[] = [
  { value: "promotion", label: "Promotion" },
  { value: "item",      label: "Item (Free Item)" },
  { value: "tender",    label: "Tender" },
];
const UNIT_EFFECT_OPTIONS: { value: UnitEffect; label: string }[] = [
  { value: "ADD_MISSING_ITEMS", label: "Add if missing" },
  { value: "ADD_NEW_ITEMS",     label: "Always add new" },
];
const PERCENT_EFFECT_OPTIONS: { value: PercentEffect; label: string }[] = [
  { value: "APPLY_TO_ORDER", label: "Apply to order" },
  { value: "APPLY_TO_ITEMS", label: "Apply to items" },
];
const AMOUNT_EFFECT_OPTIONS: { value: AmountEffect; label: string }[] = [
  { value: "APPLY_TO_ORDER",                         label: "Apply to order" },
  { value: "APPLY_TO_ITEMS",                         label: "Apply to items" },
  { value: "APPLY_TO_ITEMS_PROPORTIONALLY",          label: "Proportionally by price" },
  { value: "APPLY_TO_ITEMS_PROPORTIONALLY_BY_QUANTITY", label: "Proportionally by quantity" },
  { value: "APPLY_TO_ITEMS_BY_QUANTITY",             label: "By quantity" },
];

export default function VoucherifyPushModal({
  isOpen, onClose, item, pushing, pushCampaign, fetchTemplates, searchProducts,
}: Props) {
  const [step, setStep] = useState<Step>(1);

  // Step 1 state
  const [mode, setMode]               = useState<VoucherifyMode>("C");
  const [campaignName, setCampaignName] = useState("");
  const [startDate, setStartDate]     = useState("");
  const [endDate, setEndDate]         = useState("");
  // Mode A
  const [templates, setTemplates]     = useState<VoucherifyTemplate[]>([]);
  const [templateId, setTemplateId]   = useState("");
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  // Mode B
  const [selectedProduct, setSelectedProduct] = useState<VoucherifyProduct | null>(null);
  const [unitEffect, setUnitEffect]   = useState<UnitEffect>("ADD_MISSING_ITEMS");
  // Mode C
  const [discountType, setDiscountType] = useState<DiscountType>("PERCENT");
  const [discountValueVnd, setDiscountValueVnd] = useState("");
  const [discountPercent, setDiscountPercent]   = useState("");
  const [maxDiscountCap, setMaxDiscountCap]     = useState("");
  const [amountEffect, setAmountEffect] = useState<AmountEffect | PercentEffect>("APPLY_TO_ORDER");

  // Step 2 state
  const [vouchersCount, setVouchersCount]       = useState("");
  const [codePattern, setCodePattern]           = useState("");
  const [discountOrEgc, setDiscountOrEgc]       = useState<DiscountOrEgc>("discount");
  const [campaignTypePos, setCampaignTypePos]   = useState<CampaignTypeOption>("promotion");
  const [campaignTypeNonpos, setCampaignTypeNonpos] = useState<CampaignTypeOption>("promotion");
  const [displayPriority, setDisplayPriority]   = useState("1");

  // Reset khi mở modal với item mới
  useEffect(() => {
    if (!isOpen || !item) return;
    setStep(1);
    setMode("C");
    setCampaignName(item.itemname);
    setStartDate(item.startdate ?? "");
    setEndDate(item.enddate ?? "");
    setTemplateId("");
    setSelectedProduct(null);
    setUnitEffect("ADD_MISSING_ITEMS");
    setDiscountType("PERCENT");
    setDiscountValueVnd(item.price ? String(item.price) : "");
    setDiscountPercent("");
    setMaxDiscountCap("");
    setAmountEffect("APPLY_TO_ORDER");
    setVouchersCount("");
    setCodePattern("");
    setDiscountOrEgc("discount");
    setCampaignTypePos("promotion");
    setCampaignTypeNonpos("promotion");
    setDisplayPriority("1");
  }, [isOpen, item]);

  // Load templates khi chọn Mode A
  useEffect(() => {
    if (mode !== "A") return;
    setLoadingTemplates(true);
    fetchTemplates()
      .then(setTemplates)
      .finally(() => setLoadingTemplates(false));
  }, [mode, fetchTemplates]);

  // Reset effect khi switch discount type
  const handleDiscountTypeChange = (dt: DiscountType) => {
    setDiscountType(dt);
    setAmountEffect("APPLY_TO_ORDER"); // reset về safe default
  };

  if (!isOpen || !item) return null;

  const validateStep1 = (): string | null => {
    if (!campaignName.trim()) return "Campaign name is required.";
    if (mode === "A" && !templateId) return "Please select a template.";
    if (mode === "B" && !selectedProduct) return "Please select a product.";
    if (mode === "C") {
      if (discountType === "PERCENT") {
        const p = Number(discountPercent);
        if (!discountPercent || p <= 0 || p > 100) return "Percent must be 1–100.";
      } else {
        if (!discountValueVnd || Number(discountValueVnd) <= 0) return "Discount amount is required.";
      }
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) { toast.error(err, { position: "top-center" }); return; }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!displayPriority || Number(displayPriority) < 1) {
      toast.error("Display priority must be ≥ 1.", { position: "top-center" });
      return;
    }

    // Xử lý date: parse "dd/mm/yyyy" → ISO UTC, omit nếu blank
    const parseDate = (d: string) => {
      if (!d) return undefined;
      const parts = d.split("/");
      if (parts.length === 3) {
        const [dd, mm, yyyy] = parts;
        const dt = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
        if (!isNaN(dt.getTime())) return dt.toISOString();
      }
      return undefined;
    };

    const payload: PushCampaignInput = {
      reqdtlid:      item.reqdtlid,
      reqid:         item.reqid,
      mode,
      campaign_name: campaignName.trim(),
      start_date:       parseDate(startDate),
      expiration_date:  parseDate(endDate),
      vouchers_count:   vouchersCount ? Number(vouchersCount) : undefined,
      code_pattern:     codePattern.trim() || undefined,
      discount_or_egc:     discountOrEgc,
      campaign_type_pos:   campaignTypePos,
      campaign_type_nonpos: campaignTypeNonpos,
      display_priority: Number(displayPriority),
      // Mode A
      template_id: mode === "A" ? templateId : undefined,
      // Mode B
      product_id:   mode === "B" ? selectedProduct?.id  : undefined,
      product_name: mode === "B" ? selectedProduct?.name : undefined,
      unit_effect:  mode === "B" ? unitEffect : undefined,
      // Mode C
      discount_type:      mode === "C" ? discountType : undefined,
      discount_value_vnd: mode === "C" && discountType === "AMOUNT"  ? Number(discountValueVnd) : undefined,
      discount_percent:   mode === "C" && discountType === "PERCENT" ? Number(discountPercent)  : undefined,
      max_discount_cap:   mode === "C" && discountType === "PERCENT" && maxDiscountCap ? Number(maxDiscountCap) : undefined,
      amount_effect:      mode === "C" ? amountEffect as AmountEffect : undefined,
    };

    try {
      const res = await pushCampaign(payload);
      toast.success(`Campaign created! ID: ${res.campaign_id}`, { position: "top-center" });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Push failed";
      toast.error(msg, { position: "top-center" });
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 dark:border-white/[0.05]">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white">
              Push to Voucherify
            </h2>
            <span className="text-xs text-gray-400">Step {step} / 2</span>
          </div>
          <p className="mt-1 text-xs text-gray-400 truncate">{item.itemname}</p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {step === 1 && (
            <>
              {/* Campaign name */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full text-sm border border-gray-200 dark:border-white/[0.1] rounded-lg px-3 py-2 bg-transparent text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Start Date</label>
                  <input type="text" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                    placeholder="dd/mm/yyyy"
                    className="w-full text-sm border border-gray-200 dark:border-white/[0.1] rounded-lg px-3 py-2 bg-transparent text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">End Date</label>
                  <input type="text" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                    placeholder="dd/mm/yyyy"
                    className="w-full text-sm border border-gray-200 dark:border-white/[0.1] rounded-lg px-3 py-2 bg-transparent text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>

              {/* Mode selector */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Mode *</label>
                <div className="flex rounded-lg border border-gray-200 dark:border-white/[0.1] overflow-hidden">
                  {(["A", "B", "C"] as VoucherifyMode[]).map((m) => (
                    <button key={m} type="button" onClick={() => setMode(m)}
                      className={`flex-1 py-2 text-xs font-medium border-r last:border-r-0 border-gray-200 dark:border-white/[0.1] transition-colors ${
                        mode === m ? "bg-brand-500 text-white" : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/[0.04]"
                      }`}>
                      {m === "A" ? "A — Template" : m === "B" ? "B — Free Item" : "C — Discount"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode A config */}
              {mode === "A" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Template *</label>
                  {loadingTemplates ? (
                    <p className="text-xs text-gray-400">Loading templates…</p>
                  ) : (
                    <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}
                      className="w-full text-sm border border-gray-200 dark:border-white/[0.1] rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                      <option value="">Select a template</option>
                      {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  )}
                </div>
              )}

              {/* Mode B config */}
              {mode === "B" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Product *</label>
                    <ProductSearchInput
                      value={selectedProduct?.name ?? ""}
                      searchProducts={searchProducts}
                      onSelect={(p) => setSelectedProduct(p)}
                      placeholder="Search product by name…"
                    />
                    {selectedProduct && (
                      <p className="mt-1 text-xs text-gray-400 font-mono">{selectedProduct.id}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Effect</label>
                    <select value={unitEffect} onChange={(e) => setUnitEffect(e.target.value as UnitEffect)}
                      className="w-full text-sm border border-gray-200 dark:border-white/[0.1] rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                      {UNIT_EFFECT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Mode C config */}
              {mode === "C" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Discount Type *</label>
                    <div className="flex rounded-lg border border-gray-200 dark:border-white/[0.1] overflow-hidden w-48">
                      {(["AMOUNT", "PERCENT"] as DiscountType[]).map((dt) => (
                        <button key={dt} type="button" onClick={() => handleDiscountTypeChange(dt)}
                          className={`flex-1 py-1.5 text-xs font-medium border-r last:border-r-0 border-gray-200 dark:border-white/[0.1] transition-colors ${
                            discountType === dt ? "bg-brand-500 text-white" : "text-gray-500 hover:bg-gray-50 dark:text-gray-400"
                          }`}>
                          {dt}
                        </button>
                      ))}
                    </div>
                  </div>
                  {discountType === "PERCENT" ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Percent (%) *</label>
                        <input type="number" min="1" max="100" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)}
                          className="w-full text-sm border border-gray-200 dark:border-white/[0.1] rounded-lg px-3 py-2 bg-transparent text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Max Cap (VND)</label>
                        <input type="number" min="0" value={maxDiscountCap} onChange={(e) => setMaxDiscountCap(e.target.value)}
                          placeholder="Optional"
                          className="w-full text-sm border border-gray-200 dark:border-white/[0.1] rounded-lg px-3 py-2 bg-transparent text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Amount (VND) *</label>
                      <input type="number" min="0" value={discountValueVnd} onChange={(e) => setDiscountValueVnd(e.target.value)}
                        className="w-full text-sm border border-gray-200 dark:border-white/[0.1] rounded-lg px-3 py-2 bg-transparent text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Effect</label>
                    <select
                      value={amountEffect}
                      onChange={(e) => setAmountEffect(e.target.value as AmountEffect | PercentEffect)}
                      className="w-full text-sm border border-gray-200 dark:border-white/[0.1] rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                      {(discountType === "PERCENT" ? PERCENT_EFFECT_OPTIONS : AMOUNT_EFFECT_OPTIONS).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              {/* Vouchers count + code pattern */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Vouchers Count</label>
                  <input type="number" min="1" value={vouchersCount} onChange={(e) => setVouchersCount(e.target.value)}
                    placeholder="Optional"
                    className="w-full text-sm border border-gray-200 dark:border-white/[0.1] rounded-lg px-3 py-2 bg-transparent text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Code Pattern</label>
                  <input type="text" value={codePattern} onChange={(e) => setCodePattern(e.target.value)}
                    placeholder="KFC-#### (optional)"
                    className="w-full text-sm border border-gray-200 dark:border-white/[0.1] rounded-lg px-3 py-2 bg-transparent text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>

              {/* Metadata enums */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Discount or EGC *</label>
                <select value={discountOrEgc} onChange={(e) => setDiscountOrEgc(e.target.value as DiscountOrEgc)}
                  className="w-full text-sm border border-gray-200 dark:border-white/[0.1] rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                  {DISCOUNT_OR_EGC_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Campaign Type (POS) *</label>
                  <select value={campaignTypePos} onChange={(e) => setCampaignTypePos(e.target.value as CampaignTypeOption)}
                    className="w-full text-sm border border-gray-200 dark:border-white/[0.1] rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {CAMPAIGN_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Campaign Type (Non-POS) *</label>
                  <select value={campaignTypeNonpos} onChange={(e) => setCampaignTypeNonpos(e.target.value as CampaignTypeOption)}
                    className="w-full text-sm border border-gray-200 dark:border-white/[0.1] rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {CAMPAIGN_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Display Priority *</label>
                <input type="number" min="1" value={displayPriority} onChange={(e) => setDisplayPriority(e.target.value)}
                  className="w-32 text-sm border border-gray-200 dark:border-white/[0.1] rounded-lg px-3 py-2 bg-transparent text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>

              {/* Summary */}
              <div className="rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] px-4 py-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p><span className="font-medium text-gray-700 dark:text-gray-300">Name:</span> {campaignName}</p>
                <p><span className="font-medium text-gray-700 dark:text-gray-300">Mode:</span> {mode}{mode === "A" ? ` — Template: ${templates.find(t=>t.id===templateId)?.name ?? templateId}` : mode === "B" ? ` — ${selectedProduct?.name}` : ` — ${discountType} ${discountType === "PERCENT" ? discountPercent + "%" : discountValueVnd + " VND"}`}</p>
                <p><span className="font-medium text-gray-700 dark:text-gray-300">Dates:</span> {startDate || "—"} → {endDate || "—"}</p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-white/[0.05] flex justify-between">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
            Cancel
          </button>
          <div className="flex gap-2">
            {step === 2 && (
              <button onClick={() => setStep(1)}
                className="px-4 py-2 text-sm border border-gray-200 dark:border-white/[0.1] rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors">
                ← Back
              </button>
            )}
            {step === 1 ? (
              <button onClick={handleNext}
                className="px-5 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors">
                Next →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={pushing}
                className="px-5 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {pushing ? "Pushing…" : "Push Campaign →"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
