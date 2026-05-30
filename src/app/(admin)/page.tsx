import type { Metadata } from "next";
import React from "react";
import BasicTableOne from "@/components/tables/BasicTableOne";
import ComponentCard from "@/components/common/ComponentCard";
import Protected from "@/components/auth/ProtectPage";

export const metadata: Metadata = {
  title:
    "Promotion Management | Follow-up on Promotions Request",
  description: "This is Next.js Home for TailAdmin Dashboard Template",
};

export default function Ecommerce() {
  return (
    <Protected>
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12">
          <ComponentCard title="Promotion Requests">
            <BasicTableOne />
          </ComponentCard>
        </div>
      </div>
    </Protected>
  );
}
