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
import Input from "@/components/form/input/InputField";
import { ListIcon, PlusIcon, TrashBinIcon } from "@/icons";
import ItemPickerModal from "./ItemPickerModal";

const MAX_QTY = 10;

type ComboItem = {
    id: number;
    groupId: number;
    itemcode: string;
    itemname: string;
    unitPrice: number | "";
    qty: number | "";
    price: number | "";
};

type Props = {
    defaultValue?: string;
    onChange: (serialized: string, total: number) => void;
};

const calcPrice = (unitPrice: number | "", qty: number | ""): number | "" => {
    if (unitPrice === "" || qty === "") return "";
    return Number(unitPrice) * Number(qty);
};

const createRow = (groupId: number): ComboItem => ({
    id: Date.now() + Math.random(),
    groupId,
    itemcode: "",
    itemname: "",
    qty: 1,
    unitPrice: "",
    price: "",
});

const getGroups = (rows: ComboItem[]): ComboItem[][] => {
    const map = new Map<number, ComboItem[]>();
    for (const row of rows) {
        if (!map.has(row.groupId)) map.set(row.groupId, []);
        map.get(row.groupId)!.push(row);
    }
    return [...map.values()];
};

const nextGroupId = (rows: ComboItem[]) =>
    rows.length > 0 ? Math.max(...rows.map((r) => r.groupId)) + 1 : 0;

const serialize = (rows: ComboItem[]): string =>
    getGroups(rows)
        .map((group) =>
            group
                .map((i) => `${i.itemcode}|${i.itemname}|${i.qty}|${i.price}|${i.unitPrice}`)
                .join(" OR ")
        )
        .join(" + ");

const parseItem = (part: string, groupId: number): ComboItem => {
    const segments = part.trim().split("|");
    if (segments.length >= 5) {
        const [itemcode = "", itemname = "", qtyStr = "", , upStr = ""] = segments;
        const qty = qtyStr === "" ? 1 : Number(qtyStr);
        const unitPrice = upStr === "" ? "" : Number(upStr);
        return { id: Date.now() + Math.random(), groupId, itemcode: itemcode.trim(), itemname: itemname.trim(), qty, unitPrice, price: calcPrice(unitPrice, qty) };
    }
    if (segments.length === 4) {
        const [itemcode = "", itemname = "", qtyStr = "", priceStr = ""] = segments;
        const qty = qtyStr === "" ? 1 : Number(qtyStr);
        const totalP = priceStr === "" ? "" : Number(priceStr);
        const unitPrice = totalP !== "" && qty > 0 ? Math.round(Number(totalP) / qty) : totalP;
        return { id: Date.now() + Math.random(), groupId, itemcode: itemcode.trim(), itemname: itemname.trim(), qty, unitPrice, price: calcPrice(unitPrice, qty) };
    }
    if (segments.length === 3) {
        const [itemcode = "", itemname = "", priceQty = ""] = segments;
        const qtyMatch = priceQty.match(/^(.*?)\s*\((\d+)\)\s*$/);
        if (qtyMatch) {
            const qty = Number(qtyMatch[2]);
            const unitPrice = qtyMatch[1].trim() === "" ? "" : Number(qtyMatch[1].trim());
            return { id: Date.now() + Math.random(), groupId, itemcode: itemcode.trim(), itemname: itemname.trim(), qty, unitPrice, price: calcPrice(unitPrice, qty) };
        }
        return { id: Date.now() + Math.random(), groupId, itemcode: itemcode.trim(), itemname: itemname.trim(), qty: 1, unitPrice: priceQty === "" ? "" : Number(priceQty), price: "" };
    }
    const [itemcode = "", nameWithQty = ""] = segments;
    const qtyMatch = nameWithQty.match(/\s*\((\d+)\)\s*$/);
    const qty = qtyMatch ? Number(qtyMatch[1]) : 1;
    const itemname = nameWithQty.replace(/\s*\(\d+\)\s*$/, "").trim();
    return { id: Date.now() + Math.random(), groupId, itemcode: itemcode.trim(), itemname, qty, unitPrice: "", price: "" };
};

const parseValue = (value: string): ComboItem[] => {
    if (!value || !value.includes("|")) return [createRow(0)];
    return value.split(" + ").filter(Boolean).flatMap((groupStr, groupIdx) =>
        groupStr.split(" OR ").filter(Boolean).map((part) => parseItem(part, groupIdx))
    );
};

export const toDBDescription = (description: string): string => {
    if (!description || !description.includes("|")) return description;
    return description
        .split(" + ")
        .map((groupStr) =>
            groupStr
                .split(" OR ")
                .map((part) => {
                    const segments = part.trim().split("|");
                    if (segments.length >= 5) {
                        const [code = "", name = "", qty = "", , unitPrice = ""] = segments;
                        return `${code}|${name}|${unitPrice} (${qty})`;
                    }
                    return part.trim();
                })
                .join(" OR ")
        )
        .join(" + ");
};

export default function ComboDescriptionTable({ defaultValue, onChange }: Props) {
    const [rows, setRows] = useState<ComboItem[]>(() =>
        defaultValue ? parseValue(defaultValue) : [createRow(0)]
    );
    const [pickingRowId, setPickingRowId] = useState<number | null>(null);

    const groups = getGroups(rows);
    const totalQty = groups.reduce((sum, g) => sum + (Number(g[0].qty) || 0), 0);
    const totalPrice = groups.reduce((sum, g) => {
        const maxPrice = Math.max(...g.map((item) => Number(item.price) || 0));
        return sum + maxPrice;
    }, 0);

    const updateRows = (updated: ComboItem[]) => {
        setRows(updated);
        const newTotal = getGroups(updated).reduce((sum, g) => {
            return sum + Math.max(...g.map((item) => Number(item.price) || 0));
        }, 0);
        onChange(serialize(updated), newTotal);
    };

    const handleChange = (id: number, field: "itemcode" | "itemname" | "unitPrice" | "qty", value: string | number) => {
        updateRows(rows.map((r) => {
            if (r.id !== id) return r;
            if (field === "unitPrice") {
                const v = value === "" ? "" : Number(value);
                return { ...r, unitPrice: v, price: calcPrice(v, r.qty) };
            }
            if (field === "qty") {
                const v = value === "" ? "" : Number(value);
                return { ...r, qty: v, price: calcPrice(r.unitPrice, v) };
            }
            return { ...r, [field]: value };
        }));
    };

    const handlePickSelect = (id: string, name: string, price: number) => {
        if (pickingRowId === null) return;
        updateRows(rows.map((r) => {
            if (r.id !== pickingRowId) return r;
            const qty = Number(r.qty) || 1;
            return { ...r, itemcode: id, itemname: name, unitPrice: price, price: price * qty };
        }));
        setPickingRowId(null);
    };

    const handleAdd = () => {
        if (totalQty >= MAX_QTY) return;
        updateRows([...rows, createRow(nextGroupId(rows))]);
    };

    const handleAddAlternative = (groupId: number) => {
        const lastIdx = rows.map((r, i) => (r.groupId === groupId ? i : -1)).filter((i) => i >= 0).pop() ?? rows.length - 1;
        const updated = [...rows.slice(0, lastIdx + 1), createRow(groupId), ...rows.slice(lastIdx + 1)];
        updateRows(updated);
    };

    const handleDelete = (id: number) => {
        const updated = rows.filter((r) => r.id !== id);
        updateRows(updated.length > 0 ? updated : [createRow(0)]);
    };

    type RenderItem = { row: ComboItem; groupIdx: number; isFirst: boolean };
    const renderList: RenderItem[] = groups.flatMap((group, gIdx) =>
        group.map((row, aIdx) => ({ row, groupIdx: gIdx, isFirst: aIdx === 0 }))
    );

    return (
        <div className="rounded-lg border border-gray-200 dark:border-white/[0.05] overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-white/[0.03] border-b border-gray-200 dark:border-white/[0.05]">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Combo Items{" "}
                    <span className={totalQty >= MAX_QTY ? "text-red-500 font-semibold" : "text-gray-400"}>
                        ({totalQty}/{MAX_QTY})
                    </span>
                </span>
                <Button variant="outline" size="sm" onClick={handleAdd} disabled={totalQty >= MAX_QTY}>
                    <PlusIcon /> Add Component
                </Button>
            </div>

            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableCell isHeader className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 w-10 text-center">No.</TableCell>
                            <TableCell isHeader className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 w-[18%]">Item Code</TableCell>
                            <TableCell isHeader className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 w-[28%]">Item Name</TableCell>
                            <TableCell isHeader className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 w-[16%] text-right">Unit Price</TableCell>
                            <TableCell isHeader className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 w-[10%] text-center">Qty</TableCell>
                            <TableCell isHeader className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 w-[16%] text-right">Total Price</TableCell>
                        </TableRow>
                    </TableHeader>

                    <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                        {renderList.map(({ row, groupIdx, isFirst }) => {
                            const maxQtyForRow = isFirst
                                ? MAX_QTY - totalQty + (Number(row.qty) || 0)
                                : MAX_QTY;
                            const rowTotal = row.unitPrice !== "" && row.qty !== ""
                                ? Number(row.unitPrice) * Number(row.qty)
                                : null;

                            return (
                                <TableRow key={row.id} className={`hover:bg-gray-50 dark:hover:bg-white/[0.02] ${!isFirst ? "bg-brand-50/30 dark:bg-brand-500/5" : ""}`}>
                                    <TableCell className="px-3 py-2 text-center">
                                        {isFirst ? (
                                            <span className="text-sm text-gray-500 dark:text-gray-400">{groupIdx + 1}</span>
                                        ) : (
                                            <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold rounded bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">OR</span>
                                        )}
                                    </TableCell>

                                    <TableCell className="px-3 py-2">
                                        <div className="flex items-center gap-1">
                                            <Input type="text" placeholder="Code" value={row.itemcode} onChange={(e) => handleChange(row.id, "itemcode", e.target.value)} />
                                            <button type="button" title="Pick from list" onClick={() => setPickingRowId(row.id)} className="flex-shrink-0 p-1.5 rounded border border-gray-200 dark:border-white/[0.1] text-gray-400 hover:text-brand-500 hover:border-brand-500 transition-colors">
                                                <ListIcon />
                                            </button>
                                        </div>
                                    </TableCell>

                                    <TableCell className="px-3 py-2">
                                        <Input type="text" placeholder="Item name" value={row.itemname} onChange={(e) => handleChange(row.id, "itemname", e.target.value)} />
                                    </TableCell>

                                    <TableCell className="px-3 py-2">
                                        <Input type="number" placeholder="0" min="0" value={row.unitPrice === "" ? "" : row.unitPrice}
                                            onChange={(e) => handleChange(row.id, "unitPrice", e.target.value === "" ? "" : Number(e.target.value))} />
                                    </TableCell>

                                    <TableCell className="px-3 py-2">
                                        <Input type="number" placeholder="1" min="1" max={String(maxQtyForRow)} value={row.qty === "" ? "" : row.qty}
                                            onChange={(e) => {
                                                const val = e.target.value === "" ? "" : Number(e.target.value);
                                                const capped = val === "" ? "" : Math.min(Number(val), maxQtyForRow);
                                                handleChange(row.id, "qty", capped);
                                            }} />
                                    </TableCell>

                                    <TableCell className="px-3 py-2 text-right">
                                        <span className="text-sm font-medium text-gray-800 dark:text-white">
                                            {rowTotal !== null ? rowTotal.toLocaleString("vi-VN") : "—"}
                                        </span>
                                    </TableCell>

                                    <TableCell className="px-1 py-2 text-center">
                                        {isFirst && (
                                            <button type="button" title="Add alternative (OR)" onClick={() => handleAddAlternative(row.groupId)}
                                                className="px-1.5 py-0.5 text-[10px] font-bold rounded border border-brand-300 text-brand-500 hover:bg-brand-50 dark:border-brand-500/40 dark:text-brand-400 dark:hover:bg-brand-500/10 transition-colors">
                                                +OR
                                            </button>
                                        )}
                                    </TableCell>

                                    <TableCell className="px-1 py-2 text-center">
                                        <button type="button" onClick={() => handleDelete(row.id)}
                                            className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded disabled:opacity-30"
                                            disabled={rows.length === 1}>
                                            <TrashBinIcon />
                                        </button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-end gap-3 px-4 py-2 border-t border-gray-200 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.03]">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                    {groups.length} component{groups.length !== 1 ? "s" : ""}
                    {groups.some((g) => g.length > 1) && " (with alternatives)"}
                </span>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total:</span>
                <span className="text-sm font-semibold text-gray-800 dark:text-white min-w-[80px] text-right">
                    {totalPrice.toLocaleString("vi-VN")}
                </span>
            </div>

            <ItemPickerModal
                isOpen={pickingRowId !== null}
                onClose={() => setPickingRowId(null)}
                onSelect={handlePickSelect}
            />
        </div>
    );
}
