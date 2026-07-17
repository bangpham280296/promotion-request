// src/app/api/voucherify/push-campaign/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { requireAdmin } from "@/lib/auth/apiGuards";
import type { PushCampaignInput, PushCampaignResponse } from "@/types/voucherify";

function buildVoucherifyBody(req: PushCampaignInput, baseMetadata: Record<string, unknown>): Record<string, unknown> {
  // THE ONE RULE: merge campaign + voucher metadata into 1 single object
  const metadata: Record<string, unknown> = {
    // Fallback cho dòng Discount cũ chưa có discount_metadata (tạo trước khi feature này ra đời)
    title_en: req.campaign_name,
    title_vi: req.campaign_name,
    short_description_en: req.campaign_name,
    short_description_vi: req.campaign_name,
    ...baseMetadata, // dữ liệu thật đã lưu ghi đè fallback ở trên
    discount_or_egc:       req.discount_or_egc,
    campaign_type_pos:     req.campaign_type_pos,
    campaign_type_nonpos:  req.campaign_type_nonpos,
    display_priority:      req.display_priority,
  };

  const base: Record<string, unknown> = {
    name: req.campaign_name,
    use_voucher_metadata_schema: true,
    metadata,
    ...(req.start_date      && { start_date:       req.start_date }),
    ...(req.expiration_date && { expiration_date:  req.expiration_date }),
    ...(req.vouchers_count  && { vouchers_count:   req.vouchers_count }),
  };

  const codeConfig = req.code_pattern
    ? { code_config: { pattern: req.code_pattern } }
    : {};

  if (req.mode === "A") {
    return { ...base, voucher: { ...codeConfig } };
  }

  if (req.mode === "B") {
    return {
      ...base,
      campaign_type: "DISCOUNT_COUPONS",
      type: "STATIC",
      voucher: {
        type: "DISCOUNT_VOUCHER",
        discount: {
          type: "UNIT",
          unit_off: 1,
          unit_type: req.product_id,
          effect: req.unit_effect ?? "ADD_MISSING_ITEMS",
          product: { id: req.product_id },
        },
        ...codeConfig,
      },
    };
  }

  // Mode C
  const discountC =
    req.discount_type === "PERCENT"
      ? {
          type: "PERCENT",
          percent_off: req.discount_percent,
          effect: req.amount_effect ?? "APPLY_TO_ORDER",
          ...(req.max_discount_cap && {
            amount_limit: Math.round(req.max_discount_cap * 100),
          }),
        }
      : {
          type: "AMOUNT",
          amount_off: Math.round((req.discount_value_vnd ?? 0) * 100),
          effect: req.amount_effect ?? "APPLY_TO_ORDER",
        };

  return {
    ...base,
    campaign_type: "DISCOUNT_COUPONS",
    type: "STATIC",
    voucher: {
      type: "DISCOUNT_VOUCHER",
      discount: discountC,
      ...codeConfig,
    },
  };
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const body: PushCampaignInput = await request.json();

  // Validate required fields
  if (!body.reqdtlid || !body.reqid || !body.mode || !body.campaign_name) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (body.mode === "A" && !body.template_id) {
    return NextResponse.json({ error: "template_id required for Mode A" }, { status: 400 });
  }
  if (body.mode === "B" && !body.product_id) {
    return NextResponse.json({ error: "product_id required for Mode B" }, { status: 400 });
  }
  if (body.mode === "C" && !body.discount_type) {
    return NextResponse.json({ error: "discount_type required for Mode C" }, { status: 400 });
  }

  const appId    = process.env.VOUCHERIFY_APP_ID;
  const appToken = process.env.VOUCHERIFY_APP_TOKEN;
  const baseUrl  = process.env.VOUCHERIFY_BASE_URL;

  if (!appId || !appToken || !baseUrl) {
    return NextResponse.json(
      { error: `Missing Voucherify env vars: ${[!appId && "VOUCHERIFY_APP_ID", !appToken && "VOUCHERIFY_APP_TOKEN", !baseUrl && "VOUCHERIFY_BASE_URL"].filter(Boolean).join(", ")}` },
      { status: 500 }
    );
  }

  const { data: storedMeta } = await supabaseAdmin
    .from("discount_metadata")
    .select("metadata")
    .eq("reqdtlid", body.reqdtlid)
    .maybeSingle();

  const baseMetadata = (storedMeta?.metadata as Record<string, unknown>) ?? {};
  const voucherifyBody = buildVoucherifyBody(body, baseMetadata);

  // Select endpoint by mode
  const endpoint =
    body.mode === "A"
      ? `${baseUrl}templates/campaigns/${body.template_id}/campaign-setup`
      : `${baseUrl}campaigns`;

  // INSERT pending record first to get push_id
  const { data: pushRecord, error: insertError } = await supabaseAdmin
    .from("voucherify_pushes")
    .insert({
      reqdtlid:      body.reqdtlid,
      reqid:         body.reqid,
      pushed_by:     user.id,
      mode:          body.mode,
      template_id:   body.template_id ?? null,
      campaign_name: body.campaign_name,
      vouchers_count: body.vouchers_count ?? null,
      code_pattern:   body.code_pattern ?? null,
      product_id:     body.product_id ?? null,
      product_name:   body.product_name ?? null,
      discount_type:       body.discount_type ?? null,
      discount_value_vnd:  body.discount_value_vnd ?? null,
      discount_percent:    body.discount_percent ?? null,
      max_discount_cap:    body.max_discount_cap ?? null,
      metadata_sent:       (voucherifyBody as { metadata?: unknown }).metadata ?? null,
      push_status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !pushRecord) {
    return NextResponse.json({ error: "Failed to create push record" }, { status: 500 });
  }

  const pushId = pushRecord.id as number;

  try {
    // Call Voucherify API
    const vRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "X-App-Id":     appId,
        "X-App-Token":  appToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(voucherifyBody),
    });

    const vJson = await vRes.json();

    if (!vRes.ok) {
      // Update push record with failed status
      await supabaseAdmin
        .from("voucherify_pushes")
        .update({
          push_status: "failed",
          push_error:  JSON.stringify(vJson),
        })
        .eq("id", pushId);

      return NextResponse.json({ error: vJson }, { status: vRes.status });
    }

    // Mode A response: campaign.id; Mode B/C: id
    const campaignId: string =
      body.mode === "A" ? vJson.campaign?.id : vJson.id;

    // Null-guard: if campaignId is missing, treat as failed
    if (!campaignId) {
      await supabaseAdmin
        .from("voucherify_pushes")
        .update({
          push_status: "failed",
          push_error: "Campaign ID not found in response",
        })
        .eq("id", pushId);

      return NextResponse.json({ error: "Campaign ID not found in response" }, { status: 500 });
    }

    // Update push record with success
    const { error: updateError } = await supabaseAdmin
      .from("voucherify_pushes")
      .update({
        voucherify_campaign_id: campaignId,
        push_status: "success",
        pushed_at:   new Date().toISOString(),
      })
      .eq("id", pushId);

    if (updateError) console.error("Failed to update push record:", updateError);

    const result: PushCampaignResponse = {
      push_id:     pushId,
      campaign_id: campaignId,
      push_status: "success",
    };

    return NextResponse.json(result);
  } catch (err) {
    // Update the push record to failed
    await supabaseAdmin
      .from("voucherify_pushes")
      .update({
        push_status: "failed",
        push_error: err instanceof Error ? err.message : String(err),
      })
      .eq("id", pushId);

    return NextResponse.json({ error: "Network or parse error calling Voucherify" }, { status: 502 });
  }
}
