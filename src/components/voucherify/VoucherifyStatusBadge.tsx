"use client";

import React, { useState } from "react";
import type { VoucherifyPush } from "@/types/voucherify";

interface Props {
  latestPush: VoucherifyPush | null;
  onPushClick: () => void;
  onDeleteClick?: (pushId: number, campaignId: string) => void;
  isDeleting?: boolean;
}

export default function VoucherifyStatusBadge({ latestPush, onPushClick, onDeleteClick, isDeleting }: Props) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleDelete = () => {
    if (!latestPush?.voucherify_campaign_id || !onDeleteClick) return;
    onDeleteClick(latestPush.id, latestPush.voucherify_campaign_id);
    setIsConfirming(false);
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {latestPush?.push_status === "success" && latestPush.voucherify_campaign_id ? (
        <>
          <a
            href={`https://app.voucherify.io/#/campaigns/${latestPush.voucherify_campaign_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 hover:underline"
            title={`Campaign: ${latestPush.voucherify_campaign_id}`}
          >
            ✓ {latestPush.voucherify_campaign_id.slice(0, 12)}…
          </a>

          {onDeleteClick && (
            isConfirming ? (
              <div className="flex items-center gap-1 bg-red-50 dark:bg-red-500/10 rounded-full px-1.5 py-1 border border-red-100 dark:border-red-500/20 shadow-sm animate-in fade-in slide-in-from-left-2 duration-200">
                <button
                  onClick={() => setIsConfirming(false)}
                  disabled={isDeleting}
                  className="px-2 py-0.5 text-[11px] font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-3 py-0.5 text-[11px] font-medium text-white bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center min-w-[50px] transition-colors disabled:opacity-50"
                >
                  {isDeleting ? "..." : "Delete"}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsConfirming(true)}
                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                title="Delete Campaign"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )
          )}
        </>
      ) : latestPush?.push_status === "failed" ? (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
          title={latestPush.push_error ?? "Push failed"}
        >
          ✗ Failed
        </span>
      ) : latestPush?.push_status === "deleted" ? (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          title={latestPush.push_error ?? "Campaign deleted"}
        >
          🗑️ Deleted
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
