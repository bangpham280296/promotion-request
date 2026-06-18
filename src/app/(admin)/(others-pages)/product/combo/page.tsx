"use client";

import ComboTable from "@/components/(product)/combo/ComboTable";

export default function ComboPage() {
    return (
        <div className="p-4 mx-auto max-w-screen-2xl md:p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
                    Combo Management
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    All combo items from promotion requests. Click a row to view details.
                </p>
            </div>
            <ComboTable />
        </div>
    );
}
