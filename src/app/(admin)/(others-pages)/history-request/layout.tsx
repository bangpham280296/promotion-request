
import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title:
        "History Request | Promotions Request",
    description: "Request promotion by user",
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
