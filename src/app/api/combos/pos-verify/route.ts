// src/app/api/combos/pos-verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

type ComboInput = {
  reqdtlid: number;
  itemcode: string;
  itemname: string;
  enddate: string | null;
};

type POSCombo = {
  id: number;
  name: string;
  startdate: string | null;
  enddate: string | null;
  active: "Y" | "N";
};

type Difference = {
  field: "name" | "enddate" | "active";
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

  const posName = (pos.name ?? "").trim();
  const inputName = (input.itemname ?? "").trim();
  if (posName !== inputName) {
    diffs.push({ field: "name", requestValue: inputName, posValue: posName });
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
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
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

  let body: { combos?: ComboInput[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { combos } = body;

  if (!Array.isArray(combos)) {
    return NextResponse.json({ error: "Invalid request body: combos must be an array" }, { status: 400 });
  }

  const posUrl = process.env.POS_COMBO_API_URL;
  const posApiKey = process.env.POS_COMBO_API_KEY;
  if (!posUrl) {
    return NextResponse.json(
      { error: "POS_COMBO_API_URL is not configured in .env.local" },
      { status: 500 }
    );
  }

  let posCombos: POSCombo[];
  try {
    const headers: Record<string, string> = {};
    if (posApiKey) headers["X-API-KEY"] = posApiKey;
    const res = await fetch(posUrl, { headers });
    if (!res.ok) throw new Error(`POS API returned ${res.status}`);
    posCombos = await res.json();
    if (!Array.isArray(posCombos)) {
      return NextResponse.json({ error: "POS API returned unexpected data format" }, { status: 502 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch POS data: ${message}` },
      { status: 502 }
    );
  }

  const posMap = new Map<string, POSCombo>(
    posCombos.map((c) => [String(c.id), c])
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

  const matchedAny = results.some((r) => r.posStatus !== "not_found");
  const diagnosticWarn =
    results.length > 0 && !matchedAny
      ? "0 POS records matched — verify POS_COMBO_API_URL and proid field format"
      : undefined;

  return NextResponse.json({
    results,
    verifiedAt: new Date().toISOString(),
    ...(diagnosticWarn ? { warn: diagnosticWarn } : {}),
  });
}
