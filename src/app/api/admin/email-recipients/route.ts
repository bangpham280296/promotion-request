import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/apiGuards";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

// Helper regex to validate email format ending with @kfcvietnam.com.vn
const KFC_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@kfcvietnam\.com\.vn$/i;

// GET: Fetch all email recipients
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { data, error } = await supabaseAdmin
    .from("notification_recipients")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    // If table doesn't exist yet, return helpful message
    if (error.code === "PGRST205") {
      return NextResponse.json(
        {
          recipients: [],
          warning: "Table 'notification_recipients' does not exist in Supabase yet. Please run the migration SQL script.",
        },
        { status: 200 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ recipients: data ?? [] });
}

// POST: Add new recipient
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json().catch(() => null);
    const { email, name, recipient_type, is_active } = body || {};

    const trimmedEmail = (email || "").trim().toLowerCase();

    // Validate email format and domain
    if (!trimmedEmail || !KFC_EMAIL_REGEX.test(trimmedEmail)) {
      return NextResponse.json(
        { error: "Only email addresses ending with @kfcvietnam.com.vn are accepted" },
        { status: 400 }
      );
    }

    // Validate recipient_type
    const upperType = (recipient_type || "TO").toUpperCase();
    if (upperType !== "TO" && upperType !== "CC") {
      return NextResponse.json(
        { error: "Recipient type must be either TO or CC" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("notification_recipients")
      .insert([
        {
          email: trimmedEmail,
          name: name?.trim() || null,
          recipient_type: upperType,
          is_active: is_active ?? true,
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "This email address is already on the recipient list" },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, recipient: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

// PATCH: Update recipient details (email, name, recipient_type, is_active)
export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json().catch(() => null);
    const { id, email, name, recipient_type, is_active } = body || {};

    if (!id) {
      return NextResponse.json({ error: "Missing recipient ID" }, { status: 400 });
    }

    const updates: Record<string, any> = {};

    if (typeof email === "string") {
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail || !KFC_EMAIL_REGEX.test(trimmedEmail)) {
        return NextResponse.json(
          { error: "Only email addresses ending with @kfcvietnam.com.vn are accepted" },
          { status: 400 }
        );
      }
      updates.email = trimmedEmail;
    }

    if (typeof is_active === "boolean") {
      updates.is_active = is_active;
    }

    if (recipient_type) {
      const upperType = recipient_type.toUpperCase();
      if (upperType !== "TO" && upperType !== "CC") {
        return NextResponse.json(
          { error: "Recipient type must be either TO or CC" },
          { status: 400 }
        );
      }
      updates.recipient_type = upperType;
    }

    if (typeof name === "string") {
      updates.name = name.trim();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields provided to update" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("notification_recipients")
      .update(updates)
      .eq("id", Number(id))
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "This email address is already on the recipient list" },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, recipient: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

// DELETE: Remove recipient
export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");

    if (!id) {
      const body = await request.json().catch(() => null);
      id = body?.id;
    }

    if (!id) {
      return NextResponse.json({ error: "Missing recipient ID to delete" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("notification_recipients")
      .delete()
      .eq("id", Number(id));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Recipient deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
