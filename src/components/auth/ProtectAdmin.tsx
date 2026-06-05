"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import useProfile from "@/hooks/useProfile";

export default function ProtectAdmin({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const { profile, loading: profileLoading } = useProfile();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/signin");
        }
    }, [user, authLoading, router]);

    const loading = authLoading || profileLoading;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 text-gray-500">
                Loading...
            </div>
        );
    }

    if (!user) return null;

    if (profile?.role !== "admin") {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-4">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 1.25C9.37665 1.25 7.25 3.37665 7.25 6V8.5H6C4.75736 8.5 3.75 9.50736 3.75 10.75V19.25C3.75 20.4926 4.75736 21.5 6 21.5H18C19.2426 21.5 20.25 20.4926 20.25 19.25V10.75C20.25 9.50736 19.2426 8.5 18 8.5H16.75V6C16.75 3.37665 14.6234 1.25 12 1.25ZM15.25 8.5V6C15.25 4.20507 13.7949 2.75 12 2.75C10.2051 2.75 8.75 4.20507 8.75 6V8.5H15.25ZM12 12.25C12.4142 12.25 12.75 12.5858 12.75 13V17C12.75 17.4142 12.4142 17.75 12 17.75C11.5858 17.75 11.25 17.4142 11.25 17V13C11.25 12.5858 11.5858 12.25 12 12.25Z" fill="#ef4444" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-1">
                        Access Denied
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        You can't access this page because you don't have the required permissions.
                    </p>
                </div>
                <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.08] rounded-lg px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    Required Permission: <span className="font-semibold text-brand-500">admin</span>
                    {profile?.role && (
                        <span className="ml-2 text-gray-400">
                            · Current Permission: <span className="font-medium">{profile.role}</span>
                        </span>
                    )}
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
