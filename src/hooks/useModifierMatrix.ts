"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import type {
  ModifierGroup,
  ModifierGroupSummary,
  ModifierGroupBaseItem,
  ModifierGroupItem,
} from "@/types/modifier";
import { toast } from "sonner";

export function useModifierMatrix() {
  const [groups, setGroups] = useState<ModifierGroupSummary[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ModifierGroupSummary | null>(null);
  const [baseItems, setBaseItems] = useState<ModifierGroupBaseItem[]>([]);
  const [targetItems, setTargetItems] = useState<ModifierGroupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Fetch all groups with their item counts
  const fetchGroups = useCallback(async (autoSelectId?: number) => {
    setLoading(true);
    try {
      const { data: groupsData, error: groupsError } = await supabase
        .from("modifier_groups")
        .select(`
          id,
          group_name,
          description,
          status,
          created_at,
          updated_at,
          modifier_group_base_items(count),
          modifier_group_items(count)
        `)
        .order("id", { ascending: false });

      if (groupsError) throw groupsError;

      const formatted: ModifierGroupSummary[] = (groupsData || []).map((g: any) => ({
        id: g.id,
        group_name: g.group_name,
        description: g.description,
        status: g.status,
        created_at: g.created_at,
        updated_at: g.updated_at,
        base_item_count: g.modifier_group_base_items?.[0]?.count ?? 0,
        target_item_count: g.modifier_group_items?.[0]?.count ?? 0,
      }));

      setGroups(formatted);

      // Handle auto selection
      if (autoSelectId) {
        const found = formatted.find((g) => g.id === autoSelectId);
        if (found) setSelectedGroup(found);
      } else if (formatted.length > 0) {
        setSelectedGroup((prev) => {
          if (!prev) return formatted[0];
          const stillExists = formatted.find((g) => g.id === prev.id);
          return stillExists ?? formatted[0];
        });
      } else {
        setSelectedGroup(null);
      }
    } catch (err: any) {
      console.error("Error fetching modifier groups:", err);
      toast.error(err.message || "Failed to load modifier groups");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch detail for the currently selected group
  const fetchGroupDetails = useCallback(async (groupId: number) => {
    setDetailLoading(true);
    try {
      // 1. Fetch base items
      const { data: baseData, error: baseError } = await supabase
        .from("modifier_group_base_items")
        .select(`
          id,
          group_id,
          item_id,
          created_at,
          item:items(
            id,
            itemcode,
            itemname,
            price,
            status,
            itempicker,
            category:category(id, Description)
          )
        `)
        .eq("group_id", groupId)
        .order("id", { ascending: true });

      if (baseError) throw baseError;

      // 2. Fetch target items
      const { data: targetData, error: targetError } = await supabase
        .from("modifier_group_items")
        .select(`
          id,
          group_id,
          item_id,
          surcharge_price,
          is_active,
          sort_order,
          created_at,
          item:items(
            id,
            itemcode,
            itemname,
            price,
            status,
            itempicker,
            category:category(id, Description)
          )
        `)
        .eq("group_id", groupId)
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true });

      if (targetError) throw targetError;

      setBaseItems((baseData as unknown as ModifierGroupBaseItem[]) || []);
      setTargetItems((targetData as unknown as ModifierGroupItem[]) || []);
    } catch (err: any) {
      console.error("Error fetching group details:", err);
      toast.error(err.message || "Failed to load group details");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // Whenever selectedGroup changes, reload details
  useEffect(() => {
    if (selectedGroup) {
      fetchGroupDetails(selectedGroup.id);
    } else {
      setBaseItems([]);
      setTargetItems([]);
    }
  }, [selectedGroup, fetchGroupDetails]);

  // Initial load
  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Create Group
  const createGroup = async (payload: {
    group_name: string;
    description?: string;
    status?: number;
  }) => {
    try {
      const { data, error } = await supabase
        .from("modifier_groups")
        .insert({
          group_name: payload.group_name.trim(),
          description: payload.description?.trim() || null,
          status: payload.status ?? 1,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success(`Group "${payload.group_name}" created successfully`);
      await fetchGroups(data.id);
      return data;
    } catch (err: any) {
      toast.error(err.message || "Failed to create group");
      throw err;
    }
  };

  // Update Group
  const updateGroup = async (
    id: number,
    payload: { group_name?: string; description?: string; status?: number }
  ) => {
    try {
      const updateData: any = { updated_at: new Date().toISOString() };
      if (payload.group_name !== undefined) updateData.group_name = payload.group_name.trim();
      if (payload.description !== undefined) updateData.description = payload.description?.trim() || null;
      if (payload.status !== undefined) updateData.status = payload.status;

      const { error } = await supabase
        .from("modifier_groups")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
      toast.success("Group updated successfully");
      await fetchGroups(id);
    } catch (err: any) {
      toast.error(err.message || "Failed to update group");
      throw err;
    }
  };

  // Delete Group
  const deleteGroup = async (id: number) => {
    try {
      const { error } = await supabase.from("modifier_groups").delete().eq("id", id);
      if (error) throw error;
      toast.success("Group deleted successfully");
      await fetchGroups();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete group");
      throw err;
    }
  };

  // Add Base Items
  const addBaseItems = async (groupId: number, itemIds: number[]) => {
    try {
      const rows = itemIds.map((item_id) => ({
        group_id: groupId,
        item_id,
      }));

      const { error } = await supabase
        .from("modifier_group_base_items")
        .upsert(rows, { onConflict: "group_id,item_id", ignoreDuplicates: true });

      if (error) throw error;
      toast.success(`Added ${itemIds.length} base item(s)`);
      await fetchGroupDetails(groupId);
      await fetchGroups(groupId);
    } catch (err: any) {
      toast.error(err.message || "Failed to add base items");
      throw err;
    }
  };

  // Remove Base Item
  const removeBaseItem = async (rowId: number) => {
    if (!selectedGroup) return;
    try {
      const { error } = await supabase
        .from("modifier_group_base_items")
        .delete()
        .eq("id", rowId);

      if (error) throw error;
      toast.success("Base item removed");
      await fetchGroupDetails(selectedGroup.id);
      await fetchGroups(selectedGroup.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to remove base item");
      throw err;
    }
  };

  // Add Target Item
  const addTargetItem = async (groupId: number, itemId: number, surcharge: number) => {
    try {
      const nextSortOrder =
        targetItems.length > 0
          ? Math.max(...targetItems.map((t) => t.sort_order || 0)) + 1
          : 0;

      const { error } = await supabase.from("modifier_group_items").insert({
        group_id: groupId,
        item_id: itemId,
        surcharge_price: surcharge,
        sort_order: nextSortOrder,
        is_active: true,
      });

      if (error) throw error;
      toast.success("Trade-up item added");
      await fetchGroupDetails(groupId);
      await fetchGroups(groupId);
    } catch (err: any) {
      toast.error(err.message || "Failed to add trade-up item");
      throw err;
    }
  };

  // Update Target Item Surcharge
  const updateTargetItemSurcharge = async (rowId: number, surcharge: number) => {
    if (!selectedGroup) return;
    try {
      const { error } = await supabase
        .from("modifier_group_items")
        .update({ surcharge_price: surcharge })
        .eq("id", rowId);

      if (error) throw error;
      toast.success("Surcharge updated");
      // Optimistic update
      setTargetItems((prev) =>
        prev.map((item) =>
          item.id === rowId ? { ...item, surcharge_price: surcharge } : item
        )
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update surcharge");
      throw err;
    }
  };

  // Toggle Target Item Active
  const toggleTargetItemActive = async (rowId: number, isActive: boolean) => {
    if (!selectedGroup) return;
    try {
      const { error } = await supabase
        .from("modifier_group_items")
        .update({ is_active: isActive })
        .eq("id", rowId);

      if (error) throw error;
      // Optimistic update
      setTargetItems((prev) =>
        prev.map((item) =>
          item.id === rowId ? { ...item, is_active: isActive } : item
        )
      );
      toast.success(isActive ? "Item activated" : "Item deactivated");
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle status");
      throw err;
    }
  };

  // Remove Target Item
  const removeTargetItem = async (rowId: number) => {
    if (!selectedGroup) return;
    try {
      const { error } = await supabase
        .from("modifier_group_items")
        .delete()
        .eq("id", rowId);

      if (error) throw error;
      toast.success("Trade-up item removed");
      await fetchGroupDetails(selectedGroup.id);
      await fetchGroups(selectedGroup.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to remove trade-up item");
      throw err;
    }
  };

  return {
    groups,
    selectedGroup,
    setSelectedGroup,
    baseItems,
    targetItems,
    loading,
    detailLoading,
    fetchGroups,
    fetchGroupDetails,
    createGroup,
    updateGroup,
    deleteGroup,
    addBaseItems,
    removeBaseItem,
    addTargetItem,
    updateTargetItemSurcharge,
    toggleTargetItemActive,
    removeTargetItem,
  };
}
