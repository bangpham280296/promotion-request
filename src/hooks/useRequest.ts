"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";

export default function useRequest() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // GET ALL — includes promotiondetail, status, department, employee
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("requests")
      .select(`
        *,
        promotiondetail(*),
        department(deptname),
        employees:employees!request_requester_fkey (fullname),
        stt:status(*)
      `)
      .order("reqid", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setRequests(data || []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // CREATE — atomic: cả requests + promotiondetail trong 1 PostgreSQL transaction
  const addRequest = async (req: any, details: any[]) => {
    const { data, error } = await supabase.rpc("insert_request_with_details", {
      p_req: req,
      p_details: details,
    });

    if (error) throw error;

    return data as { reqid: number; requestcode: string };
  };

  // EDIT — mirrors useUserRequests: UPDATE header + 3-way detail sync
  const editRequest = async (
    reqid: number,
    header: any,
    details: any[],
    originalDetails: any[]
  ) => {
    const vnNow = new Date()
      .toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" })
      .replace(" ", "T") + "+07:00";

    const { error: headerError } = await supabase
      .from("requests")
      .update({
        promotionname: header.promotionname,
        startdate: header.startdate,
        enddate: header.enddate,
        updateat: vnNow,
      })
      .eq("reqid", reqid);

    if (headerError) throw headerError;

    const toUpdate = details.filter((d) => d.reqdtlid);
    const toInsert = details.filter((d) => !d.reqdtlid);
    const toDelete = originalDetails.filter(
      (od) => od.reqdtlid && !details.find((d) => d.reqdtlid === od.reqdtlid)
    );

    for (const d of toUpdate) {
      const { error } = await supabase
        .from("promotiondetail")
        .update({
          itemcode: d.itemcode,
          itemname: d.itemname,
          description: d.description,
          itemtype: d.itemtype || null,
          discount: d.discount ?? null,
          price: d.price ?? null,
          startdate: d.startdate || null,
          enddate: d.enddate || null,
          servicetype: d.servicetype || null,
          notes: d.notes || null,
          updateat: new Date().toISOString(),
        })
        .eq("reqdtlid", d.reqdtlid);
      if (error) throw error;
    }

    if (toInsert.length > 0) {
      const { error } = await supabase.from("promotiondetail").insert(
        toInsert.map((d) => ({
          reqid,
          itemcode: d.itemcode,
          itemname: d.itemname,
          description: d.description,
          itemtype: d.itemtype || null,
          discount: d.discount ?? null,
          price: d.price ?? null,
          startdate: d.startdate || null,
          enddate: d.enddate || null,
          servicetype: d.servicetype || null,
          notes: d.notes || null,
        }))
      );
      if (error) throw error;
    }

    for (const d of toDelete) {
      const { error } = await supabase
        .from("promotiondetail")
        .delete()
        .eq("reqdtlid", d.reqdtlid);
      if (error) throw error;
    }

    await fetchRequests();
  };

  // DELETE
  const removeRequest = async (reqid: number) => {
    const { error } = await supabase
      .from("requests")
      .delete()
      .eq("reqid", reqid);

    if (error) throw error;

    setRequests((prev) => prev.filter((item) => item.reqid !== reqid));
  };

  return {
    requests,
    loading,
    error,
    fetchRequests,
    addRequest,
    editRequest,
    removeRequest,
  };
}
