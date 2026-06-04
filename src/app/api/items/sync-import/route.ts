import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import type { SqlItem } from "../sync-preview/route";

export async function POST(req: NextRequest) {
  try {
    const { items }: { items: SqlItem[] } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    const rows = items.map((item) => ({
      itemcode: item.itemcode,
      itemname: item.itemname,
      price: item.price,
      status: 1,
      itempicker: false,
      category: null,
    }));

    const { error } = await supabaseAdmin.from("items").insert(rows);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ imported: rows.length });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Import failed" },
      { status: 500 }
    );
  }
}
