// src/app/api/voucherify/templates/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify admin role
  const { data: emp } = await supabase
    .from("employees")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (!emp || emp.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
