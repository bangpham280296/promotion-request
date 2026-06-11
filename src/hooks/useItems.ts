"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";

type PickerItem = {
  itemcode: string;
  itemname: string;
  price: number;
  category: { id: number; Description: string } | null;
};

export type AllItem = {
  id: number;
  itemcode: string;
  itemname: string;
  price: number;
  status: number;
  itempicker: boolean;
  category: { id: number; Description: string } | null;
};

// For ItemPicker in combo — fetches items where itempicker = true
export default function useItems() {
  const [items, setItems] = useState<PickerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("items")
        .select("itemcode, itemname, price, category(id, Description)")
        .eq("itempicker", true)
        .order("itemcode", { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setItems(data ?? []);
      }
      setLoading(false);
    };

    fetchItems();
  }, []);

  return { items, loading, error };
}

// Fetch all items with server-side pagination and search (for management table)
export function useAllItems(itemsPerPage: number) {
  const [items, setItems] = useState<AllItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllItems = useCallback(
    async (page: number, query: string, categoryId: number | null = null, sortAsc: boolean = true) => {
      setLoading(true);
      setError(null);

      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let req = supabase
        .from("items")
        .select("id, itemcode, itemname, price, status, itempicker, category(id, Description)", {
          count: "exact",
        })
        .order("itemcode", { ascending: sortAsc })
        .range(from, to);

      if (query.trim()) {
        req = req.or(
          `itemcode.ilike.%${query.trim()}%,itemname.ilike.%${query.trim()}%`
        );
      }

      if (categoryId !== null) {
        req = req.eq("category", categoryId);
      }

      const { data, error, count } = await req;

      if (error) {
        setError(error.message);
      } else {
        setItems((data as unknown as AllItem[]) ?? []);
        setTotalCount(count ?? 0);
      }
      setLoading(false);
    },
    [itemsPerPage]
  );

  return { items, totalCount, loading, error, fetchAllItems };
}

export type Category = { id: number; Description: string };

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("category")
      .select("id, Description")
      .order("Description", { ascending: true })
      .then(({ data }) => {
        setCategories(data ?? []);
        setLoading(false);
      });
  }, []);

  return { categories, loading };
}

type CreateItemFields = {
  itemcode: string;
  itemname: string;
  price: number;
  status: number;
  itempicker: boolean;
  category: number | null;
};

export function useCreateItem() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createItem = useCallback(async (fields: CreateItemFields): Promise<boolean> => {
    setSaving(true);
    setError(null);

    const { error } = await supabase.from("items").insert({
      itemcode: fields.itemcode.trim(),
      itemname: fields.itemname.trim(),
      price: fields.price,
      status: fields.status,
      itempicker: fields.itempicker,
      category: fields.category,
    });

    setSaving(false);
    if (error) {
      setError(error.message);
      return false;
    }
    return true;
  }, []);

  return { createItem, saving, error, setError };
}

type UpdateItemFields = {
  status: number;
  itempicker: boolean;
  price: number;
  category: number | null;
};

export function useUpdateItem() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateItem = useCallback(async (id: number, fields: UpdateItemFields): Promise<boolean> => {
    setSaving(true);
    setError(null);

    const { error } = await supabase
      .from("items")
      .update({
        status: fields.status,
        itempicker: fields.itempicker,
        price: fields.price,
        category: fields.category,
      })
      .eq("id", id);

    setSaving(false);
    if (error) {
      setError(error.message);
      return false;
    }
    return true;
  }, []);

  return { updateItem, saving, error, setError };
}
