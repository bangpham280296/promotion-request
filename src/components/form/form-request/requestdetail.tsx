"use client";

import React, { useState, useRef } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import { useModal } from "@/hooks/useModal";
import { CopyIcon, DownloadIcon, FileIcon, ImportFile, PencilIcon, PlusIcon, TrashBinIcon } from "@/icons";
import RequestDetailModal, { FormState } from "./RequestDetailModal";
import { toDBDescription } from "./ComboDescriptionTable";
import { toast } from "sonner";
import { type Row, downloadTemplate, importFromExcel } from "./requestDetailExcel";
import LoadRequestModal from "./LoadRequestModal";

type DetailProps = {
    value: Row[];
    onChange: (val: Row[]) => void;
};

const emptyForm: FormState = {
    itemcode: "",
    itemname: "",
    description: "",
    servicetype: [],
    discount: "no",
    price: "",
    startdate: "",
    enddate: "",
    notes: "",
};

function DescriptionCell({ value }: { value: string }) {
    if (!value || !value.includes("|")) return <span>{value}</span>;
    return (
        <div className="flex flex-col gap-1">
            {value.split(" + ").filter(Boolean).map((groupStr, gi) => {
                const alternatives = groupStr.split(" OR ").filter(Boolean);
                return (
                    <div key={gi} className="flex flex-col">
                        {alternatives.map((part, ai) => {
                            const segs = part.trim().split("|");
                            let display = "";
                            if (segs.length >= 3) {
                                const [code, name, priceQty] = segs;
                                const qty = priceQty?.match(/\((\d+)\)\s*$/)?.[1] ?? "";
                                display = `${code} - ${name}${qty ? ` (${qty})` : ""}`;
                            } else {
                                const [code, name] = segs;
                                display = code && name ? `${code} - ${name}` : part.trim();
                            }
                            return (
                                <span key={ai} className="whitespace-nowrap text-theme-sm">
                                    {ai === 0
                                        ? `• ${display}`
                                        : <><span className="inline-block mx-1 text-[10px] font-bold text-brand-500">OR</span>{display}</>
                                    }
                                </span>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
}

export default function RequestDetailTable({ value, onChange }: DetailProps) {
    const { isOpen, openModal, closeModal } = useModal();
    const [form, setForm] = useState<FormState>({ ...emptyForm });
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [resetKey, setResetKey] = useState(0);
    const [selectedType, setSelectedType] = useState("Item");
    const [comboTotal, setComboTotal] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loadModalOpen, setLoadModalOpen] = useState(false);
    const [clearConfirming, setClearConfirming] = useState(false);
    const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const data = value ?? [];

    const handleFormChange = (field: string, fieldValue: any) => {
        setForm((prev) => ({ ...prev, [field]: fieldValue }));
    };

    const handleOpenAdd = () => {
        setEditingIndex(null);
        setSelectedType("Item");
        openModal();
    };

    const handleOpenEdit = (index: number) => {
        const row = data[index];
        setForm({
            itemcode: row.itemcode,
            itemname: row.itemname,
            description: row._descriptionFull ?? row.description,
            servicetype: row.servicetype ? row.servicetype.split(",").filter(Boolean) : [],
            discount: row.discount === null ? "" : String(row.discount),
            price: row.price ?? "",
            startdate: row.startdate,
            enddate: row.enddate,
            notes: row.notes,
        });
        setEditingIndex(index);
        const typeMap: Record<string, string> = { item: "Item", combo: "Combo", discount: "Discount" };
        setSelectedType(row.itemtype ? (typeMap[row.itemtype] || "Item") : (row.description?.includes("|") ? "Combo" : "Item"));
        openModal();
    };

    const normalizeForm = (f: FormState): Row => ({
        no: 0,
        itemcode: f.itemcode,
        itemname: f.itemname,
        description: toDBDescription(f.description),
        _descriptionFull: f.description,
        servicetype: f.servicetype.join(","),
        discount: f.discount === "" ? null : f.discount,
        price: f.price === "" ? null : Number(f.price),
        startdate: f.startdate,
        enddate: f.enddate,
        notes: f.notes,
        itemtype: selectedType.toLowerCase(),
    });

    const handleConfirm = () => {
        if (selectedType === "Combo") {
            const comboItems = form.description
                ? form.description.split(" + ").filter((p) => p.includes("|"))
                : [];
            if (comboItems.length < 2) {
                toast.warning("Combo must have at least 2 items.", { position: "top-center" });
                return;
            }
            const hasEmpty = comboItems.some((groupStr) =>
                groupStr.split(" OR ").some((part) => {
                    const [code, name] = part.trim().split("|");
                    return !code?.trim() || !name?.trim();
                })
            );
            if (hasEmpty) {
                toast.error("All combo items must have Item Code and Item Name.", { position: "top-center" });
                return;
            }
            if (comboTotal > 0 && Number(form.price) > comboTotal) {
                toast.error(
                    `Combo price (${Number(form.price).toLocaleString("vi-VN")}) cannot exceed total items price (${comboTotal.toLocaleString("vi-VN")})`,
                    { position: "top-center" }
                );
                return;
            }
        }

        const normalized = normalizeForm(form);
        if (editingIndex === null) {
            const newRow: Row = { ...normalized, no: data.length + 1 };
            onChange([...data, newRow]);
            setForm({ ...emptyForm });
            setResetKey((k) => k + 1);
        } else {
            const updated = data.map((row, i) =>
                i === editingIndex ? { ...normalized, no: row.no } : row
            );
            onChange(updated);
            setForm({ ...emptyForm });
            setResetKey((k) => k + 1);
            setEditingIndex(null);
            closeModal();
        }
    };

    const handleCancel = () => {
        if (editingIndex !== null) {
            setForm({ ...emptyForm });
            setResetKey((k) => k + 1);
            setEditingIndex(null);
        }
        closeModal();
    };

    const handleDelete = (index: number) => {
        const updated = data
            .filter((_, i) => i !== index)
            .map((item, i) => ({ ...item, no: i + 1 }));
        onChange(updated);
    };

    const handleClearRequest = () => {
        if (!clearConfirming) {
            setClearConfirming(true);
            clearTimerRef.current = setTimeout(() => setClearConfirming(false), 4000);
            return;
        }
        if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
        setClearConfirming(false);
        onChange([]);
        toast.success("All request details have been deleted.", { position: "top-center" });
    };

    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (!file) return;
        importFromExcel(file, data, onChange);
    };

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">

            {/* Header */}
            <div className="px-4 border-b border-gray-100 dark:border-white/[0.05]">

                {/* Row 1: Title + Import actions */}
                <div className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h1 className="text-base font-semibold text-gray-800 dark:text-white">
                            Request Details
                        </h1>
                        {data.length > 0 && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                                {data.length} item{data.length !== 1 ? "s" : ""}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={downloadTemplate}
                            title="Download template"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-brand-500 hover:bg-gray-50 dark:hover:bg-white/[0.04] rounded-md transition-colors"
                        >
                            <DownloadIcon /> Template
                        </button>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            title="Import items from Excel file"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-brand-500 hover:bg-gray-50 dark:hover:bg-white/[0.04] rounded-md transition-colors"
                        >
                            <ImportFile className="w-4 h-4" /> Import Excel
                        </button>
                        <button
                            type="button"
                            onClick={() => setLoadModalOpen(true)}
                            title="Copy detail from an existing request"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-brand-500 hover:bg-gray-50 dark:hover:bg-white/[0.04] rounded-md transition-colors"
                        >
                            <CopyIcon /> Load Request
                        </button>
                    </div>
                </div>

                {/* Row 2: Clear All + Add Item */}
                <div className="pb-3 flex items-center justify-end gap-2">
                    {data.length > 0 && (
                        clearConfirming ? (
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs text-red-500 whitespace-nowrap font-medium">Clear all?</span>
                                <button
                                    type="button"
                                    onClick={() => { if (clearTimerRef.current) clearTimeout(clearTimerRef.current); setClearConfirming(false); }}
                                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-200 dark:border-white/[0.1] transition-colors"
                                >
                                    No
                                </button>
                                <button
                                    type="button"
                                    onClick={handleClearRequest}
                                    className="text-xs text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded transition-colors"
                                >
                                    Yes
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={handleClearRequest}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors"
                            >
                                <TrashBinIcon /> Clear All
                            </button>
                        )
                    )}
                    <Button size="sm" onClick={handleOpenAdd}>
                        <PlusIcon /> Add Item
                    </Button>
                </div>
            </div>
            <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleImportFile}
            />

            {/* Table */}
            <div className="max-w-full overflow-x-auto">
                <div className="min-w-[900px]">
                    <Table>
                        <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                            <TableRow>
                                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-12">No.</TableCell>
                                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Item Code</TableCell>
                                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Item Name</TableCell>
                                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Description</TableCell>
                                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Service Type</TableCell>
                                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Discount</TableCell>
                                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Price</TableCell>
                                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Start Date</TableCell>
                                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">End Date</TableCell>
                                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Notes</TableCell>
                                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Action</TableCell>
                            </TableRow>
                        </TableHeader>

                        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                            {data.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="px-5 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                                        <p>
                                            No items yet. Click &quot;+ Add Item&quot; or{" "}
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="text-brand-500 hover:underline"
                                            >
                                                Import Excel
                                            </button>
                                            {" "}to get started.
                                        </p>
                                        <p className="mt-1 text-xs">
                                            <button
                                                type="button"
                                                onClick={downloadTemplate}
                                                className="text-brand-500 hover:underline"
                                            >
                                                Download template
                                            </button>
                                            {" "}if you don&apos;t have one yet.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                data.map((row, index) => (
                                    <TableRow className="hover:bg-gray-50 dark:hover:bg-white/[0.02]" key={index}>
                                        <TableCell className="px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{row.no}</TableCell>
                                        <TableCell className="px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{row.itemcode}</TableCell>
                                        <TableCell className="px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{row.itemname}</TableCell>
                                        <TableCell className="px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                            <DescriptionCell value={row.description ?? ""} />
                                        </TableCell>
                                        <TableCell className="px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{row.servicetype}</TableCell>
                                        <TableCell className="px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{row.discount}</TableCell>
                                        <TableCell className="px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{row.price}</TableCell>
                                        <TableCell className="px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{row.startdate}</TableCell>
                                        <TableCell className="px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{row.enddate}</TableCell>
                                        <TableCell className="px-5 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{row.notes}</TableCell>
                                        <TableCell className="px-5 py-3">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleOpenEdit(index)}
                                                    className="px-1 py-1 text-gray-500 hover:text-gray-700 rounded text-sm transition-colors"
                                                >
                                                    <PencilIcon />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(index)}
                                                    className="px-1 py-1 text-gray-500 hover:text-gray-700 rounded text-sm transition-colors"
                                                >
                                                    <TrashBinIcon />
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <RequestDetailModal
                isOpen={isOpen}
                editingIndex={editingIndex}
                form={form}
                resetKey={resetKey}
                selectedType={selectedType}
                onFormChange={handleFormChange}
                onTypeChange={setSelectedType}
                onComboTotalChange={setComboTotal}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />

            <LoadRequestModal
                isOpen={loadModalOpen}
                existingRows={data}
                onAppend={(rows) => { onChange([...data, ...rows]); setLoadModalOpen(false); }}
                onReplace={(rows) => { onChange(rows); setLoadModalOpen(false); }}
                onClose={() => setLoadModalOpen(false)}
            />
        </div>
    );
}
