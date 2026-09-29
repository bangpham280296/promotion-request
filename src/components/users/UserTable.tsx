"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Pagination from "@/components/tables/Pagination";
import CreateUserModal, { DepartmentOption } from "@/components/users/CreateUserModal";
import TableSkeleton from "@/components/common/TableSkeleton";
import { PlusIcon } from "@/icons";

export type UserRow = {
    id: string;
    email: string;
    fullname: string;
    employeecode: string;
    role: "admin" | "user" | string;
    department_id: number | null;
    deptcode: string;
    deptname: string;
    created_at: string;
    last_sign_in_at: string | null;
};

type SendResult = {
    email: string;
    success: boolean;
    error?: string;
};

const normalizeText = (text: string): string => {
    return (text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
};

const getInitials = (name: string): string => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function UserTable() {
    const [users, setUsers] = useState<UserRow[]>([]);
    const [departments, setDepartments] = useState<DepartmentOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [sending, setSending] = useState(false);
    const [results, setResults] = useState<SendResult[] | null>(null);

    // Filter & Search states
    const [search, setSearch] = useState("");
    const [deptFilter, setDeptFilter] = useState("all");
    const [roleFilter, setRoleFilter] = useState("all");
    const [pageSize, setPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    // Modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const fetchUsers = useCallback(async () => {
        try {
            const res = await fetch("/api/auth/list-users");
            const data = await res.json();
            if (res.ok) {
                setUsers(data.users ?? []);
                setDepartments(data.departments ?? []);
            } else {
                toast.error(data.error || "Failed to load user list.");
            }
        } catch {
            toast.error("Failed to load user list.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Filter logic
    const filteredUsers = useMemo(() => {
        return users.filter((u) => {
            // Text Search matching fullname, email, employeecode
            if (search.trim()) {
                const query = normalizeText(search.trim());
                const matchFullname = normalizeText(u.fullname).includes(query);
                const matchEmail = normalizeText(u.email).includes(query);
                const matchCode = normalizeText(u.employeecode).includes(query);
                if (!matchFullname && !matchEmail && !matchCode) return false;
            }

            // Department filter
            if (deptFilter !== "all") {
                if (String(u.department_id) !== deptFilter) return false;
            }

            // Role filter
            if (roleFilter !== "all") {
                if (u.role?.toLowerCase() !== roleFilter.toLowerCase()) return false;
            }

            return true;
        });
    }, [users, search, deptFilter, roleFilter]);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, deptFilter, roleFilter, pageSize]);

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
    const paginatedUsers = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredUsers.slice(start, start + pageSize);
    }, [filteredUsers, currentPage, pageSize]);

    // Selection logic
    const allFilteredSelected =
        filteredUsers.length > 0 &&
        filteredUsers.every((u) => selected.has(u.email));

    const toggleAll = () => {
        if (allFilteredSelected) {
            setSelected((prev) => {
                const next = new Set(prev);
                filteredUsers.forEach((u) => next.delete(u.email));
                return next;
            });
        } else {
            setSelected((prev) => {
                const next = new Set(prev);
                filteredUsers.forEach((u) => next.add(u.email));
                return next;
            });
        }
    };

    const toggleOne = (email: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(email) ? next.delete(email) : next.add(email);
            return next;
        });
    };

    const handleSend = async (sendAll: boolean) => {
        setSending(true);
        setResults(null);

        const emails = sendAll
            ? filteredUsers.map((u) => u.email)
            : Array.from(selected);
        const count = emails.length;

        if (count === 0) {
            toast.error("No users selected.");
            setSending(false);
            return;
        }

        try {
            const res = await fetch("/api/auth/send-credentials-bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ emails }),
            });
            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || "Failed to send emails.");
                return;
            }

            const sentResults: SendResult[] = data.results ?? [];
            setResults(sentResults);

            const successCount = sentResults.filter((r) => r.success).length;
            const failCount = sentResults.length - successCount;

            if (failCount === 0) {
                toast.success(`Credentials sent successfully to ${successCount}/${count} users.`);
            } else {
                toast.error(`${successCount} succeeded, ${failCount} failed.`);
            }
        } catch {
            toast.error("Connection error. Please try again.");
        } finally {
            setSending(false);
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleString("en-US", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const deptFilterOptions = useMemo(() => {
        return [
            { value: "all", label: "All Departments" },
            ...departments.map((d) => ({
                value: String(d.id),
                label: d.deptcode ? `${d.deptcode} - ${d.deptname}` : d.deptname,
            })),
        ];
    }, [departments]);

    const roleFilterOptions = [
        { value: "all", label: "All Roles" },
        { value: "admin", label: "Admin" },
        { value: "user", label: "User" },
    ];

    const pageSizeOptions = [
        { value: "10", label: "10 / page" },
        { value: "20", label: "20 / page" },
        { value: "50", label: "50 / page" },
    ];

    if (loading) {
        return <TableSkeleton rows={7} title="Team Members" />;
    }

    const startItem = filteredUsers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, filteredUsers.length);

    return (
        <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                {/* 1. Header Action Bar */}
                <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-white/[0.05]">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {filteredUsers.length} member{filteredUsers.length !== 1 ? "s" : ""}
                        </span>
                        <span className="text-sm text-gray-400">·</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {selected.size} selected
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">

                        <button
                            onClick={() => handleSend(false)}
                            disabled={sending || selected.size === 0}
                            className="px-3.5 py-2 text-sm font-medium rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-gray-600 dark:text-gray-300 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
                        >
                            {sending ? "Sending..." : `Send to Selected (${selected.size})`}
                        </button>
                        <button
                            onClick={() => handleSend(true)}
                            disabled={sending || filteredUsers.length === 0}
                            className="px-3.5 py-2 text-sm font-medium rounded-xl border border-brand-500 text-brand-600 hover:bg-brand-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-brand-500/30 dark:text-brand-400 dark:hover:bg-brand-500/10 transition-colors cursor-pointer"
                        >
                            {sending ? "Sending..." : `Send to All (${filteredUsers.length})`}
                        </button>
                    </div>
                </div>

                {/* 2. Filter & Search Bar */}
                <div className="p-4 border-b border-gray-100 dark:border-white/[0.05] bg-gray-50/30 dark:bg-white/[0.01]">
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                        {/* Search Input */}
                        <div className="flex-1">
                            <Input
                                type="text"
                                placeholder="Search by name, email, or employee code..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        {/* Dropdown Filters */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="w-full sm:w-44">
                                <Select
                                    options={deptFilterOptions}
                                    defaultValue={deptFilter}
                                    onChange={setDeptFilter}
                                />
                            </div>
                            <div className="w-full sm:w-36">
                                <Select
                                    options={roleFilterOptions}
                                    defaultValue={roleFilter}
                                    onChange={setRoleFilter}
                                />
                            </div>
                            <div className="w-full sm:w-32">
                                <Select
                                    options={pageSizeOptions}
                                    defaultValue={String(pageSize)}
                                    onChange={(val) => setPageSize(Number(val))}
                                />
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition-colors cursor-pointer shadow-theme-xs"
                            >
                                <PlusIcon />
                                <span> Add Member</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* 3. Table */}
                <div className="max-w-full overflow-x-auto">
                    <Table>
                        <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.02]">
                            <TableRow>
                                <TableCell isHeader className="px-5 py-3.5 w-12">
                                    <input
                                        type="checkbox"
                                        checked={allFilteredSelected}
                                        onChange={toggleAll}
                                        className="w-4 h-4 rounded border-gray-300 text-brand-500 cursor-pointer"
                                    />
                                </TableCell>
                                <TableCell isHeader className="px-5 py-3.5 font-medium text-gray-500 text-start text-xs uppercase tracking-wider dark:text-gray-400">
                                    Full Name
                                </TableCell>
                                <TableCell isHeader className="px-5 py-3.5 font-medium text-gray-500 text-start text-xs uppercase tracking-wider dark:text-gray-400">
                                    Employee Code
                                </TableCell>
                                <TableCell isHeader className="px-5 py-3.5 font-medium text-gray-500 text-start text-xs uppercase tracking-wider dark:text-gray-400">
                                    Email Address
                                </TableCell>
                                <TableCell isHeader className="px-5 py-3.5 font-medium text-gray-500 text-start text-xs uppercase tracking-wider dark:text-gray-400">
                                    Department
                                </TableCell>
                                <TableCell isHeader className="px-5 py-3.5 font-medium text-gray-500 text-start text-xs uppercase tracking-wider dark:text-gray-400">
                                    Role
                                </TableCell>
                                <TableCell isHeader className="px-5 py-3.5 font-medium text-gray-500 text-start text-xs uppercase tracking-wider dark:text-gray-400">
                                    Created Date
                                </TableCell>
                                <TableCell isHeader className="px-5 py-3.5 font-medium text-gray-500 text-start text-xs uppercase tracking-wider dark:text-gray-400">
                                    Last Sign-In
                                </TableCell>
                                <TableCell isHeader className="px-5 py-3.5 font-medium text-gray-500 text-start text-xs uppercase tracking-wider dark:text-gray-400">
                                    Delivery Status
                                </TableCell>
                            </TableRow>
                        </TableHeader>

                        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                            {paginatedUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={9}
                                        className="px-5 py-12 text-center text-sm text-gray-400 dark:text-gray-500"
                                    >
                                        No members found matching the filters.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedUsers.map((user) => {
                                    const result = results?.find((r) => r.email === user.email);
                                    const isAdmin = user.role?.toLowerCase() === "admin";

                                    return (
                                        <TableRow
                                            key={user.id}
                                            className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] cursor-pointer transition-colors"
                                            onClick={() => toggleOne(user.email)}
                                        >
                                            <TableCell className="px-5 py-3.5 w-12">
                                                <div onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selected.has(user.email)}
                                                        onChange={() => toggleOne(user.email)}
                                                        className="w-4 h-4 rounded border-gray-300 text-brand-500 cursor-pointer"
                                                    />
                                                </div>
                                            </TableCell>
                                            {/* Full Name with Avatar */}
                                            <TableCell className="px-5 py-3.5 text-gray-800 text-sm dark:text-gray-200">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 font-medium text-xs flex items-center justify-center shrink-0">
                                                        {getInitials(user.fullname || user.email)}
                                                    </div>
                                                    <span className="text-gray-800 dark:text-gray-200">
                                                        {user.fullname || (
                                                            <span className="text-gray-400 italic text-xs">—</span>
                                                        )}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            {/* Employee Code */}
                                            <TableCell className="px-5 py-3.5 text-sm text-gray-700 dark:text-gray-300">
                                                {user.employeecode || <span className="text-gray-400 text-xs italic">—</span>}
                                            </TableCell>
                                            {/* Email Address */}
                                            <TableCell className="px-5 py-3.5 text-gray-600 text-sm dark:text-gray-300">
                                                {user.email}
                                            </TableCell>
                                            {/* Department */}
                                            <TableCell className="px-5 py-3.5 text-sm text-gray-700 dark:text-gray-300">
                                                {user.deptname || user.deptcode || <span className="text-gray-400 text-xs italic">—</span>}
                                            </TableCell>
                                            {/* Role */}
                                            <TableCell className="px-5 py-3.5 text-sm">
                                                {isAdmin ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                                        Admin
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-white/[0.05] dark:text-gray-300">
                                                        User
                                                    </span>
                                                )}
                                            </TableCell>
                                            {/* Created Date */}
                                            <TableCell className="px-5 py-3.5 text-gray-500 text-sm dark:text-gray-400">
                                                {formatDate(user.created_at)}
                                            </TableCell>
                                            {/* Last Sign-In */}
                                            <TableCell className="px-5 py-3.5 text-gray-500 text-sm dark:text-gray-400">
                                                {formatDate(user.last_sign_in_at)}
                                            </TableCell>
                                            {/* Delivery Status */}
                                            <TableCell className="px-5 py-3.5">
                                                {result ? (
                                                    result.success ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                            ✓ Sent
                                                        </span>
                                                    ) : (
                                                        <span
                                                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                            title={result.error}
                                                        >
                                                            ✕ Failed
                                                        </span>
                                                    )
                                                ) : (
                                                    <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* 4. Client-side Pagination Footer */}
                {filteredUsers.length > 0 && (
                    <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 dark:border-white/[0.05]">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Showing <span className="font-medium text-gray-800 dark:text-white">{startItem}</span> to{" "}
                            <span className="font-medium text-gray-800 dark:text-white">{endItem}</span> of{" "}
                            <span className="font-medium text-gray-800 dark:text-white">{filteredUsers.length}</span> members
                        </p>

                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={(page) => setCurrentPage(page)}
                        />
                    </div>
                )}
            </div>

            {/* Create User Modal */}
            <CreateUserModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                departments={departments}
                onSuccess={fetchUsers}
            />
        </div>
    );
}
