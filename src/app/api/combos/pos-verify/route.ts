// src/app/api/combos/pos-verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

type ComboInput = {
  reqdtlid: number;
  itemcode: string;
  itemname: string;
  enddate: string | null;
};

type POSCombo = {
  proid: string;
  proname: string;
  startdate: string | null;
  enddate: string | null;
  active: "Y" | "N";
};

type Difference = {
  field: "proname" | "enddate" | "active";
  requestValue: string;
  posValue: string;
};

type VerifyResult = {
  reqdtlid: number;
  itemcode: string;
  posStatus: "matched" | "mismatch" | "not_found";
  differences: Difference[];
};

function normalizeDate(d: string | null): string {
  if (!d) return "";
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return d;
  return parsed.toISOString().substring(0, 10);
}

function compareCombo(input: ComboInput, pos: POSCombo): Difference[] {
  const diffs: Difference[] = [];

  if (pos.proname.trim() !== input.itemname.trim()) {
    diffs.push({
      field: "proname",
      requestValue: input.itemname.trim(),
      posValue: pos.proname.trim(),
    });
  }

  const dbEnd = normalizeDate(input.enddate);
  const posEnd = normalizeDate(pos.enddate);
  if (dbEnd !== posEnd) {
    diffs.push({
      field: "enddate",
      requestValue: input.enddate ?? "—",
      posValue: pos.enddate ?? "—",
    });
  }

  if (pos.active !== "Y") {
    diffs.push({ field: "active", requestValue: "Y", posValue: pos.active });
  }

  return diffs;
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: emp } = await supabaseAdmin
    .from("employees")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (emp?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { combos } = (await req.json()) as { combos: ComboInput[] };

  const posUrl = process.env.POS_COMBO_API_URL;
  if (!posUrl) {
    return NextResponse.json(
      { error: "POS_COMBO_API_URL is not configured in .env.local" },
      { status: 500 }
    );
  }

  let posCombos: POSCombo[];
  try {
    const res = await fetch(posUrl);
    if (!res.ok) throw new Error(`POS API returned ${res.status}`);
    posCombos = await res.json();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch POS data: ${message}` },
      { status: 502 }
    );
  }

  const posMap = new Map<string, POSCombo>(
    posCombos.map((c) => [String(c.proid), c])
  );

  const results: VerifyResult[] = combos.map((input) => {
    const pos = posMap.get(String(input.itemcode));
    if (!pos) {
      return {
        reqdtlid: input.reqdtlid,
        itemcode: input.itemcode,
        posStatus: "not_found",
        differences: [],
      };
    }
    const differences = compareCombo(input, pos);
    return {
      reqdtlid: input.reqdtlid,
      itemcode: input.itemcode,
      posStatus: differences.length === 0 ? "matched" : "mismatch",
      differences,
    };
  });

  return NextResponse.json({ results, verifiedAt: new Date().toISOString() });
}
