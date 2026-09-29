import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { requireAdmin } from "@/lib/auth/apiGuards";

export async function POST(req: Request) {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    try {
        const body = await req.json();
        const { email, password, fullname, employeecode, department_id, role } = body;

        // 1. Validation
        if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
        }

        if (!password || typeof password !== "string" || password.length < 6) {
            return NextResponse.json(
                { error: "Password must be at least 6 characters." },
                { status: 400 }
            );
        }

        if (!fullname || typeof fullname !== "string" || !fullname.trim()) {
            return NextResponse.json({ error: "Full name is required." }, { status: 400 });
        }

        if (!employeecode || typeof employeecode !== "string" || !employeecode.trim()) {
            return NextResponse.json({ error: "Employee code is required." }, { status: 400 });
        }

        const deptIdNum = Number(department_id);
        if (!department_id || isNaN(deptIdNum)) {
            return NextResponse.json({ error: "Please select a valid department." }, { status: 400 });
        }

        if (role !== "admin" && role !== "user") {
            return NextResponse.json(
                { error: "Role must be either 'admin' or 'user'." },
                { status: 400 }
            );
        }

        // 2. Create Auth User
        const authResult = await supabaseAdmin.auth.admin.createUser({
            email: email.trim().toLowerCase(),
            password,
            email_confirm: true,
        });

        if (authResult.error || !authResult.data.user) {
            return NextResponse.json(
                { error: authResult.error?.message || "Failed to create authentication user." },
                { status: 400 }
            );
        }

        const newUserId = authResult.data.user.id;

        // 3. Insert into public.employees
        const { error: empError } = await supabaseAdmin.from("employees").insert({
            user_id: newUserId,
            fullname: fullname.trim(),
            employeecode: employeecode.trim(),
            department_id: deptIdNum,
            role,
        });

        if (empError) {
            // Rollback: delete created auth user to avoid orphan record
            console.error("Employee insertion failed, rolling back auth account:", empError);
            await supabaseAdmin.auth.admin.deleteUser(newUserId);
            return NextResponse.json(
                { error: `Failed to create employee profile: ${empError.message}` },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                user: {
                    id: newUserId,
                    email: authResult.data.user.email,
                    fullname: fullname.trim(),
                    employeecode: employeecode.trim(),
                    department_id: deptIdNum,
                    role,
                },
            },
            { status: 201 }
        );
    } catch (err: unknown) {
        console.error("Error in create-user route:", err);
        return NextResponse.json(
            { error: "Internal server error occurred while creating user." },
            { status: 500 }
        );
    }
}
