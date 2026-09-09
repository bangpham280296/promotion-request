"use client";

import React from "react";
import { SWRConfig } from "swr";

export default function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateIfStale: true,
        dedupingInterval: 30000,
      }}
    >
      {children}
    </SWRConfig>
  );
}
