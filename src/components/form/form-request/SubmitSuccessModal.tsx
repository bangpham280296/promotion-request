"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { toast } from "sonner";

type Props = {
    isOpen: boolean;
    requestcode: string;
    promotionname: string;
    onCreateNew: () => void;
    onViewHistory: () => void;
};

export default function SubmitSuccessModal({
    isOpen,
    requestcode,
    promotionname,
    onCreateNew,
    onViewHistory,
}: Props) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(requestcode);
        setCopied(true);
        toast.success("Copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onCreateNew}
            showCloseButton={false}
            className="max-w-md mx-4 p-8"
        >
            {/* Success icon */}
            <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                        <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.707 7.293a1 1 0 0 0-1.414 0L10 14.586l-2.293-2.293a1 1 0 0 0-1.414 1.414l3 3a1 1 0 0 0 1.414 0l6-6a1 1 0 0 0 0-1.414z"
                            fill="#22c55e"
                        />
                    </svg>
                </div>

                <div>
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                        Request Submitted!
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Your promotion request has been created successfully.
                    </p>
                </div>

                {/* Request info box */}
                <div className="w-full bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.08] rounded-xl p-4 space-y-3 text-left">
                    <div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                            Request Code
                        </p>
                        <div className="flex items-center justify-between mt-1 gap-2">
                            <span className="text-base font-semibold text-brand-500 tracking-wide">
                                {requestcode}
                            </span>
                            <button
                                onClick={handleCopy}
                                className="text-xs px-2 py-1 rounded-md bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/[0.10] transition-colors shrink-0"
                            >
                                {copied ? "Copied!" : "Copy"}
                            </button>
                        </div>
                    </div>

                    <div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                            Promotion Name
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 break-words">
                            {promotionname}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex w-full gap-3 pt-2">
                    <Button
                        variant="outline"
                        onClick={onCreateNew}
                        className="flex-1"
                        size="sm"
                    >
                        Create New
                    </Button>
                    <Button
                        onClick={onViewHistory}
                        className="flex-1"
                        size="sm"
                    >
                        View History
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
