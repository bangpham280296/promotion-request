"use client";

import React from "react";
import { type POSVerifyResult, type POSDifference } from "@/hooks/usePOSVerify";

export type PosFilter = "matched" | "mismatch" | "not_found" | null;

// ─── Verify Button ───────────────────────────────────────────────────────────

type ButtonProps = {
    onClick: () => void;
    loading: boolean;
    disabled?: boolean;
};

export function POSVerifyButton({ onClick, loading, disabled }: ButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={loading || disabled}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-brand-500 text-brand-600 hover:bg-brand-50 dark:border-brand-400 dark:text-brand-400 dark:hover:bg-brand-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
            {loading ? (
                <>
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Verifying...
                </>
            ) : (
                "Verify POS"
            )}
        </button>
    );
}

// ─── Filter / Summary Bar ─────────────────────────────────────────────────────

type FilterBarProps = {
    results: POSVerifyResult[];
    posFilter: PosFilter;
    onFilterChange: (f: PosFilter) => void;
    verifiedAt: string | null;
};

export function POSVerifyFilterBar({ results, posFilter, onFilterChange, verifiedAt }: FilterBarProps) {
    const matchedCount = results.filter((r) => r.posStatus === "matched").length;
    const mismatchCount = results.filter((r) => r.posStatus === "mismatch").length;
    const notFoundCount = results.filter((r) => r.posStatus === "not_found").length;

    return (
        <div className="px-4 py-2.5 border-b border-gray-100 dark:border-white/[0.07] flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
                <button
                    onClick={() => onFilterChange(posFilter === "matched" ? null : "matched")}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                        posFilter === "matched"
                            ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30"
                            : "bg-white text-green-600 border-green-200 hover:bg-green-50 dark:bg-transparent dark:text-green-400 dark:border-green-500/30 dark:hover:bg-green-500/10"
                    }`}
                >
                    ✅ {matchedCount} matched
                </button>
                <button
                    onClick={() => onFilterChange(posFilter === "mismatch" ? null : "mismatch")}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                        posFilter === "mismatch"
                            ? "bg-red-100 text-red-700 border-red-300 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30"
                            : "bg-white text-red-600 border-red-200 hover:bg-red-50 dark:bg-transparent dark:text-red-400 dark:border-red-500/30 dark:hover:bg-red-500/10"
                    }`}
                >
                    ❌ {mismatchCount} mismatch
                </button>
                <button
                    onClick={() => onFilterChange(posFilter === "not_found" ? null : "not_found")}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                        posFilter === "not_found"
                            ? "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/30"
                            : "bg-white text-orange-500 border-orange-200 hover:bg-orange-50 dark:bg-transparent dark:text-orange-400 dark:border-orange-500/30 dark:hover:bg-orange-500/10"
                    }`}
                >
                    ⚠️ {notFoundCount} not found
                </button>
                {posFilter && (
                    <button
                        onClick={() => onFilterChange(null)}
                        className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        Clear filter
                    </button>
                )}
            </div>
            {verifiedAt && (
                <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                    Verified at: {new Date(verifiedAt).toLocaleString("vi-VN")}
                </span>
            )}
        </div>
    );
}

// ─── Per-row Status Cell ──────────────────────────────────────────────────────

type StatusCellProps = {
    posResult: POSVerifyResult | undefined;
    isCombo: boolean;
    isExpanded: boolean;
    onToggle: () => void;
};

export function POSVerifyStatusCell({ posResult, isCombo, isExpanded, onToggle }: StatusCellProps) {
    if (!isCombo || !posResult) {
        return <span className="text-gray-300 text-xs">—</span>;
    }
    if (posResult.posStatus === "matched") {
        return <span className="text-xs font-medium text-green-600 dark:text-green-400">✅ Matched</span>;
    }
    if (posResult.posStatus === "not_found") {
        return <span className="text-xs font-medium text-orange-500">⚠️ Not Found</span>;
    }
    return (
        <button
            onClick={onToggle}
            className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 transition-colors"
        >
            ❌ Mismatch
            <span className="text-gray-400 text-[10px]">{isExpanded ? "▲" : "▼"}</span>
        </button>
    );
}

// ─── Inline Diff Row ──────────────────────────────────────────────────────────

type DiffRowProps = {
    colSpan: number;
    differences: POSDifference[];
};

export function POSVerifyDiffRow({ colSpan, differences }: DiffRowProps) {
    return (
        <tr className="bg-red-50/50 dark:bg-red-500/5">
            <td colSpan={colSpan} className="px-8 py-3">
                <table className="text-xs w-auto border border-red-200 dark:border-red-500/30 rounded-lg overflow-hidden">
                    <thead>
                        <tr className="bg-red-100/60 dark:bg-red-500/10">
                            <th className="px-3 py-1.5 text-left font-medium text-gray-500 dark:text-gray-400">Field</th>
                            <th className="px-3 py-1.5 text-left font-medium text-gray-500 dark:text-gray-400">Request (DB)</th>
                            <th className="px-3 py-1.5 text-left font-medium text-gray-500 dark:text-gray-400">POS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {differences.map((diff) => (
                            <tr key={diff.field} className="border-t border-red-200/50 dark:border-red-500/20">
                                <td className="px-3 py-1.5 font-mono text-gray-500 dark:text-gray-400">{diff.field}</td>
                                <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{diff.requestValue}</td>
                                <td className="px-3 py-1.5 text-red-600 dark:text-red-400 font-medium">{diff.posValue}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </td>
        </tr>
    );
}
