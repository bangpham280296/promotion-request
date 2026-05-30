
import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title:
        "Items | List of items",
    description: "List of all available items",
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
