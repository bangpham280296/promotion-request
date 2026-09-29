"use client";

import React, { useState } from "react";
import ProtectAdmin from "@/components/auth/ProtectAdmin";
import UserTable from "@/components/users/UserTable";
import EmailRecipientsTable from "@/components/users/EmailRecipientsTable";
import { UserIcon, MailIcon } from "@/icons";

export default function UsersPage() {
    const [activeTab, setActiveTab] = useState<"users" | "recipients">("users");

    return (
        <ProtectAdmin>
            <div className="p-4 mx-auto max-w-screen-2xl md:p-6 space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                        Users & Notifications
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Manage team accounts and configure email alert recipients for new promotion requests.
                    </p>
                </div>

                {/* Tab Navigation */}
                <div className="border-b border-gray-200 dark:border-white/[0.08]">
                    <nav className="flex space-x-6" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab("users")}
                            className={`inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-all cursor-pointer ${activeTab === "users"
                                    ? "border-brand-500 text-brand-600 dark:text-brand-400"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200"
                                }`}
                        >
                            <UserIcon className="w-4 h-4" />
                            <span>Team Members</span>
                        </button>

                        <button
                            onClick={() => setActiveTab("recipients")}
                            className={`inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-all cursor-pointer ${activeTab === "recipients"
                                    ? "border-brand-500 text-brand-600 dark:text-brand-400"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200"
                                }`}
                        >
                            <MailIcon />
                            <span>Notification Recipients</span>
                        </button>
                    </nav>
                </div>

                {/* Tab Contents */}
                <div>
                    {activeTab === "users" ? <UserTable /> : <EmailRecipientsTable />}
                </div>
            </div>
        </ProtectAdmin>
    );
}
