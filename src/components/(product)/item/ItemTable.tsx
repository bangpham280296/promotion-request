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
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import { PencilIcon, ArrowUpIcon, ArrowDownIcon } from "@/icons";
import { useAllItems, useCategories } from "@/hooks/useItems";
import type { AllItem } from "@/hooks/useItems";
import ItemEditModal from "./ItemEditModal";
import CreateItemModal from "./CreateItemModal";

const ITEMS_PER_PAGE = 50;

export default function ItemTable() {
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
    const [editingItem, setEditingItem] = useState<AllItem | null>(null);
    const [createModalKey, setCreateModalKey] = useState(0);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [sortAsc, setSortAsc] = useState(true);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { items, totalCount, loading, error, fetchAllItems } = useAllItems(ITEMS_PER_PAGE);
    const { categories } = useCategories();

    useEffect(() => {
        fetchAllItems(currentPage, search, categoryFilter, sortAsc);
    }, [currentPage, fetchAllItems]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearch(value);
        setCurrentPage(1);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchAllItems(1, value, categoryFilter, sortAsc);
        }, 300);
    };

    const handleCategoryFilter = (val: string) => {
        const id = val === "all" ? null : Number(val);
        setCategoryFilter(id);
        setCurrentPage(1);
        fetchAllItems(1, search, id, sortAsc);
    };

    const handleToggleSort = () => {
        const newSortAsc = !sortAsc;
        setSortAsc(newSortAsc);
        setCurrentPage(1);
        fetchAllItems(1, search, categoryFilter, newSortAsc);
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleEditSuccess = () => {
        fetchAllItems(currentPage, search, categoryFilter, sortAsc);
    };

    const handleOpenCreate = () => {
        setCreateModalKey((k) => k + 1);
        setShowCreateModal(true);
    };

    const handleCreateSuccess = () => {
        fetchAllItems(1, search, categoryFilter, sortAsc);
        setCurrentPage(1);
    };

    const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

    const categoryOptions = [
        { value: "all", label: "All Categories" },
        ...categories.map((cat) => ({ value: String(cat.id), label: cat.Description })),
    ];

    return (
        <div>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                <div className="p-4 flex flex-wrap gap-3 items-center">
                    <div className="flex-1 min-w-48">
                        <Input
                            type="text"
                            placeholder="Search by code or name..."
                            value={search}
                            onChange={handleSearch}
                        />
                    </div>
                    <div className="w-52">
                        <Select
                            options={categoryOptions}
                            defaultValue="all"
                            placeholder="Filter by category"
                            onChange={handleCategoryFilter}
                        />
                    </div>
                    <Button size="sm" onClick={handleOpenCreate}>
                        + New Item
                    </Button>
                    <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
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
                                    <div className="flex items-center gap-1.5">
                                        Item Code
                                        <button
                                            onClick={handleToggleSort}
                                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                            title={sortAsc ? "Sort Z→A" : "Sort A→Z"}
                                        >
                                            {sortAsc ? <ArrowUpIcon /> : <ArrowDownIcon />}
                                        </button>
                                    </div>
                                </TableCell>
                                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                    Item Name
                                </TableCell>
                                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                    Category
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
                                    <td colSpan={8} className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                                        Loading...
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={8} className="px-5 py-8 text-center text-sm text-red-400">
                                        Error: {error}
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
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
                                        <TableCell className="px-5 py-3 text-gray-700 text-theme-sm dark:text-gray-300">
                                            {item.category?.Description ?? "—"}
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

            <CreateItemModal
                key={createModalKey}
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={handleCreateSuccess}
            />
        </div>
    );
}
