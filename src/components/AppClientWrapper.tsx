"use client";

import useAutoLogout from "@/hooks/useAutoLogout";
import useAuth from "@/hooks/useAuth";

export default function AppClientWrapper({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user } = useAuth();

    useAutoLogout({ enabled: !!user });

    return <>{children}</>;
}