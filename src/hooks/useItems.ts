"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";

type PickerItem = {
  itemcode: string;
  itemname: string;
  price: number;
};

export type AllItem = {
  id: number;
  itemcode: string;
  itemname: string;
  price: number;
  status: number;
  itempicker: boolean;
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
        .select("itemcode, itemname, price")
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
    async (page: number, query: string) => {
      setLoading(true);
      setError(null);

      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let req = supabase
        .from("items")
        .select("id, itemcode, itemname, price, status, itempicker", {
          count: "exact",
        })
        .order("itemcode", { ascending: true })
        .range(from, to);

      if (query.trim()) {
        req = req.or(
          `itemcode.ilike.%${query.trim()}%,itemname.ilike.%${query.trim()}%`
        );
      }

      const { data, error, count } = await req;

      if (error) {
        setError(error.message);
      } else {
        setItems(data ?? []);
        setTotalCount(count ?? 0);
      }
      setLoading(false);
    },
    [itemsPerPage]
  );

  return { items, totalCount, loading, error, fetchAllItems };
}
