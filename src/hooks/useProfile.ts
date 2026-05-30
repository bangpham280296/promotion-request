"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";

export default function useProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // 👉 lấy employees + join department
const { data: userData } = await supabase.auth.getUser();

if (!userData.user) return;

const { data, error } = await supabase
  .from("employees")
  .select(`
    *,
    department:department_id (
      id,
      deptcode,
      deptname
    )
  `)
  .eq("user_id", userData.user.id)
  .maybeSingle();

      if (!error) {
        setProfile({
          ...data,
          email: user.email, // lấy từ auth
        });
      }

      setLoading(false);
    };

    getProfile();
  }, []);
  
  return { profile, loading };
}