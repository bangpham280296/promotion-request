import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { requireAdmin } from "@/lib/auth/apiGuards";

export async function GET() {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    const [authResult, empResult, deptResult] = await Promise.all([
        supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
        supabaseAdmin
            .from("employees")
            .select("user_id, fullname, employeecode, department_id, role, department:department_id(id, deptcode, deptname)"),
        supabaseAdmin
            .from("department")
            .select("id, deptcode, deptname")
            .order("id"),
    ]);

    if (authResult.error) {
        return NextResponse.json({ error: "Failed to fetch users." }, { status: 500 });
    }

    interface EmployeeRecord {
        user_id: string;
        fullname?: string | null;
        employeecode?: string | null;
        department_id?: number | null;
        role?: string | null;
        department?: {
            id: number;
            deptcode: string;
            deptname: string;
        } | null;
    }

    const empMap = new Map<string, EmployeeRecord>(
        ((empResult.data as unknown as EmployeeRecord[]) ?? []).map((e) => [e.user_id, e])
    );

    const users = authResult.data.users.map((u) => {
        const emp = empMap.get(u.id);
        const dept = Array.isArray(emp?.department) ? emp?.department[0] : emp?.department;

        return {
            id: u.id,
            email: u.email ?? "",
            fullname: emp?.fullname ?? "",
            employeecode: emp?.employeecode ?? "",
            role: emp?.role ?? "user",
            department_id: emp?.department_id ?? null,
            deptcode: dept?.deptcode ?? "",
            deptname: dept?.deptname ?? "",
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at ?? null,
        };
    });

    return NextResponse.json({
        users,
        departments: deptResult.data ?? [],
    });
}

