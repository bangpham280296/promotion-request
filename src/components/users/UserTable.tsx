"use client";

import React, { useEffect, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

type UserRow = {
    id: string;
    email: string;
    fullname: string;
    created_at: string;
    last_sign_in_at: string | null;
};

type SendResult = {
    email: string;
    success: boolean;
    error?: string;
};

export default function UserTable() {
    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [sending, setSending] = useState(false);
    const [results, setResults] = useState<SendResult[] | null>(null);

    useEffect(() => {
        fetch("/api/auth/list-users")
            .then((r) => r.json())
            .then((data) => setUsers(data.users ?? []))
            .catch(() => toast.error("Failed to load user list."))
            .finally(() => setLoading(false));
    }, []);

    const allSelected = users.length > 0 && selected.size === users.length;

    const toggleAll = () => {
        if (allSelected) {
            setSelected(new Set());
        } else {
            setSelected(new Set(users.map((u) => u.email)));
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

        const emails = sendAll ? [] : Array.from(selected);
        const count = sendAll ? users.length : emails.length;

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

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16 text-gray-500">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    <span>Loading team members...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                <div className="p-4 flex items-center justify-between gap-3 border-b border-gray-100 dark:border-white/[0.05]">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {users.length} member{users.length !== 1 ? "s" : ""} · {selected.size} selected
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleSend(false)}
                            disabled={sending || selected.size === 0}
                            className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-gray-600 dark:text-gray-300 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
                        >
                            {sending ? "Sending..." : `Send to Selected (${selected.size})`}
                        </button>
                        <button
                            onClick={() => handleSend(true)}
                            disabled={sending || users.length === 0}
                            className="px-4 py-2 text-sm font-medium rounded-xl bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                            {sending ? "Sending..." : `Send to All (${users.length})`}
                        </button>
                    </div>
                </div>

                <div className="max-w-full overflow-x-auto">
                    <Table>
                        <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.02]">
                            <TableRow>
                                <TableCell isHeader className="px-5 py-3.5 w-12">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={toggleAll}
                                        className="w-4 h-4 rounded border-gray-300 text-brand-500 cursor-pointer"
                                    />
                                </TableCell>
                                <TableCell isHeader className="px-5 py-3.5 font-medium text-gray-500 text-start text-xs uppercase tracking-wider dark:text-gray-400">
                                    Full Name
                                </TableCell>
                                <TableCell isHeader className="px-5 py-3.5 font-medium text-gray-500 text-start text-xs uppercase tracking-wider dark:text-gray-400">
                                    Email Address
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
                            {users.map((user) => {
                                const result = results?.find((r) => r.email === user.email);
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
                                        <TableCell className="px-5 py-3.5 text-gray-800 text-sm dark:text-gray-200 font-medium">
                                            {user.fullname || <span className="text-gray-400 italic text-xs">—</span>}
                                        </TableCell>
                                        <TableCell className="px-5 py-3.5 text-gray-800 text-sm dark:text-gray-200 font-medium">
                                            {user.email}
                                        </TableCell>
                                        <TableCell className="px-5 py-3.5 text-gray-500 text-sm dark:text-gray-400">
                                            {formatDate(user.created_at)}
                                        </TableCell>
                                        <TableCell className="px-5 py-3.5 text-gray-500 text-sm dark:text-gray-400">
                                            {formatDate(user.last_sign_in_at)}
                                        </TableCell>
                                        <TableCell className="px-5 py-3.5">
                                            {result ? (
                                                result.success ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                        ✓ Sent
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" title={result.error}>
                                                        ✕ Failed
                                                    </span>
                                                )
                                            ) : (
                                                <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
