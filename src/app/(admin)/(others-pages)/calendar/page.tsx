import Calendar from "@/components/calendar/Calendar";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Calendar | View request promotion by calendar",
  description:
    "View request promotion by calendar",
  // other metadata
};
export default async function page() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  return (
    <div>
      {/* <PageBreadcrumb pageTitle="Calendar" /> */}
      <Calendar />
    </div>
  );
}
