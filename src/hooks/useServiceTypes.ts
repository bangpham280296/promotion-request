import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";

type MultiSelectOption = { value: string; text: string; selected: boolean };

export function useServiceTypes(): MultiSelectOption[] {
  const [options, setOptions] = useState<MultiSelectOption[]>([]);

  useEffect(() => {
    supabase
      .from("servicetype")
      .select("name")
      .eq("active", true)
      .order("id")
      .then(({ data }) => {
        if (data) {
          setOptions(data.map((r) => ({ value: r.name, text: r.name, selected: false })));
        }
      });
  }, []);

  return options;
}
