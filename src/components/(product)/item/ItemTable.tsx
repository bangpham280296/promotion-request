"use client";

import React, { useEffect, useState, useRef } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import Pagination from "@/components/tables/Pagination";
import Input from "@/components/form/input/InputField";
import { PencilIcon } from "@/icons";
import { useAllItems } from "@/hooks/useItems";
import type { AllItem } from "@/hooks/useItems";
import ItemEditModal from "./ItemEditModal";

const ITEMS_PER_PAGE = 50;

export default function ItemTable() {
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [editingItem, setEditingItem] = useState<AllItem | null>(null);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { items, totalCount, loading, error, fetchAllItems } = useAllItems(ITEMS_PER_PAGE);

    useEffect(() => {
        fetchAllItems(currentPage, search);
    }, [currentPage, fetchAllItems]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearch(value);
        setCurrentPage(1);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchAllItems(1, value);
        }, 300);
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleEditSuccess = () => {
        fetchAllItems(currentPage, search);
    };

    const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

    return (
        <div>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                <div className="p-4 flex justify-between items-center">
                    <Input
                        type="text"
                        placeholder="Search by code or name..."
                        value={search}
                        onChange={handleSearch}
                    />
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-4 whitespace-nowrap">
                        {totalCount.toLocaleString()} item{totalCount !== 1 ? "s" : ""}
                    </span>
                </div>

                <div className="max-w-full overflow-x-auto">
                    <Table>
                        <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                            <TableRow>
                                <TableCell isHeader className="px-5 py-3 w-14 text-center font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                                    No.
                                </TableCell>
                                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                    Item Code
                                </TableCell>
                                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                    Item Name
                                </TableCell>
                                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-end text-theme-xs dark:text-gray-400">
                                    Price (VND)
                                </TableCell>
                                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                    Status
                                </TableCell>
                                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                    Item Picker
                                </TableCell>
                                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                    Action
                                </TableCell>
                            </TableRow>
                        </TableHeader>

                        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                                        Loading...
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-8 text-center text-sm text-red-400">
                                        Error: {error}
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                                        No items found.
                                    </td>
                                </tr>
                            ) : (
                                items.map((item, index) => (
                                    <TableRow key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                                        <TableCell className="px-5 py-3 text-center text-gray-400 text-theme-xs dark:text-gray-500">
                                            {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                                        </TableCell>
                                        <TableCell className="px-5 py-3 font-mono text-gray-700 text-theme-sm dark:text-gray-300">
                                            {item.itemcode}
                                        </TableCell>
                                        <TableCell className="px-5 py-3 text-gray-700 text-theme-sm dark:text-gray-300">
                                            {item.itemname}
                                        </TableCell>
                                        <TableCell className="px-5 py-3 text-end text-gray-700 text-theme-sm dark:text-gray-300">
                                            {item.price.toLocaleString("vi-VN")}
                                        </TableCell>
                                        <TableCell className="px-5 py-3 text-start">
                                            <Badge color={item.status === 1 ? "success" : "error"}>
                                                {item.status === 1 ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-5 py-3 text-start">
                                            <input
                                                type="checkbox"
                                                checked={!!item.itempicker}
                                                readOnly
                                                className="w-4 h-4 accent-brand-500 cursor-default"
                                            />
                                        </TableCell>
                                        <TableCell className="px-5 py-3 text-start">
                                            <div
                                                className="relative inline-block group cursor-pointer"
                                                onClick={() => setEditingItem(item)}
                                            >
                                                <PencilIcon />
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 dark:bg-gray-700 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                                    Edit
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <div className="mt-4">
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
            </div>

            <ItemEditModal
                isOpen={!!editingItem}
                item={editingItem}
                onClose={() => setEditingItem(null)}
                onSuccess={handleEditSuccess}
            />
        </div>
    );
}
