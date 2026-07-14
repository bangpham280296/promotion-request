"use client";

import React from "react";
import type { VoucherifyPush } from "@/types/voucherify";

interface Props {
  latestPush: VoucherifyPush | null;
  onPushClick: () => void;
}

export default function VoucherifyStatusBadge({ latestPush, onPushClick }: Props) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {latestPush?.push_status === "success" && latestPush.voucherify_campaign_id ? (
        <a
          href={`https://app.voucherify.io/#/campaigns/${latestPush.voucherify_campaign_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 hover:underline"
          title={`Campaign: ${latestPush.voucherify_campaign_id}`}
        >
          ✓ {latestPush.voucherify_campaign_id.slice(0, 12)}…
        </a>
      ) : latestPush?.push_status === "failed" ? (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
          title={latestPush.push_error ?? "Push failed"}
        >
          ✗ Failed
        </span>
      ) : null}

      <button
        onClick={onPushClick}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors border border-brand-200 dark:border-brand-500/30"
        title="Push to Voucherify"
      >
        ↑ Push
      </button>
    </div>
  );
}
