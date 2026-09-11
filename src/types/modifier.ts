import type { AllItem } from "@/hooks/useItems";

export interface ModifierGroup {
  id: number;
  group_name: string;
  description: string | null;
  status: number; // 1: Active, 0: Inactive
  created_at: string;
  updated_at: string;
}

export interface ModifierGroupSummary extends ModifierGroup {
  base_item_count: number;
  target_item_count: number;
}

export interface ModifierGroupBaseItem {
  id: number;
  group_id: number;
  item_id: number;
  created_at: string;
  item?: AllItem;
}

export interface ModifierGroupItem {
  id: number;
  group_id: number;
  item_id: number;
  surcharge_price: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  item?: AllItem;
}

export interface ModifierMatrixFlatRow {
  groupName: string;
  description?: string;
  baseItemCode?: string;
  targetItemCode?: string;
  surcharge?: number;
  status?: string | number;
}
