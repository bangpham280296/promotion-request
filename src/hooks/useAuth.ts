"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";

export default function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      setLoading(false);
    };

    getUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
  await supabase.auth.signOut();
};

const changePassword = async (
  currentPassword: string,
  newPassword: string
) => {
  try {
    // Lấy user hiện tại
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email;

    if (!email) {
      return { error: "Can't get user information" };
    }

    //  Re-login để verify password cũ
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });

    if (signInError) {
      return { error: "Current password is wrong" };
    }

    // Update password mới
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return { error: "Change password no success" };
    }

    return { success: true };
  } catch (err) {
    return { error: "ERRROR" };
  }
};




  return { user,
     loading, 
     logout ,
     changePassword
    };
}