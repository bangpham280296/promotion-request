import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";

export function useUserRequests(userId: string | null) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data, error } = await supabase
      .from("requests")
      .select(`
      *,
      promotiondetail(*),
      department(deptname),
      employees:employees!request_requester_fkey (fullname),
      stt:status(*)
      `)
      .eq("requester", userId)
      .order("reqid", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setRequests(data);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const editRequest = async (reqid: number, header: any, details: any[], originalDetails: any[]) => {
    const nowVN = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).replace(" ", "T") + "+07:00";

    // 1. UPDATE header
    const { error: headerError } = await supabase
      .from("requests")
      .update({
        promotionname: header.promotionname,
        startdate: header.startdate,
        enddate: header.enddate,
        updateat: nowVN,
      })
      .eq("reqid", reqid);

    if (headerError) throw headerError;

    // Phân loại details
    const toUpdate = details.filter((d) => d.reqdtlid);
    const toInsert = details.filter((d) => !d.reqdtlid);
    const currentIds = new Set(toUpdate.map((d) => d.reqdtlid));
    const toDelete = originalDetails.filter((d) => d.reqdtlid && !currentIds.has(d.reqdtlid));

    const mapDetail = (d: any) => ({
      itemcode: d.itemcode,
      itemname: d.itemname,
      description: d.description,
      itemtype: d.itemtype || null,
      discount: d.discount || null,
      price: d.price ?? null,
      startdate: d.startdate || null,
      enddate: d.enddate || null,
      servicetype: d.servicetype || null,
      notes: d.notes || null,
    });

    // 2. UPDATE các item đã có reqdtlid
    for (const d of toUpdate) {
      const { error } = await supabase
        .from("promotiondetail")
        .update(mapDetail(d))
        .eq("reqdtlid", d.reqdtlid);
      if (error) throw error;
    }

    // 3. INSERT các item mới (không có reqdtlid)
    if (toInsert.length > 0) {
      const { error } = await supabase
        .from("promotiondetail")
        .insert(toInsert.map((d) => ({ reqid, ...mapDetail(d) })));
      if (error) throw error;
    }

    // 4. DELETE các item bị xóa khỏi danh sách
    if (toDelete.length > 0) {
      const { error } = await supabase
        .from("promotiondetail")
        .delete()
        .in("reqdtlid", toDelete.map((d) => d.reqdtlid));
      if (error) throw error;
    }

    // 5. Refresh danh sách
    await fetchRequests();
  };

  return { requests, loading, error, editRequest, fetchRequests };
}
