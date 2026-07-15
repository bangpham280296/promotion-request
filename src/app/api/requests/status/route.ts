import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/apiGuards";

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const { reqid, sttId } = await request.json();
  if (!reqid || !sttId) {
    return NextResponse.json({ error: "reqid and sttId are required" }, { status: 400 });
  }

  const { error } = await supabase.from("requests").update({ stt: sttId }).eq("reqid", reqid);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
