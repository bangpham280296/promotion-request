import { NextResponse } from "next/server";
import { getSqlPool } from "@/lib/sqlserver";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { requireAdmin } from "@/lib/auth/apiGuards";

export type SqlItem = {
  itemcode: string;
  itemname: string;
  price: number;
  category: string | null;
};

export type SyncPreviewResult = {
  missingItems: SqlItem[];
  totalSql: number;
  totalSupabase: number;
};

async function getAllSupabaseItemcodes(): Promise<Set<string>> {
  const codes = new Set<string>();
  const PAGE = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from("items")
      .select("itemcode")
      .range(from, from + PAGE - 1);

    if (error || !data || data.length === 0) break;
    data.forEach((r) => codes.add(String(r.itemcode)));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return codes;
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const query = process.env.SQL_ITEMS_QUERY;
  if (!query) {
    return NextResponse.json(
      { error: "SQL_ITEMS_QUERY is not configured in .env.local" },
      { status: 500 }
    );
  }

  // Column name mapping from env (defaults match query aliases)
  const colCode     = process.env.SQL_COL_ITEMCODE  ?? "itemcode";
  const colName     = process.env.SQL_COL_ITEMNAME  ?? "itemname";
  const colPrice    = process.env.SQL_COL_PRICE     ?? "price";
  const colCategory = process.env.SQL_COL_CATEGORY  ?? "category";

  try {
    const pool = await getSqlPool();
    const result = await pool.request().query(query);

    const sqlItems: SqlItem[] = result.recordset
      .map((row: any) => ({
        itemcode: String(row[colCode] ?? "").trim(),
        itemname: String(row[colName] ?? "").trim(),
        price:    Number(row[colPrice] ?? 0),
        category: row[colCategory] ? String(row[colCategory]).trim() : null,
      }))
      .filter((item) => item.itemcode !== "");

    const existingCodes = await getAllSupabaseItemcodes();

    const missingItems = sqlItems.filter(
      (item) => !existingCodes.has(item.itemcode)
    );

    return NextResponse.json({
      missingItems,
      totalSql:      sqlItems.length,
      totalSupabase: existingCodes.size,
    } satisfies SyncPreviewResult);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to connect to SQL Server" },
      { status: 500 }
    );
  }
}
