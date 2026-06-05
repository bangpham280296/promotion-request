"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import { toast } from "sonner";

// Cleared automatically when the browser tab/window is closed
const SESSION_ALIVE_KEY = "sb-session-alive";
const INACTIVITY_MS = 20 * 60 * 1000; // 20 minutes

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
    const [profile, setProfile] = useState<any>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [profileLoading, setProfileLoading] = useState(true);

    const fetchProfile = async (userId: string, email: string) => {
        setProfileLoading(true);
        const { data, error } = await supabase
            .from("employees")
            .select(`*, department:department_id(id, deptcode, deptname)`)
            .eq("user_id", userId)
            .maybeSingle();

        if (!error) {
            setProfile({ ...data, email });
        }
        setProfileLoading(false);
    };

    // Auth init + browser-close guard
    useEffect(() => {
        let listenerUnsub: (() => void) | null = null;

        const init = async () => {
            // If sessionStorage flag is missing, the browser was closed → force clear session
            if (typeof window !== "undefined") {
                if (!sessionStorage.getItem(SESSION_ALIVE_KEY)) {
                    await supabase.auth.signOut();
                }
                sessionStorage.setItem(SESSION_ALIVE_KEY, "1");
            }

            // onAuthStateChange fires immediately with INITIAL_SESSION
            const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
                const u = session?.user ?? null;
                setUser(u);

                if (u && (event === "INITIAL_SESSION" || event === "SIGNED_IN")) {
                    await fetchProfile(u.id, u.email ?? "");
                } else if (!u) {
                    setProfile(null);
                    setProfileLoading(false);
                }

                setAuthLoading(false);
            });

            listenerUnsub = () => listener.subscription.unsubscribe();
        };

        init();

        return () => listenerUnsub?.();
    }, []);

    // Inactivity auto-logout after 20 minutes
    useEffect(() => {
        if (!user) return;

        let inactivityTimer: ReturnType<typeof setTimeout>;

        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(async () => {
                toast.info("You have been logged out due to inactivity.");
                await supabase.auth.signOut();
            }, INACTIVITY_MS);
        };

        const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
        events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
        resetTimer(); // Start timer on login

        return () => {
            clearTimeout(inactivityTimer);
            events.forEach((e) => window.removeEventListener(e, resetTimer));
        };
    }, [user]);

    const logout = async () => {
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
