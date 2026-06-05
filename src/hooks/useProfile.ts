"use client";

import { useAuthContext } from "@/context/AuthContext";

export default function useProfile() {
    const { profile, authLoading, profileLoading } = useAuthContext();
    return { profile, loading: authLoading || profileLoading };
}
