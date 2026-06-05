"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";

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

    useEffect(() => {
        // Lấy session hiện tại — 1 lần duy nhất
        supabase.auth.getUser().then(({ data }) => {
            const u = data.user ?? null;
            setUser(u);
            setAuthLoading(false);
            if (u) {
                fetchProfile(u.id, u.email ?? "");
            } else {
                setProfileLoading(false);
            }
        });

        // Lắng nghe thay đổi auth — 1 listener duy nhất cho toàn app
        const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
            const u = session?.user ?? null;
            setUser(u);
            if (u) {
                await fetchProfile(u.id, u.email ?? "");
            } else {
                setProfile(null);
                setProfileLoading(false);
            }
        });

        return () => listener.subscription.unsubscribe();
    }, []);

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
