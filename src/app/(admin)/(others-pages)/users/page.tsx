"use client";

import ProtectAdmin from "@/components/auth/ProtectAdmin";
import UserTable from "@/components/users/UserTable";

export default function UsersPage() {
    return (
        <ProtectAdmin>
            <div className="p-4 mx-auto max-w-screen-2xl md:p-6">
                <div className="mb-6">
                    <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">User Management</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        User management
                    </p>
                </div>
                <UserTable />
            </div>
        </ProtectAdmin>
    );
}
