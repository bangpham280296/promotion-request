import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { requireAdmin } from "@/lib/auth/apiGuards";

export async function GET() {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    const [authResult, empResult] = await Promise.all([
        supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
        supabaseAdmin.from("employees").select("user_id, fullname"),
    ]);

    if (authResult.error) {
        return NextResponse.json({ error: "Failed to fetch users." }, { status: 500 });
    }

    const fullnameMap = new Map<string, string>(
        (empResult.data ?? []).map((e) => [e.user_id, e.fullname])
    );

    const users = authResult.data.users.map((u) => ({
        id: u.id,
        email: u.email ?? "",
        fullname: fullnameMap.get(u.id) ?? "",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
    }));

    return NextResponse.json({ users });
}
