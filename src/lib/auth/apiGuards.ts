import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type SupabaseUser = NonNullable<
  Awaited<ReturnType<SupabaseServerClient["auth"]["getUser"]>>["data"]["user"]
>;

export async function requireUser(): Promise<
  { error: NextResponse } | { supabase: SupabaseServerClient; user: SupabaseUser }
> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { supabase, user };
}

export async function requireAdmin(): Promise<Awaited<ReturnType<typeof requireUser>>> {
  const result = await requireUser();
  if ("error" in result) return result;
  const { supabase, user } = result;
  const { data: employee } = await supabase
    .from("employees")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (employee?.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { supabase, user };
}
