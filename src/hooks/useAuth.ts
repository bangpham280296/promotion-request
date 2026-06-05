"use client";

import { useAuthContext } from "@/context/AuthContext";

export default function useAuth() {
    const { user, authLoading: loading, logout, changePassword } = useAuthContext();
    return { user, loading, logout, changePassword };
}
