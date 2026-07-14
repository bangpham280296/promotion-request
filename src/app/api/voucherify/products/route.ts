import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const appId    = process.env.VOUCHERIFY_APP_ID!;
  const appToken = process.env.VOUCHERIFY_APP_TOKEN!;
  const baseUrl  = process.env.VOUCHERIFY_BASE_URL!;

  const params = new URLSearchParams({
    limit: "20",
    order: "-created_at",
    "filters[name][conditions][$contains][0]": q,
  });

  const res = await fetch(`${baseUrl}/v1/products?${params}`, {
    headers: {
      "X-App-Id":    appId,
      "X-App-Token": appToken,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json({ error: body }, { status: res.status });
  }

  const json = await res.json();
  const products = (json.products ?? []).map((p: any) => ({
    id:    p.id,
    name:  p.name,
    price: p.price ?? null,
  }));

  return NextResponse.json({ products });
}
