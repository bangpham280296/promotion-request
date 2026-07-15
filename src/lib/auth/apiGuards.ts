import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }
  return { supabase, user } as const;
}

export async function requireAdmin() {
  const result = await requireUser();
  if ("error" in result) return result;
  const { supabase, user } = result;
  const { data: employee } = await supabase
    .from("employees")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (employee?.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }
  return { supabase, user } as const;
}
