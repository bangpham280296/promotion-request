"use client";

import { useState, useCallback } from "react";

export type POSDifference = {
  field: "proname" | "enddate" | "active";
  requestValue: string;
  posValue: string;
};

export type POSVerifyResult = {
  reqdtlid: number;
  itemcode: string;
  posStatus: "matched" | "mismatch" | "not_found";
  differences: POSDifference[];
};

export type ComboVerifyInput = {
  reqdtlid: number;
  itemcode: string;
  itemname: string;
  enddate: string | null;
};

export function usePOSVerify() {
  const [results, setResults] = useState<POSVerifyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);

  const verify = useCallback(async (combos: ComboVerifyInput[]) => {
    if (combos.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/combos/pos-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ combos }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed with status ${res.status}`);
      }

      const data = await res.json();
      setResults(data.results);
      setVerifiedAt(data.verifiedAt);
    } catch (err: any) {
      setError(err.message ?? "Verify failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResults([]);
    setError(null);
    setVerifiedAt(null);
  }, []);

  return { results, loading, error, verifiedAt, verify, reset };
}
