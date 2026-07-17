"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import Button from "@/components/ui/button/Button";
import { type Row } from "./requestDetailExcel";
import { useAuthContext } from "@/context/AuthContext";
import type { DiscountMetadata } from "@/types/discount-metadata";

type RequestMeta = {
    reqid: number;
    requestcode: string;
    startdate: string;
    enddate: string;
    department: { deptname: string } | null;
    employees: { fullname: string } | null;
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
    discount_metadata: { metadata: DiscountMetadata } | null;
};

type DeptOption = { id: number; deptname: string };

type Tab = "all" | "mine" | "dept";

type Props = {
    isOpen: boolean;
    existingRows: Row[];
    onAppend: (rows: Row[]) => void;
    onReplace: (rows: Row[]) => void;
    onClose: () => void;
};

const PAGE_SIZE = 20;

const TABS: { key: Tab; label: string }[] = [
    { key: "all",  label: "All" },
    { key: "mine", label: "My Requests" },
    { key: "dept", label: "My Dept" },
];

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
        metadata: dtl.discount_metadata?.metadata ?? null,
    };
}

const TYPE_BADGE: Record<string, string> = {
    combo:    "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    discount: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
    item:     "bg-gray-100 text-gray-500 dark:bg-white/[0.05] dark:text-gray-400",
};

export default function LoadRequestModal({ isOpen, existingRows, onAppend, onReplace, onClose }: Props) {
    const { user, profile } = useAuthContext();

    const [requestList, setRequestList]       = useState<RequestMeta[]>([]);
    const [loading, setLoading]               = useState(false);
    const [loadingMore, setLoadingMore]       = useState(false);
    const [hasMore, setHasMore]               = useState(false);
    const [search, setSearch]                 = useState("");
    const [selectedReqid, setSelectedReqid]   = useState<number | null>(null);
    const [selectedMeta, setSelectedMeta]     = useState<RequestMeta | null>(null);
    const [selectedDetails, setSelectedDetails] = useState<DetailItem[]>([]);
    const [loadingDetail, setLoadingDetail]   = useState(false);

    const [activeTab, setActiveTab]     = useState<Tab>("all");
    const [deptFilter, setDeptFilter]   = useState<number | null>(null);
    const [departments, setDepartments] = useState<DeptOption[]>([]);

    const offsetRef   = useRef(0);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ─── Core fetch (all filter params passed explicitly — no stale closure) ───
    const fetchRequests = useCallback(async (params: {
        search: string;
        tab: Tab;
        deptId: number | null;
        offset: number;
        append: boolean;
        currentUserId: string | null;
        currentUserDeptId: number | null;
    }) => {
        const { search, tab, deptId, offset, append, currentUserId, currentUserDeptId } = params;

        if (offset === 0) setLoading(true);
        else setLoadingMore(true);

        let query = supabase
            .from("requests")
            .select(`
                reqid, requestcode, startdate, enddate,
                department(deptname),
                employees:employees!request_requester_fkey(fullname)
            `)
            .order("reqid", { ascending: false })
            .range(offset, offset + PAGE_SIZE - 1);

        if (search.trim()) {
            query = query.ilike("requestcode", `%${search.trim()}%`);
        }

        if (tab === "mine" && currentUserId) {
            query = query.eq("requester", currentUserId);
        } else if (tab === "dept" && currentUserDeptId) {
            query = query.eq("department", currentUserDeptId);
        } else if (tab === "all" && deptId) {
            query = query.eq("department", deptId);
        }

        const { data } = await query;
        const rows = (data as unknown as RequestMeta[]) ?? [];

        if (append) setRequestList((prev) => [...prev, ...rows]);
        else setRequestList(rows);

        setHasMore(rows.length === PAGE_SIZE);
        offsetRef.current = offset + rows.length;

        if (offset === 0) setLoading(false);
        else setLoadingMore(false);
    }, []);

    // ─── Reset + initial fetch khi modal mở ───
    useEffect(() => {
        if (!isOpen) return;

        setSearch("");
        setActiveTab("all");
        setDeptFilter(null);
        setSelectedReqid(null);
        setSelectedMeta(null);
        setSelectedDetails([]);
        offsetRef.current = 0;

        // Fetch departments (nhỏ, chỉ 1 lần) + request list song song
        supabase
            .from("department")
            .select("id, deptname")
            .order("deptname")
            .then(({ data }) => setDepartments((data as DeptOption[]) ?? []));

        fetchRequests({
            search: "",
            tab: "all",
            deptId: null,
            offset: 0,
            append: false,
            currentUserId: user?.id ?? null,
            currentUserDeptId: profile?.department?.id ?? null,
        });
    }, [isOpen, fetchRequests]); // user/profile stable sau login, không cần trong deps

    // ─── Cleanup debounce khi unmount ───
    useEffect(() => {
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, []);

    // ─── Lazy load detail khi chọn request ───
    useEffect(() => {
        if (selectedReqid === null) return;
        setLoadingDetail(true);
        setSelectedDetails([]);
        supabase
            .from("promotiondetail")
            .select("reqdtlid, itemcode, itemname, description, itemtype, discount, price, startdate, enddate, servicetype, notes, discount_metadata(metadata)")
            .eq("reqid", selectedReqid)
            .then(({ data }) => {
                setSelectedDetails((data as unknown as DetailItem[]) ?? []);
                setLoadingDetail(false);
            });
    }, [selectedReqid]);

    if (!isOpen) return null;

    // ─── Helpers để gọi fetch với state hiện tại ───
    const currentUserId     = user?.id ?? null;
    const currentUserDeptId = profile?.department?.id ?? null;

    const refetch = (overrides: Partial<{ search: string; tab: Tab; deptId: number | null }> = {}) => {
        const s   = overrides.search  !== undefined ? overrides.search  : search;
        const t   = overrides.tab     !== undefined ? overrides.tab     : activeTab;
        const did = overrides.deptId  !== undefined ? overrides.deptId  : deptFilter;
        offsetRef.current = 0;
        setSelectedReqid(null);
        setSelectedMeta(null);
        setSelectedDetails([]);
        fetchRequests({ search: s, tab: t, deptId: did, offset: 0, append: false, currentUserId, currentUserDeptId });
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearch(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => refetch({ search: value }), 300);
    };

    const handleTabChange = (tab: Tab) => {
        setActiveTab(tab);
        // Dept dropdown chỉ có nghĩa khi tab = "all"
        const newDeptId = tab === "all" ? deptFilter : null;
        if (tab !== "all") setDeptFilter(null);
        refetch({ tab, deptId: newDeptId });
    };

    const handleDeptFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const deptId = e.target.value ? Number(e.target.value) : null;
        setDeptFilter(deptId);
        refetch({ deptId });
    };

    const handleSelectRequest = (r: RequestMeta) => {
        setSelectedReqid(r.reqid);
        setSelectedMeta(r);
    };

    const handleLoadMore = () => {
        fetchRequests({ search, tab: activeTab, deptId: deptFilter, offset: offsetRef.current, append: true, currentUserId, currentUserDeptId });
    };

    const handleAppend  = () => { const s = existingRows.length; onAppend(selectedDetails.map((d, i) => mapToRow(d, s + i + 1))); };
    const handleReplace = () => { onReplace(selectedDetails.map((d, i) => mapToRow(d, i + 1))); };

    const canCopy = selectedReqid !== null && !loadingDetail && selectedDetails.length > 0;

    return (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center px-4 pt-[68px] pb-4 lg:pt-[80px]">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col w-full max-w-6xl h-[calc(100vh-84px)] lg:h-[calc(100vh-96px)]">

                {/* Header */}
                <div className="px-5 pt-4 pb-3 border-b border-gray-100 dark:border-white/[0.05] shrink-0 space-y-3">

                    {/* Row 1: title + search */}
                    <div className="flex items-center justify-between gap-4">
                        <h2 className="text-base font-semibold text-gray-800 dark:text-white whitespace-nowrap">
                            Load from existing request
                        </h2>
                        <input
                            type="text"
                            placeholder="Search by request code..."
                            value={search}
                            onChange={handleSearchChange}
                            className="flex-1 max-w-sm text-sm border border-gray-200 dark:border-white/[0.1] rounded-lg px-3 py-1.5 bg-transparent text-gray-700 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>

                    {/* Row 2: tabs + dept dropdown */}
                    <div className="flex items-center gap-3 flex-wrap">

                        {/* Tab group */}
                        <div className="flex rounded-lg border border-gray-200 dark:border-white/[0.1] overflow-hidden">
                            {TABS.map(({ key, label }) => (
                                <button
                                    key={key}
                                    onClick={() => handleTabChange(key)}
                                    className={`px-3 py-1.5 text-xs font-medium transition-colors border-r last:border-r-0 border-gray-200 dark:border-white/[0.1]
                                        ${activeTab === key
                                            ? "bg-brand-500 text-white"
                                            : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/[0.04]"
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* Dept dropdown — chỉ hiện khi tab = All */}
                        {activeTab === "all" && departments.length > 0 && (
                            <select
                                value={deptFilter ?? ""}
                                onChange={handleDeptFilterChange}
                                className="text-xs border border-gray-200 dark:border-white/[0.1] rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                            >
                                <option value="">All departments</option>
                                {departments.map((d) => (
                                    <option key={d.id} value={d.id}>{d.deptname}</option>
                                ))}
                            </select>
                        )}

                        {/* Active filter badge */}
                        {(activeTab !== "all" || deptFilter) && (
                            <span className="text-xs text-brand-500 font-medium">
                                {activeTab === "mine" && `Requester: ${profile?.fullname ?? "me"}`}
                                {activeTab === "dept" && `Dept: ${profile?.department?.deptname ?? "my dept"}`}
                                {activeTab === "all" && deptFilter && `Dept: ${departments.find(d => d.id === deptFilter)?.deptname ?? ""}`}
                            </span>
                        )}

                    </div>
                </div>

                {/* Body — 2 panel */}
                <div className="flex flex-1 overflow-hidden min-h-0">

                    {/* Left — request list */}
                    <div className="w-72 shrink-0 border-r border-gray-100 dark:border-white/[0.05] overflow-y-auto flex flex-col">
                        <div className="flex-1">
                            {loading ? (
                                <p className="p-4 text-sm text-gray-400">Loading...</p>
                            ) : requestList.length === 0 ? (
                                <p className="p-4 text-sm text-gray-400">No requests found.</p>
                            ) : (
                                requestList.map((r) => (
                                    <div
                                        key={r.reqid}
                                        onClick={() => handleSelectRequest(r)}
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

                        {/* Load more */}
                        {hasMore && !loading && (
                            <div className="p-3 border-t border-gray-100 dark:border-white/[0.05] shrink-0">
                                <button
                                    onClick={handleLoadMore}
                                    disabled={loadingMore}
                                    className="w-full text-xs text-brand-500 hover:text-brand-600 disabled:text-gray-400 py-1 transition-colors"
                                >
                                    {loadingMore ? "Loading..." : "Load more"}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right — detail preview */}
                    <div className="flex-1 overflow-y-auto">
                        {!selectedReqid ? (
                            <div className="flex items-center justify-center h-full text-sm text-gray-400">
                                Select a request on the left to preview its details.
                            </div>
                        ) : loadingDetail ? (
                            <div className="flex items-center justify-center h-full text-sm text-gray-400">
                                Loading details...
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
                                            <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-400">{h}</th>
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
                        {selectedMeta
                            ? `${selectedDetails.length} item${selectedDetails.length !== 1 ? "s" : ""} · ${selectedMeta.requestcode}`
                            : "No request selected"}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                        <Button variant="outline" size="sm" disabled={!canCopy} onClick={handleAppend}
                            title="Add items to the end of current list">Append</Button>
                        <Button size="sm" disabled={!canCopy} onClick={handleReplace}
                            title="Replace all current items with this request's items">Replace</Button>
                    </div>
                </div>

            </div>
        </div>
    );
}
