// src/app/api/voucherify/templates/route.ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/apiGuards";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const appId    = process.env.VOUCHERIFY_APP_ID;
  const appToken = process.env.VOUCHERIFY_APP_TOKEN;
  const baseUrl  = process.env.VOUCHERIFY_BASE_URL;

  if (!appId || !appToken || !baseUrl) {
    return NextResponse.json({ error: "Missing Voucherify env vars" }, { status: 500 });
  }

  const res = await fetch(`${baseUrl}templates/campaigns`, {
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
  const templates = (json.data ?? []).map((t: any) => ({
    id:          t.id,
    name:        t.name,
    description: t.description ?? "",
  }));

  return NextResponse.json({ templates });
}
