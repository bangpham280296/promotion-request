"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";

export type ComboRequest = {
  reqid: number;
  requestcode: string;
  promotionname: string;
  createdate: string;
  stt: { name: string } | null;
  employees: { fullname: string } | null;
  department: { deptname: string } | null;
};

export type ComboRecord = {
  reqdtlid: number;
  itemcode: string;
  itemname: string;
  description: string | null;
  price: number | null;
  startdate: string | null;
  enddate: string | null;
  servicetype: string | null;
  notes: string | null;
  requests: ComboRequest | null;
};

export type ParsedComponent = {
  code: string;
  name: string;
  qty: string;
  unitPrice: string;
  isAlternative: boolean;
  groupNumber: number;
};

export const PAGE_SIZE = 20;

/** Parse DB combo description into display-ready components.
 *  Handles: "code|name|unitPrice (qty)" joined by " + ", alternatives joined by " OR " */
export function parseComboDescription(description: string | null): ParsedComponent[] {
  if (!description || !description.includes("|")) return [];

  const result: ParsedComponent[] = [];
  let groupNumber = 0;

  for (const groupStr of description.split(" + ")) {
    groupNumber++;
    const alternatives = groupStr.split(" OR ");
    for (let i = 0; i < alternatives.length; i++) {
      const segments = alternatives[i].trim().split("|");

      if (segments.length >= 3) {
        const code = segments[0].trim();
        const name = segments[1].trim();
        const priceQty = segments[2].trim();
        const match = priceQty.match(/^(.*?)\s*\((\d+)\)\s*$/);
        result.push({
          code,
          name,
          qty: match ? match[2] : "1",
          unitPrice: match ? match[1].trim() : priceQty,
          isAlternative: i > 0,
          groupNumber,
        });
      } else if (segments.length === 2) {
        const code = segments[0].trim();
        const nameWithQty = segments[1].trim();
        const match = nameWithQty.match(/\((\d+)\)$/);
        result.push({
          code,
          name: nameWithQty.replace(/\s*\(\d+\)\s*$/, "").trim(),
          qty: match ? match[1] : "1",
          unitPrice: "",
          isAlternative: i > 0,
          groupNumber,
        });
      }
    }
  }

  return result;
}

export function useCombos() {
  const [combos, setCombos] = useState<ComboRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCombos = useCallback(async (
    page = 1,
    search = "",
    minCode: number | null = null,
    maxCode: number | null = null,
  ) => {
    setLoading(true);
    setError(null);

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const q = search.trim();

    let query = supabase
      .from("promotiondetail")
      .select(
        `reqdtlid, itemcode, itemname, description, price, startdate, enddate, servicetype, notes,
         requests(
           reqid, requestcode, promotionname, createdate,
           stt:status(name),
           employees:employees!request_requester_fkey(fullname),
           department(deptname)
         )`,
        { count: "exact" }
      )
      .eq("itemtype", "combo")
      .order("reqdtlid", { ascending: false })
      .range(from, to);

    if (q) {
      query = query.or(`itemcode.ilike.%${q}%,itemname.ilike.%${q}%`);
    }
    if (minCode !== null) query = query.gte("itemcode_num", minCode);
    if (maxCode !== null) query = query.lte("itemcode_num", maxCode);

    const { data, error: fetchError, count } = await query;

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setCombos((data ?? []) as unknown as ComboRecord[]);
      setTotalCount(count ?? 0);
    }

    setLoading(false);
  }, []);

  const deleteCombo = async (reqdtlid: number): Promise<void> => {
    const { error } = await supabase
      .from("promotiondetail")
      .delete()
      .eq("reqdtlid", reqdtlid);
    if (error) throw error;
  };

  return { combos, totalCount, loading, error, fetchCombos, deleteCombo };
}
