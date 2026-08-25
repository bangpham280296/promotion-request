import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/apiGuards";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Requires Next 15 params promise
  const { id: campaignId } = await params;

  if (!campaignId) {
    return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 });
  }

  // 1. Require Admin authentication
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const appId = process.env.VOUCHERIFY_APP_ID;
  const appToken = process.env.VOUCHERIFY_APP_TOKEN;
  const baseUrl = process.env.VOUCHERIFY_BASE_URL;

  if (!appId || !appToken || !baseUrl) {
    return NextResponse.json(
      { error: "Voucherify environment variables are not configured" },
      { status: 500 }
    );
  }

  // 2. We need the `pushId` from the client to update the database
  const { searchParams } = new URL(request.url);
  const pushId = searchParams.get("pushId");

  try {
    // 3. Call Voucherify DELETE API
    // VOUCHERIFY_CAMPAIGN_CREATION.md states: "DELETE /v1/campaigns/{id} to clean up"
    const endpoint = `${baseUrl}campaigns/${campaignId}`;
    const vRes = await fetch(endpoint, {
      method: "DELETE",
      headers: {
        "X-App-Id": appId,
        "X-App-Token": appToken,
        "Content-Type": "application/json",
      },
    });

    if (!vRes.ok) {
      const errorText = await vRes.text();
      let errorObj;
      try {
        errorObj = JSON.parse(errorText);
      } catch (e) {
        // Not JSON
      }
      return NextResponse.json(
        { error: errorObj?.message || `Voucherify API Error: ${vRes.statusText}` },
        { status: vRes.status }
      );
    }

    // Voucherify DELETE is async, returns 202 {"async_action_id": "..."}
    // We treat it as successful if we reach here (200, 202, 204 are okay).

    // 4. Update the push record status in DB (if pushId was provided)
    if (pushId) {
      const { error: dbError } = await supabaseAdmin
        .from("voucherify_pushes")
        .update({
          push_status: "deleted",
          push_error: "Campaign was deleted manually",
          // We don't wipe the voucherify_campaign_id so we have a trace,
          // but we set status to 'deleted' to allow re-pushing from UI.
        })
        .eq("id", pushId);

      if (dbError) {
        console.error("Failed to update push_status to deleted:", dbError);
        // We still return success for the API because the campaign was deleted in Voucherify
      }
    }

    return NextResponse.json({ success: true, message: "Campaign deleted successfully" });
  } catch (err: any) {
    console.error("Error deleting Voucherify campaign:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
