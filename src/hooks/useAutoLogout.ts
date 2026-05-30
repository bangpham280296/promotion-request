"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import { useRouter } from "next/navigation";

type UseAutoLogoutOptions = {
  timeout?: number;
  enabled?: boolean;
};

export default function useAutoLogout({
  timeout = 20 * 60 * 1000,
  enabled = true,
}: UseAutoLogoutOptions = {}) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter(); 

  useEffect(() => {
    if (!enabled) return;

    const logout = async () => {
      await supabase.auth.signOut();

      router.replace("/signin");
    };

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(logout, timeout);
    };

    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ];

    events.forEach((event) =>
      window.addEventListener(event, resetTimer)
    );

    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) =>
        window.removeEventListener(event, resetTimer)
      );
    };
  }, [timeout, enabled, router]);
}