"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import Badge from "@/components/ui/badge/Badge";
import { FileIcon } from "@/icons";
import { toast } from "sonner";
import { exportRequestToExcel } from "@/components/history-request/exportRequestToExcel";
import { supabase } from "@/lib/supabase/supabaseClient";
import { usePOSVerify, type POSVerifyResult } from "@/hooks/usePOSVerify";
import {
    POSVerifyButton,
    POSVerifyFilterBar,
    POSVerifyStatusCell,
    POSVerifyDiffRow,
    type PosFilter,
} from "@/components/pos-verify/POSVerify";

function DescriptionCell({ value }: { value: string }) {
    if (!value || !value.includes("|")) return <span>{value ?? "-"}</span>;
    return (
        <div className="flex flex-col gap-1">
            {value.split(" + ").filter(Boolean).map((part, i) => {
                const segs = part.split("|");
                if (segs.length >= 3) {
                    const [code, name, priceQty] = segs;
                    const qty = priceQty?.match(/\((\d+)\)\s*$/)?.[1] ?? "";
                    return <span key={i} className="whitespace-nowrap text-theme-sm">• {code} - {name}{qty ? ` (${qty})` : ""}</span>;
                }
                const [code, name] = segs;
                return <span key={i} className="whitespace-nowrap text-theme-sm">• {code && name ? `${code} - ${name}` : part}</span>;
            })}
        </div>
    );
}

const formatVNDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).replace("T", " ");
};

type StatusOption = { id: number; name: string; description: string | null };

type Props = {
    isOpen: boolean;
    onClose: () => void;
    request: any;
    onStatusChange: (reqid: number, sttId: number) => Promise<void>;
};

export default function AdminRequestViewModal({ isOpen, onClose, request, onStatusChange }: Props) {
    const [statusChanging, setStatusChanging] = useState(false);
    const [localSttId, setLocalSttId] = useState<number | null>(null);
    const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
    const [details, setDetails] = useState<any[]>([]);
    const [expandedDiff, setExpandedDiff] = useState<number | null>(null);
    const [posFilter, setPosFilter] = useState<PosFilter>(null);

    const {
        results: verifyResults,
        loading: verifying,
        error: verifyError,
        verifiedAt,
        verify,
        reset: resetVerify,
    } = usePOSVerify();

    const verifyMap = new Map<number, POSVerifyResult>(
        verifyResults.map((r) => [r.reqdtlid, r])
    );

    // Fetch status options from DB — auto-updates when new statuses are added
    useEffect(() => {
        const fetchStatuses = async () => {
            const { data } = await supabase
                .from("status")
                .select("id, name, description")
                .order("id", { ascending: true });
            if (data) setStatusOptions(data);
        };
        fetchStatuses();
    }, []);

    useEffect(() => {
        if (request) setLocalSttId(request.stt?.id ?? null);
    }, [request, isOpen]);

    // Lazy fetch promotiondetail khi modal mở; reset POS state khi đổi request
    useEffect(() => {
        if (!isOpen || !request?.reqid) {
            setDetails([]);
            resetVerify();
            setExpandedDiff(null);
            setPosFilter(null);
            return;
        }
        resetVerify();
        setExpandedDiff(null);
        setPosFilter(null);
        supabase
            .from("promotiondetail")
            .select("reqdtlid, itemcode, itemname, description, itemtype, discount, price, startdate, enddate, servicetype, notes")
            .eq("reqid", request.reqid)
            .then(({ data }) => setDetails(data ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, request?.reqid]);

    const handleVerifyPOS = () => {
        const combos = details
            .filter((d) => d.itemtype === "combo")
            .map((d) => ({
                reqdtlid: d.reqdtlid,
                itemcode: d.itemcode,
                itemname: d.itemname,
                enddate: d.enddate || null,
            }));
        verify(combos);
        setExpandedDiff(null);
        setPosFilter(null);
    };

    const handleStatusChange = async (sttId: number) => {
        if (!request || localSttId === sttId) return;
        setStatusChanging(true);
        try {
            await onStatusChange(request.reqid, sttId);
            setLocalSttId(sttId);
            const opt = statusOptions.find((s) => s.id === sttId);
            toast.success(`Status updated to "${opt?.name ?? sttId}"`, { position: "top-center" });
        } catch (err: any) {
            toast.error(err.message ?? "Failed to update status", { position: "top-center" });
        } finally {
            setStatusChanging(false);
        }
    };

    const statusBadgeColor = (name: string): "success" | "warning" | "error" | "info" => {
        const n = name.toLowerCase();
        if (n === "actived" || n === "active" || n === "approved") return "success";
        if (n === "inactive" || n === "rejected") return "error";
        if (n === "pending") return "warning";
        return "info";
    };

    const getButtonClass = (opt: StatusOption) => {
        const n = opt.name.toLowerCase();
        const isSelected = localSttId === opt.id;
        const isSuccess = n === "actived" || n === "active" || n === "approved";
        const isDanger = n === "inactive" || n === "rejected";

        if (isSelected) {
            if (isSuccess) return "bg-green-100 text-green-700 border-green-300 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30";
            if (isDanger) return "bg-red-100 text-red-700 border-red-300 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30";
            return "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/30";
        }
        if (isSuccess) return "bg-white text-green-600 border-green-300 hover:bg-green-50 dark:bg-transparent dark:text-green-400 dark:border-green-500/40 dark:hover:bg-green-500/10";
        if (isDanger) return "bg-white text-red-600 border-red-300 hover:bg-red-50 dark:bg-transparent dark:text-red-400 dark:border-red-500/40 dark:hover:bg-red-500/10";
        return "bg-white text-gray-500 border-gray-300 hover:bg-gray-50 dark:bg-transparent dark:text-gray-400 dark:border-white/[0.1] dark:hover:bg-white/[0.05]";
    };

    const currentStatus = statusOptions.find((s) => s.id === localSttId);

    const hasVerifyResults = verifyResults.length > 0;
    const totalCols = hasVerifyResults ? 11 : 10;

    const filteredDetails = details.filter((item) => {
        if (!posFilter || !hasVerifyResults) return true;
        if (item.itemtype !== "combo") return true;
        const posResult = item.reqdtlid ? verifyMap.get(item.reqdtlid) : undefined;
        return posResult?.posStatus === posFilter;
    });

    if (!request) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-[1500px] w-[95vw] max-h-[90vh] flex flex-col p-0">

            {/* Fixed Header */}
            <div className="flex-shrink-0 px-6 lg:px-8 pt-16 pb-4 border-b border-gray-100 dark:border-white/[0.07]">
                <div className="grid grid-cols-3 items-center mb-3 mt-3 gap-4">
                    <span className="text-xs font-semibold uppercase tracking-widest text-brand-500 dark:text-brand-400">
                        {request.requestcode}
                    </span>

                    <div className="flex justify-center">
                        {currentStatus && (
                            <Badge color={statusBadgeColor(currentStatus.name)}>
                                {currentStatus.name.charAt(0).toUpperCase() + currentStatus.name.slice(1)}
                            </Badge>
                        )}
                    </div>

                    {/* Status change buttons — auto-populated from status table */}
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                        {statusOptions.map((opt) => (
                            <button
                                key={opt.id}
                                disabled={statusChanging || localSttId === opt.id}
                                onClick={() => handleStatusChange(opt.id)}
                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors disabled:opacity-60 ${getButtonClass(opt)}`}
                            >
                                {opt.name.charAt(0).toUpperCase() + opt.name.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <p className="text-base font-medium text-gray-800 dark:text-white/90">
                    {request.promotionname}
                </p>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto min-h-0 px-6 lg:px-8 py-6">

                {/* Info Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                    {[
                        { label: "Requester", value: request.employees?.fullname },
                        { label: "Department", value: request.department?.deptname },
                        { label: "Created date", value: formatVNDateTime(request.createdate) },
                        { label: "Start date", value: request.startdate },
                        { label: "End date", value: request.enddate },
                        { label: "Updated at", value: formatVNDateTime(request.updateat) },
                    ].map(({ label, value }) => (
                        <div key={label} className="rounded-xl border border-gray-100 dark:border-white/[0.07] bg-gray-50 dark:bg-white/[0.03] px-4 py-3">
                            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{label}</p>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{value ?? "-"}</p>
                        </div>
                    ))}
                </div>

                {/* Promotion Items Table */}
                <div className="rounded-xl border border-gray-100 dark:border-white/[0.07] overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-white/[0.07] bg-gray-50 dark:bg-white/[0.03] flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Promotion Items
                            <span className="ml-2 text-xs font-normal text-gray-400">
                                ({details.length} item{details.length !== 1 ? "s" : ""})
                            </span>
                        </p>
                        {details.some((d) => d.itemtype === "combo") && (
                            <POSVerifyButton
                                onClick={handleVerifyPOS}
                                loading={verifying}
                                disabled={details.length === 0}
                            />
                        )}
                    </div>

                    {verifyError && (
                        <div className="px-4 py-2 text-xs text-red-500 bg-red-50 dark:bg-red-500/10 border-b border-red-100 dark:border-red-500/20">
                            Verify error: {verifyError}
                        </div>
                    )}

                    {hasVerifyResults && (
                        <POSVerifyFilterBar
                            results={verifyResults}
                            posFilter={posFilter}
                            onFilterChange={setPosFilter}
                            verifiedAt={verifiedAt}
                        />
                    )}

                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-white/[0.07]">
                                    {["No.", "Item Code", "Item Name", "Description", "Service Type", "Discount", "Price", "Start", "End", "Notes"].map((h) => (
                                        <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 dark:text-gray-500 whitespace-nowrap">{h}</th>
                                    ))}
                                    {hasVerifyResults && (
                                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 dark:text-gray-500 whitespace-nowrap">POS Status</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                {filteredDetails.length === 0 ? (
                                    <tr>
                                        <td colSpan={totalCols} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                                            No items found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredDetails.map((item: any, idx: number) => {
                                        const posResult = item.reqdtlid ? verifyMap.get(item.reqdtlid) : undefined;
                                        const isCombo = item.itemtype === "combo";
                                        const isExpanded = expandedDiff === item.reqdtlid;

                                        return (
                                            <React.Fragment key={item.reqdtlid ?? idx}>
                                                <tr className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                                                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{idx + 1}</td>
                                                    <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">{item.itemcode || "-"}</td>
                                                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{item.itemname || "-"}</td>
                                                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300"><DescriptionCell value={item.description ?? ""} /></td>
                                                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.servicetype || "-"}</td>
                                                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.discount ?? "-"}</td>
                                                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{item.price ?? "-"}</td>
                                                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{item.startdate || "-"}</td>
                                                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{item.enddate || "-"}</td>
                                                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.notes || "-"}</td>
                                                    {hasVerifyResults && (
                                                        <td className="px-4 py-3">
                                                            <POSVerifyStatusCell
                                                                posResult={posResult}
                                                                isCombo={isCombo}
                                                                isExpanded={isExpanded}
                                                                onToggle={() => setExpandedDiff(isExpanded ? null : item.reqdtlid)}
                                                            />
                                                        </td>
                                                    )}
                                                </tr>
                                                {isExpanded && posResult?.differences && (
                                                    <POSVerifyDiffRow
                                                        colSpan={totalCols}
                                                        differences={posResult.differences}
                                                    />
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Fixed Footer */}
            <div className="flex-shrink-0 flex justify-between items-center px-6 lg:px-8 py-4 border-t border-gray-100 dark:border-white/[0.07]">
                <button
                    onClick={() =>
                        exportRequestToExcel(request, details).catch((err) =>
                            toast.error(err.message ?? "Export failed", { position: "top-center" })
                        )
                    }
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-transparent dark:text-gray-300 dark:border-white/[0.1] dark:hover:bg-white/[0.05] transition-colors"
                >
                    <FileIcon /> Export to Excel
                </button>
                <button
                    onClick={onClose}
                    className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors"
                >
                    Close
                </button>
            </div>
        </Modal>
    );
}
