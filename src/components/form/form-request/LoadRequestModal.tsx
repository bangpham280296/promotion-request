"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import Button from "@/components/ui/button/Button";
import { type Row } from "./requestDetailExcel";

type RequestItem = {
    reqid: number;
    requestcode: string;
    startdate: string;
    enddate: string;
    department: { deptname: string } | null;
    employees: { fullname: string } | null;
    promotiondetail: DetailItem[];
};

type DetailItem = {
    reqdtlid: number;
    itemcode: string;
    itemname: string;
    description: string | null;
    itemtype: string | null;
    discount: string | null;
    price: number | null;
    startdate: string | null;
    enddate: string | null;
    servicetype: string | null;
    notes: string | null;
};

type Props = {
    isOpen: boolean;
    existingRows: Row[];
    onAppend: (rows: Row[]) => void;
    onReplace: (rows: Row[]) => void;
    onClose: () => void;
};

function mapToRow(dtl: DetailItem, no: number): Row {
    return {
        no,
        itemcode: dtl.itemcode ?? "",
        itemname: dtl.itemname ?? "",
        description: dtl.description ?? "",
        _descriptionFull: undefined,
        servicetype: dtl.servicetype ?? "",
        discount: dtl.discount ?? null,
        price: dtl.price ?? null,
        startdate: dtl.startdate ?? "",
        enddate: dtl.enddate ?? "",
        notes: dtl.notes ?? "",
        itemtype: dtl.itemtype ?? "item",
    };
}

const TYPE_BADGE: Record<string, string> = {
    combo: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    discount: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
    item: "bg-gray-100 text-gray-500 dark:bg-white/[0.05] dark:text-gray-400",
};

export default function LoadRequestModal({ isOpen, existingRows, onAppend, onReplace, onClose }: Props) {
    const [requests, setRequests] = useState<RequestItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [selectedReqid, setSelectedReqid] = useState<number | null>(null);

    // Fetch khi modal mở lần đầu
    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        setSelectedReqid(null);
        setSearch("");
        supabase
            .from("requests")
            .select(`
                reqid, requestcode, startdate, enddate,
                department(deptname),
                employees:employees!request_requester_fkey(fullname),
                promotiondetail(reqdtlid, itemcode, itemname, description, itemtype, discount, price, startdate, enddate, servicetype, notes)
            `)
            .order("reqid", { ascending: false })
            .then(({ data }) => {
                setRequests((data as unknown as RequestItem[]) ?? []);
                setLoading(false);
            });
    }, [isOpen]);

    if (!isOpen) return null;

    const filtered = requests.filter((r) => {
        const q = search.toLowerCase();
        return (
            r.requestcode?.toLowerCase().includes(q) ||
            r.employees?.fullname?.toLowerCase().includes(q) ||
            r.department?.deptname?.toLowerCase().includes(q)
        );
    });

    const selectedReq = requests.find((r) => r.reqid === selectedReqid) ?? null;
    const selectedDetails = selectedReq?.promotiondetail ?? [];

    const handleAppend = () => {
        const startNo = existingRows.length;
        onAppend(selectedDetails.map((d, i) => mapToRow(d, startNo + i + 1)));
    };

    const handleReplace = () => {
        onReplace(selectedDetails.map((d, i) => mapToRow(d, i + 1)));
    };

    const canCopy = selectedReq !== null && selectedDetails.length > 0;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col w-full max-w-4xl max-h-[85vh]">

                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-100 dark:border-white/[0.05] flex items-center justify-between gap-4 shrink-0">
                    <h2 className="text-base font-semibold text-gray-800 dark:text-white whitespace-nowrap">
                        Load from existing request
                    </h2>
                    <input
                        type="text"
                        placeholder="Search by request code, requester, department..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 max-w-sm text-sm border border-gray-200 dark:border-white/[0.1] rounded-lg px-3 py-1.5 bg-transparent text-gray-700 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                </div>

                {/* Body — 2 panel */}
                <div className="flex flex-1 overflow-hidden min-h-0">

                    {/* Left — request list */}
                    <div className="w-72 shrink-0 border-r border-gray-100 dark:border-white/[0.05] overflow-y-auto">
                        {loading ? (
                            <p className="p-4 text-sm text-gray-400">Loading...</p>
                        ) : filtered.length === 0 ? (
                            <p className="p-4 text-sm text-gray-400">No requests found.</p>
                        ) : (
                            filtered.map((r) => (
                                <div
                                    key={r.reqid}
                                    onClick={() => setSelectedReqid(r.reqid)}
                                    className={`px-4 py-3 cursor-pointer border-b border-gray-50 dark:border-white/[0.03] transition-colors
                                        ${selectedReqid === r.reqid
                                            ? "bg-brand-50 dark:bg-brand-500/10 border-l-[3px] border-l-brand-500"
                                            : "hover:bg-gray-50 dark:hover:bg-white/[0.03] border-l-[3px] border-l-transparent"
                                        }`}
                                >
                                    <p className="text-sm font-medium text-gray-700 dark:text-white leading-snug">
                                        {r.requestcode}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {r.employees?.fullname ?? "—"} · {r.department?.deptname ?? "—"}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {r.startdate ?? "?"} → {r.enddate ?? "?"}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Right — detail preview */}
                    <div className="flex-1 overflow-y-auto">
                        {!selectedReq ? (
                            <div className="flex items-center justify-center h-full text-sm text-gray-400">
                                Select a request on the left to preview its details.
                            </div>
                        ) : selectedDetails.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-sm text-gray-400">
                                This request has no detail items.
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-white/[0.05]">
                                    <tr>
                                        {["No.", "Item Code", "Item Name", "Type", "Price", "Start", "End"].map((h) => (
                                            <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-400">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-white/[0.03]">
                                    {selectedDetails.map((dtl, i) => (
                                        <tr key={dtl.reqdtlid ?? i} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                                            <td className="px-4 py-2 text-gray-400 text-xs">{i + 1}</td>
                                            <td className="px-4 py-2 text-gray-500 font-mono text-xs">{dtl.itemcode}</td>
                                            <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{dtl.itemname}</td>
                                            <td className="px-4 py-2">
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_BADGE[dtl.itemtype ?? "item"] ?? TYPE_BADGE.item}`}>
                                                    {dtl.itemtype ?? "item"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-gray-500 text-xs">
                                                {dtl.price != null ? dtl.price.toLocaleString("vi-VN") : "—"}
                                            </td>
                                            <td className="px-4 py-2 text-gray-400 text-xs">{dtl.startdate ?? "—"}</td>
                                            <td className="px-4 py-2 text-gray-400 text-xs">{dtl.enddate ?? "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3.5 border-t border-gray-100 dark:border-white/[0.05] flex items-center justify-between shrink-0">
                    <p className="text-xs text-gray-400">
                        {selectedReq
                            ? `${selectedDetails.length} item${selectedDetails.length !== 1 ? "s" : ""} · ${selectedReq.requestcode}`
                            : "No request selected"}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={!canCopy}
                            onClick={handleAppend}
                            title="Add items to the end of current list"
                        >
                            Append
                        </Button>
                        <Button
                            size="sm"
                            disabled={!canCopy}
                            onClick={handleReplace}
                            title="Replace all current items with this request's items"
                        >
                            Replace
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
