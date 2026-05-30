import Calendar from "@/components/calendar/Calendar";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Calendar | View request promotion by calendar",
  description:
    "View request promotion by calendar",
  // other metadata
};
export default function page() {
  return (
    <div>
      {/* <PageBreadcrumb pageTitle="Calendar" /> */}
      <Calendar />
    </div>
  );
}
