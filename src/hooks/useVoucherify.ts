"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import type {
  VoucherifyPush,
  PushCampaignInput,
  PushCampaignResponse,
  VoucherifyTemplate,
  VoucherifyProduct,
} from "@/types/voucherify";

export function useVoucherify() {
  const [historyByReqdtlid, setHistoryByReqdtlid] = useState<
    Record<number, VoucherifyPush[]>
  >({});
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async (reqdtlid: number) => {
    setError(null);
    const { data, error: dbErr } = await supabase
      .from("voucherify_pushes")
      .select("*")
      .eq("reqdtlid", reqdtlid)
      .order("createdat", { ascending: false });

    if (dbErr) {
      setError(dbErr.message);
      return;
    }
    setHistoryByReqdtlid((prev) => ({
      ...prev,
      [reqdtlid]: (data as VoucherifyPush[]) ?? [],
    }));
  }, []);

  // Lấy push thành công mới nhất cho 1 reqdtlid
  const getLatestSuccess = useCallback(
    (reqdtlid: number): VoucherifyPush | null => {
      const list = historyByReqdtlid[reqdtlid] ?? [];
      return list.find((p) => p.push_status === "success") ?? null;
    },
    [historyByReqdtlid]
  );

  const pushCampaign = useCallback(
    async (data: PushCampaignInput): Promise<PushCampaignResponse> => {
      setPushing(true);
      setError(null);
      try {
        const res = await fetch("/api/voucherify/push-campaign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok) {
          const errMsg = typeof json.error === "string"
            ? json.error
            : (json.error?.message ?? json.message ?? "Push failed");
          throw new Error(errMsg);
        }
        // Refresh history sau khi push
        await fetchHistory(data.reqdtlid);
        return json as PushCampaignResponse;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Push failed";
        setError(errorMsg);
        throw err;
      } finally {
        setPushing(false);
      }
    },
    [fetchHistory]
  );

  const fetchTemplates = useCallback(async (): Promise<VoucherifyTemplate[]> => {
    try {
      const res = await fetch("/api/voucherify/templates");
      if (!res.ok) return [];
      const json = await res.json();
      return json.templates as VoucherifyTemplate[];
    } catch {
      return [];
    }
  }, []);

  const searchProducts = useCallback(
    async (query: string): Promise<VoucherifyProduct[]> => {
      if (!query.trim()) return [];
      try {
        const res = await fetch(
          `/api/voucherify/products?q=${encodeURIComponent(query)}`
        );
        if (!res.ok) return [];
        const json = await res.json();
        return json.products as VoucherifyProduct[];
      } catch {
        return [];
      }
    },
    []
  );

  return {
    historyByReqdtlid,
    pushing,
    error,
    fetchHistory,
    getLatestSuccess,
    pushCampaign,
    fetchTemplates,
    searchProducts,
  };
}
