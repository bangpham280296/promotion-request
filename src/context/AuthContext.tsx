"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import { toast } from "sonner";

// Cleared automatically when the browser tab/window is closed
const SESSION_ALIVE_KEY = "sb-session-alive";
const PROFILE_CACHE_KEY = "sb-profile-cache";

type AuthContextType = {
    user: any | null;
    profile: any | null;
    authLoading: boolean;
    profileLoading: boolean;
    logout: () => Promise<void>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<{ success?: boolean; error?: string }>;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    authLoading: true,
    profileLoading: true,
    logout: async () => {},
    changePassword: async () => ({ error: "Not initialized" }),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(() => {
        // Hydrate cached profile immediately on client
        if (typeof window !== "undefined") {
            try {
                const cached = localStorage.getItem(PROFILE_CACHE_KEY);
                return cached ? JSON.parse(cached) : null;
            } catch {
                return null;
            }
        }
        return null;
    });
    const [authLoading, setAuthLoading] = useState(true);
    const [profileLoading, setProfileLoading] = useState(true);

    const fetchProfile = async (userId: string, email: string) => {
        setProfileLoading(true);
        try {
            const { data, error } = await supabase
                .from("employees")
                .select(`*, department:department_id(id, deptcode, deptname)`)
                .eq("user_id", userId)
                .maybeSingle();

            if (!error && data) {
                const fullProfile = { ...data, email };
                setProfile(fullProfile);
                if (typeof window !== "undefined") {
                    try {
                        localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(fullProfile));
                    } catch {}
                }
            }
        } catch (err) {
            console.error("Failed to fetch profile:", err);
        } finally {
            setProfileLoading(false);
        }
    };

    // Auth init + browser-close guard
    useEffect(() => {
        let listenerUnsub: (() => void) | null = null;

        const init = async () => {
            // If sessionStorage flag is missing, the browser was closed → force clear session
            if (typeof window !== "undefined") {
                if (!sessionStorage.getItem(SESSION_ALIVE_KEY)) {
                    if (typeof window !== "undefined") {
                        localStorage.removeItem(PROFILE_CACHE_KEY);
                    }
                    await supabase.auth.signOut();
                }
                sessionStorage.setItem(SESSION_ALIVE_KEY, "1");
            }

            // onAuthStateChange fires immediately with INITIAL_SESSION
            const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
                const u = session?.user ?? null;
                setUser(u);

                // ✅ UNBLOCK AUTH IMMEDIATELY: Allows router.push/replace and page rendering in <50ms
                setAuthLoading(false);

                if (u && (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "USER_UPDATED")) {
                    // Non-blocking background fetch
                    fetchProfile(u.id, u.email ?? "");
                } else if (!u) {
                    setProfile(null);
                    setProfileLoading(false);
                    if (typeof window !== "undefined") {
                        localStorage.removeItem(PROFILE_CACHE_KEY);
                    }
                }
            });

            listenerUnsub = () => listener.subscription.unsubscribe();
        };

        init();

        return () => listenerUnsub?.();
    }, []);

    const logout = async () => {
        if (typeof window !== "undefined") {
            localStorage.removeItem(PROFILE_CACHE_KEY);
        }
        setProfile(null);
        await supabase.auth.signOut();
    };

    const changePassword = async (currentPassword: string, newPassword: string) => {
        try {
            const email = user?.email;
            if (!email) return { error: "Can't get user information" };

            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password: currentPassword,
            });
            if (signInError) return { error: "Current password is wrong" };

            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
            });
            if (updateError) return { error: "Change password no success" };

            return { success: true };
        } catch {
            return { error: "ERROR" };
        }
    };

    return (
        <AuthContext.Provider value={{ user, profile, authLoading, profileLoading, logout, changePassword }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuthContext() {
    return useContext(AuthContext);
}
