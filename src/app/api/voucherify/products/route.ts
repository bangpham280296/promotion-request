import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/apiGuards";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const appId    = process.env.VOUCHERIFY_APP_ID;
  const appToken = process.env.VOUCHERIFY_APP_TOKEN;
  const baseUrl  = process.env.VOUCHERIFY_BASE_URL;

  if (!appId || !appToken || !baseUrl) {
    return NextResponse.json({ error: "Missing Voucherify env vars" }, { status: 500 });
  }

  const params = new URLSearchParams({
    limit: "20",
    order: "-created_at",
    "filters[name][conditions][$contains][0]": q,
  });

  const res = await fetch(`${baseUrl}products?${params}`, {
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
