"use client";

import React, { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import { useModal } from "@/hooks/useModal";
import { PencilIcon, PlusIcon, TrashBinIcon } from "@/icons";
import RequestDetailModal, { FormState } from "./RequestDetailModal";
import { toDBDescription } from "./ComboDescriptionTable";
import { toast } from "sonner";

type Row = {
    no: number;
    itemcode: string;
    itemname: string;
    description: string;        // DB format: "code|name + ..."
    _descriptionFull?: string;  // UI-only: "code|name|price + ..." (không gửi lên DB)
    servicetype: string;
    discount: string | null;
    price: number | null;
    startdate: string;
    enddate: string;
    notes: string;
    itemtype: string;           // 'item' | 'combo' | 'discount'
};

type DetailProps = {
    value: Row[];
    onChange: (val: Row[]) => void;
};

const emptyForm: FormState = {
    itemcode: "",
    itemname: "",
    description: "",
    servicetype: "",
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
            servicetype: row.servicetype,
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
        servicetype: f.servicetype,
        discount: f.discount === "" ? null : f.discount,
        price: f.price === "" ? null : Number(f.price),
        startdate: f.startdate,
        enddate: f.enddate,
        notes: f.notes,
        itemtype: selectedType.toLowerCase(),
    });

    // Add mode → thêm row + clear form, modal vẫn mở
    // Edit mode → cập nhật row + clear form + đóng modal
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

    // Add mode → đóng, GIỮ form
    // Edit mode → đóng + reset form (tránh lẫn data)
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

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">

            {/* Header */}
            <div className="px-4 py-4 flex items-center justify-between border-b border-gray-100 dark:border-white/[0.05]">
                <h1 className="text-lg font-medium text-gray-800 dark:text-white">
                    Request Details
                </h1>
                <Button variant="outline" size="sm" onClick={handleOpenAdd}>
                    <PlusIcon /> Add Item
                </Button>
            </div>

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
                                        No items yet. Click &quot;+ Add Item&quot; to get started.
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
        </div>
    );
}
