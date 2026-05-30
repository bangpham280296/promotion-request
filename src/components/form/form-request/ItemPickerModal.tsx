"use client";

import React, { useState, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import useItems from "@/hooks/useItems";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (id: string, name: string, price: number) => void;
};

export default function ItemPickerModal({ isOpen, onClose, onSelect }: Props) {
    const [search, setSearch] = useState("");
    const { items, loading, error } = useItems();

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return items;
        return items.filter(
            (item) =>
                item.itemcode.toLowerCase().includes(q) ||
                item.itemname.toLowerCase().includes(q)
        );
    }, [search, items]);

    const handleSelect = (id: string, name: string, price: number) => {
        onSelect(id, name, price);
        setSearch("");
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-[580px] p-5">
            <h4 className="mb-8 text-base font-medium text-gray-800 dark:text-white/90">
                Select Item
            </h4>

            <div className="mb-3 mt-3">
                <Input
                    type="text"
                    placeholder="Search by code or name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="overflow-y-auto max-h-[360px] rounded-lg border border-gray-200 dark:border-white/[0.05]">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableCell
                                isHeader
                                className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400"
                            >
                                Code
                            </TableCell>
                            <TableCell
                                isHeader
                                className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400"
                            >
                                Name
                            </TableCell>
                            <TableCell
                                isHeader
                                className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 text-right"
                            >
                                Price
                            </TableCell>
                        </TableRow>
                    </TableHeader>

                    <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                        {loading ? (
                            <tr>
                                <td colSpan={3} className="px-3 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
                                    Loading...
                                </td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan={3} className="px-3 py-6 text-center text-sm text-red-400">
                                    Failed to load items.
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={3}
                                    className="px-3 py-6 text-center text-sm text-gray-400 dark:text-gray-500"
                                >
                                    No items found.
                                </td>
                            </tr>
                        ) : (
                            filtered.map((item) => (
                                <TableRow
                                    key={item.itemcode}
                                    className="cursor-pointer hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                                    onClick={() => handleSelect(item.itemcode, item.itemname, item.price)}
                                >
                                    <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 font-mono">
                                        {item.itemcode}
                                    </TableCell>
                                    <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                                        {item.itemname}
                                    </TableCell>
                                    <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 text-right">
                                        {item.price.toLocaleString("vi-VN")}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </Modal>
    );
}
