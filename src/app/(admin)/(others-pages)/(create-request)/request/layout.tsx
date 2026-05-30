
import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title:
        "Request promotion | Promotions Request",
    description: "Show all request promotion",
};

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div>{children}</div>
    );
}
