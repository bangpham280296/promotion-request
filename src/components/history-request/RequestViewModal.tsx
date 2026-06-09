"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Badge from "@/components/ui/badge/Badge";
import { FileIcon, PencilIcon, PlusIcon, TrashBinIcon } from "@/icons";
import DatePicker from "@/components/form/date-picker";
import EditItemModal, { FormState } from "./EditItemModal";
import { toDBDescription } from "./ComboDescriptionTable";
import { useModal } from "@/hooks/useModal";
import { toast } from "sonner";
import { exportRequestToExcel } from "./exportRequestToExcel";

const statusBadgeColor = (name: string): "success" | "warning" | "error" | "info" => {
    const n = name.toLowerCase();
    if (n === "actived" || n === "active" || n === "approved") return "success";
    if (n === "inactive" || n === "rejected") return "error";
    if (n === "pending") return "warning";
    return "info";
};

const STATUS_OPTIONS = [
    { value: "1", label: "Actived" },
    { value: "2", label: "Inactive" },
];

function DescriptionCell({ value }: { value: string }) {
    if (!value || !value.includes("|")) return <span>{value ?? "-"}</span>;
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

const emptyForm: FormState = {
    itemcode: "",
    itemname: "",
    description: "",
    servicetype: [],
    discount: "",
    price: "",
    startdate: "",
    enddate: "",
    notes: "",
};

const formatVNDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).replace("T", " ");
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
    request: any;
    onSave: (reqid: number, header: any, details: any[], originalDetails: any[]) => Promise<void>;
    onDeactivate?: (reqid: number) => Promise<void>;
};

export default function RequestViewModal({ isOpen, onClose, request, onSave, onDeactivate }: Props) {
    // --- View/Edit mode ---
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newSttId, setNewSttId] = useState<number | null>(null);
    const [pickerResetKey, setPickerResetKey] = useState(0);
    const [editData, setEditData] = useState({
        promotionname: "",
        startdate: "",
        enddate: "",
    });

    // --- Promotion Items local state ---
    const [details, setDetails] = useState<any[]>([]);
    const [originalDetails, setOriginalDetails] = useState<any[]>([]);

    // --- Item modal state ---
    const itemModal = useModal();
    const [itemForm, setItemForm] = useState<FormState>({ ...emptyForm });
    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
    const [itemResetKey, setItemResetKey] = useState(0);
    const [selectedType, setSelectedType] = useState("Item");
    const [comboTotal, setComboTotal] = useState(0);

    const mapDetailsFromRequest = (req: any) =>
        (req.promotiondetail ?? []).map((item: any, idx: number) => ({
            no: idx + 1,
            reqdtlid: item.reqdtlid,
            itemcode: item.itemcode ?? "",
            itemname: item.itemname ?? "",
            description: item.description ?? "",
            _descriptionFull: item.description ?? "",
            itemtype: item.itemtype ?? "",
            servicetype: item.servicetype ?? "",
            discount: item.discount ?? null,
            price: item.price ?? null,
            startdate: item.startdate ?? "",
            enddate: item.enddate ?? "",
            notes: item.notes ?? "",
        }));

    useEffect(() => {
        if (request) {
            setEditData({
                promotionname: request.promotionname ?? "",
                startdate: request.startdate ?? "",
                enddate: request.enddate ?? "",
            });
            const mapped = mapDetailsFromRequest(request);
            setDetails(mapped);
            setOriginalDetails(mapped);
        }
        setIsEditing(false);
    }, [request, isOpen]);

    // --- Header edit handlers ---
    const handleEdit = () => {
        setPickerResetKey((k) => k + 1);
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setEditData({
            promotionname: request.promotionname ?? "",
            startdate: request.startdate ?? "",
            enddate: request.enddate ?? "",
        });
        setDetails(mapDetailsFromRequest(request));
        setNewSttId(null);
        setIsEditing(false);
    };

    const handleSave = async () => {
        if (saving) return;
        try {
            setSaving(true);
            const mappedDetails = details.map((d) => ({
                reqdtlid: d.reqdtlid,
                itemcode: d.itemcode,
                itemname: d.itemname,
                description: d.description,
                itemtype: d.itemtype || null,
                discount: d.discount ?? null,
                price: d.price ?? null,
                startdate: d.startdate || null,
                enddate: d.enddate || null,
                servicetype: d.servicetype || null,
                notes: d.notes || null,
            }));
            await onSave(request.reqid, editData, mappedDetails, originalDetails);
            if (newSttId === 2 && onDeactivate) {
                await onDeactivate(request.reqid);
            }
            toast.success("Request updated successfully!", { position: "top-center" });
            setIsEditing(false);
            setNewSttId(null);
            onClose();
        } catch (err: any) {
            toast.error(err.message ?? "Update failed", { position: "top-center" });
        } finally {
            setSaving(false);
        }
    };

    // --- Item modal handlers ---
    const handleOpenAddItem = () => {
        setEditingItemIndex(null);
        setItemForm({ ...emptyForm });
        setSelectedType("Item");
        itemModal.openModal();
    };

    const handleOpenEditItem = (index: number) => {
        const item = details[index];
        setItemForm({
            itemcode: item.itemcode,
            itemname: item.itemname,
            description: item._descriptionFull ?? item.description,
            servicetype: item.servicetype ? item.servicetype.split(",").filter(Boolean) : [],
            discount: item.discount === null ? "" : String(item.discount),
            price: item.price ?? "",
            startdate: item.startdate,
            enddate: item.enddate,
            notes: item.notes,
        });
        setEditingItemIndex(index);
        const typeMap: Record<string, string> = { item: "Item", combo: "Combo", discount: "Discount" };
        setSelectedType(item.itemtype ? (typeMap[item.itemtype] || "Item") : (item.description?.includes("|") ? "Combo" : "Item"));
        itemModal.openModal();
    };

    const normalizeItemForm = (f: FormState) => ({
        itemcode: f.itemcode,
        itemname: f.itemname,
        description: toDBDescription(f.description),
        _descriptionFull: f.description,
        itemtype: selectedType.toLowerCase(),
        servicetype: f.servicetype.join(","),
        discount: f.discount === "" ? null : f.discount,
        price: f.price === "" ? null : Number(f.price),
        startdate: f.startdate,
        enddate: f.enddate,
        notes: f.notes,
    });

    const handleConfirmItem = () => {
        if (selectedType === "Combo") {
            const comboItems = itemForm.description
                ? itemForm.description.split(" + ").filter((p) => p.includes("|"))
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
            if (comboTotal > 0 && Number(itemForm.price) > comboTotal) {
                toast.error(
                    `Combo price (${Number(itemForm.price).toLocaleString("vi-VN")}) cannot exceed total items price (${comboTotal.toLocaleString("vi-VN")})`,
                    { position: "top-center" }
                );
                return;
            }
        }

        const normalized = normalizeItemForm(itemForm);

        if (editingItemIndex === null) {
            // Add mode: thêm row, giữ modal mở
            setDetails((prev) => [...prev, { ...normalized, no: prev.length + 1 }]);
            setItemForm({ ...emptyForm });
            setItemResetKey((k) => k + 1);
        } else {
            // Edit mode: cập nhật row, đóng modal
            setDetails((prev) =>
                prev.map((item, i) =>
                    i === editingItemIndex
                        ? { ...item, ...normalized }
                        : item
                )
            );
            setItemForm({ ...emptyForm });
            setItemResetKey((k) => k + 1);
            setEditingItemIndex(null);
            itemModal.closeModal();
        }
    };

    const handleCancelItem = () => {
        if (editingItemIndex !== null) {
            setItemForm({ ...emptyForm });
            setItemResetKey((k) => k + 1);
            setEditingItemIndex(null);
        }
        itemModal.closeModal();
    };

    const handleDeleteItem = (index: number) => {
        setDetails((prev) =>
            prev
                .filter((_, i) => i !== index)
                .map((item, i) => ({ ...item, no: i + 1 }))
        );
    };

    if (!request) return null;

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                className="max-w-[1200px] max-h-[90vh] flex flex-col p-0"
            >
                {/* Fixed Header */}
                <div className="flex-shrink-0 px-6 lg:px-8 pt-16 pb-4 border-b border-gray-100 dark:border-white/[0.07]">
                    <div className="flex items-center justify-between mb-3 mt-3">
                        <span className="text-xs font-semibold uppercase tracking-widest text-brand-500 dark:text-brand-400">
                            {request.requestcode}
                        </span>

                        <div>
                            {isEditing && request.stt?.id === 1 ? (
                                <div className="w-36">
                                    <Select
                                        options={STATUS_OPTIONS}
                                        defaultValue="1"
                                        onChange={(val) => setNewSttId(val === "2" ? 2 : null)}
                                    />
                                </div>
                            ) : request.stt ? (
                                <Badge color={statusBadgeColor(request.stt.name)}>
                                    {request.stt.name.charAt(0).toUpperCase() + request.stt.name.slice(1)}
                                </Badge>
                            ) : (
                                <span className="text-gray-400 text-sm">—</span>
                            )}
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={isEditing ? handleCancelEdit : handleEdit}
                        >
                            <PencilIcon />
                            {isEditing ? "Cancel Edit" : "Edit"}
                        </Button>
                    </div>
                    <Input
                        type="text"
                        value={editData.promotionname}
                        disabled={!isEditing}
                        onChange={(e) =>
                            setEditData((prev) => ({ ...prev, promotionname: e.target.value }))
                        }
                    />
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto min-h-0 px-6 lg:px-8 py-6">
                    {/* Info Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                        <div className="rounded-xl border border-gray-100 dark:border-white/[0.07] bg-gray-50 dark:bg-white/[0.03] px-4 py-3">
                            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Requester</p>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {request.employees?.fullname ?? "-"}
                            </p>
                        </div>
                        <div className="rounded-xl border border-gray-100 dark:border-white/[0.07] bg-gray-50 dark:bg-white/[0.03] px-4 py-3">
                            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Department</p>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {request.department?.deptname ?? "-"}
                            </p>
                        </div>
                        <div className="rounded-xl border border-gray-100 dark:border-white/[0.07] bg-gray-50 dark:bg-white/[0.03] px-4 py-3">
                            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Created date</p>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {formatVNDateTime(request.createdate)}
                            </p>
                        </div>

                        <div className="rounded-xl border border-gray-100 dark:border-white/[0.07] bg-gray-50 dark:bg-white/[0.03] px-4 py-3">
                            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Start date</p>
                            {isEditing ? (
                                <DatePicker
                                    key={`startdate-${pickerResetKey}`}
                                    id="view-modal-startdate"
                                    defaultDate={editData.startdate || undefined}
                                    onChange={(_dates, dateStr) =>
                                        setEditData((prev) => ({ ...prev, startdate: dateStr }))
                                    }
                                />
                            ) : (
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {editData.startdate || "-"}
                                </p>
                            )}
                        </div>
                        <div className="rounded-xl border border-gray-100 dark:border-white/[0.07] bg-gray-50 dark:bg-white/[0.03] px-4 py-3">
                            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">End date</p>
                            {isEditing ? (
                                <DatePicker
                                    key={`enddate-${pickerResetKey}`}
                                    id="view-modal-enddate"
                                    defaultDate={editData.enddate || undefined}
                                    onChange={(_dates, dateStr) =>
                                        setEditData((prev) => ({ ...prev, enddate: dateStr }))
                                    }
                                />
                            ) : (
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {editData.enddate || "-"}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Promotion Items Table */}
                    <div className="rounded-xl border border-gray-100 dark:border-white/[0.07] overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-white/[0.07] bg-gray-50 dark:bg-white/[0.03] flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Promotion Items
                                <span className="ml-2 text-xs font-normal text-gray-400">
                                    ({details.length} item{details.length !== 1 ? "s" : ""})
                                </span>
                            </p>
                            {isEditing && (
                                <Button variant="outline" size="sm" onClick={handleOpenAddItem}>
                                    <PlusIcon /> Add Item
                                </Button>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 dark:border-white/[0.07]">
                                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 dark:text-gray-500">No.</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 dark:text-gray-500">Item Code</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 dark:text-gray-500">Item Name</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 dark:text-gray-500">Description</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 dark:text-gray-500">Service Type</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 dark:text-gray-500">Discount</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 dark:text-gray-500">Price</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 dark:text-gray-500">Start</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 dark:text-gray-500">End</th>
                                        {isEditing && (
                                            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 dark:text-gray-500">Action</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                    {details.length === 0 ? (
                                        <tr>
                                            <td colSpan={isEditing ? 10 : 9} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                                                No items found.
                                            </td>
                                        </tr>
                                    ) : (
                                        details.map((item, idx) => (
                                            <tr key={item.reqdtlid ?? idx} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{idx + 1}</td>
                                                <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">{item.itemcode || "-"}</td>
                                                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{item.itemname || "-"}</td>
                                                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                                    <DescriptionCell value={item.description ?? ""} />
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.servicetype || "-"}</td>
                                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.discount ?? "-"}</td>
                                                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{item.price ?? "-"}</td>
                                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.startdate || "-"}</td>
                                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.enddate || "-"}</td>
                                                {isEditing && (
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => handleOpenEditItem(idx)}
                                                                className="p-1.5 text-gray-400 hover:text-brand-500 rounded transition-colors"
                                                                title="Edit item"
                                                            >
                                                                <PencilIcon />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteItem(idx)}
                                                                className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
                                                                title="Delete item"
                                                            >
                                                                <TrashBinIcon />
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Fixed Footer */}
                <div className="flex-shrink-0 flex justify-between px-6 lg:px-8 py-4 border-t border-gray-100 dark:border-white/[0.07]">
                    <div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                exportRequestToExcel(request, details).catch((err) =>
                                    toast.error(err.message ?? "Export failed", { position: "top-center" })
                                )
                            }
                        >
                            <FileIcon />
                            Export to Excel
                        </Button>
                    </div>
                    <div className=" flex gap-3">
                        {isEditing && (
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? "Saving..." : "Save"}
                            </Button>
                        )}
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>




            </Modal>

            {/* Item Detail Modal — outside main Modal để tránh z-index conflict */}
            <EditItemModal
                isOpen={itemModal.isOpen}
                editingIndex={editingItemIndex}
                form={itemForm}
                resetKey={itemResetKey}
                selectedType={selectedType}
                onFormChange={(field, value) =>
                    setItemForm((prev) => ({ ...prev, [field]: value }))
                }
                onTypeChange={setSelectedType}
                onComboTotalChange={setComboTotal}
                onConfirm={handleConfirmItem}
                onCancel={handleCancelItem}
            />
        </>
    );
}

