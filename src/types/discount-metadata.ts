// src/types/discount-metadata.ts
import type { CampaignTypeOption } from "./voucherify";

export interface DiscountMetadata {
  // Nội dung hiển thị
  title_en: string;
  title_vi: string;
  short_description_en: string;
  short_description_vi: string;
  long_description_en?: string;
  long_description_vi?: string;
  thumbnail?: string;
  // Phân loại chiến dịch
  discount_or_egc: string; // "discount" | "egc" | "loy_egc" | ... — enum chưa xác nhận đầy đủ, xem spec mục 9
  campaign_type?: CampaignTypeOption;
  campaign_type_pos?: CampaignTypeOption;
  campaign_type_nonpos?: CampaignTypeOption;
  program_name?: string;
  display_priority?: number;
  // Tích hợp POS / Loyalty
  aloha_id?: number;
  aloha_id_pos?: number;
  aloha_id_nonpos?: number;
  loy_tender_id?: string;
  loy_tender_id_pos?: string;
  loy_tender_id_nonpos?: string;
  loy_tender_amount?: number;
  // Giá trị giảm giá
  save_amount?: number;
  total_discount_amount?: number;
}

export const EMPTY_DISCOUNT_METADATA: DiscountMetadata = {
  title_en: "",
  title_vi: "",
  short_description_en: "",
  short_description_vi: "",
  long_description_en: "",
  long_description_vi: "",
  thumbnail: "",
  discount_or_egc: "discount",
  campaign_type: undefined,
  campaign_type_pos: undefined,
  campaign_type_nonpos: undefined,
  program_name: "",
  display_priority: 1,
  aloha_id: undefined,
  aloha_id_pos: undefined,
  aloha_id_nonpos: undefined,
  loy_tender_id: "",
  loy_tender_id_pos: "",
  loy_tender_id_nonpos: "",
  loy_tender_amount: undefined,
  save_amount: undefined,
  total_discount_amount: undefined,
};

export const DISCOUNT_OR_EGC_OPTIONS: { value: string; label: string }[] = [
  { value: "discount", label: "Discount" },
  { value: "egc", label: "EGC (Tender / Gift Card)" },
  { value: "loy_egc", label: "Loyalty EGC" },
];

export const CAMPAIGN_TYPE_META_OPTIONS: { value: CampaignTypeOption; label: string }[] = [
  { value: "promotion", label: "Promotion" },
  { value: "item", label: "Item (Free Item)" },
  { value: "tender", label: "Tender" },
];
