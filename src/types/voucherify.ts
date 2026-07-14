// src/types/voucherify.ts

export type VoucherifyMode = "A" | "B" | "C";
export type PushStatus = "pending" | "success" | "failed";
export type DiscountOrEgc = "discount" | "egc";
export type CampaignTypeOption = "tender" | "item" | "promotion";
export type DiscountType = "AMOUNT" | "PERCENT";
export type UnitEffect = "ADD_MISSING_ITEMS" | "ADD_NEW_ITEMS";
export type PercentEffect = "APPLY_TO_ORDER" | "APPLY_TO_ITEMS";
export type AmountEffect =
  | "APPLY_TO_ORDER"
  | "APPLY_TO_ITEMS"
  | "APPLY_TO_ITEMS_PROPORTIONALLY"
  | "APPLY_TO_ITEMS_PROPORTIONALLY_BY_QUANTITY"
  | "APPLY_TO_ITEMS_BY_QUANTITY";

export interface VoucherifyPush {
  id: string;
  reqdtlid: string;
  reqid: string;
  pushed_by: string | null;
  mode: VoucherifyMode;
  template_id: string | null;
  campaign_name: string;
  vouchers_count: number | null;
  code_pattern: string | null;
  product_id: string | null;
  product_name: string | null;
  discount_type: DiscountType | null;
  discount_value_vnd: number | null;
  discount_percent: number | null;
  max_discount_cap: number | null;
  voucherify_campaign_id: string | null;
  push_status: PushStatus;
  push_error: string | null;
  pushed_at: string | null;
  createdat: string;
}

export interface PushCampaignInput {
  reqdtlid: string;
  reqid: string;
  mode: VoucherifyMode;
  // Common campaign fields
  campaign_name: string;
  start_date?: string;         // ISO-8601 UTC — omit nếu blank
  expiration_date?: string;    // ISO-8601 UTC — omit nếu blank
  vouchers_count?: number;
  code_pattern?: string;
  // Required Voucherify metadata enums
  discount_or_egc: DiscountOrEgc;
  campaign_type_pos: CampaignTypeOption;
  campaign_type_nonpos: CampaignTypeOption;
  display_priority: number;
  // Mode A
  template_id?: string;
  // Mode B
  product_id?: string;
  product_name?: string;
  unit_effect?: UnitEffect;
  // Mode C
  discount_type?: DiscountType;
  discount_value_vnd?: number;   // display VND, server ×100
  discount_percent?: number;
  max_discount_cap?: number;     // display VND, server ×100
  amount_effect?: AmountEffect | PercentEffect;
}

export interface PushCampaignResponse {
  push_id: string;
  campaign_id: string;
  push_status: PushStatus;
}

export interface VoucherifyTemplate {
  id: string;
  name: string;
  description?: string;
}

export interface VoucherifyProduct {
  id: string;
  name: string;
  price?: number;
}
