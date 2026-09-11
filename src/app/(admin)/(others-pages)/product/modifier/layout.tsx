import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Modifier Matrix | KFC Promotion Admin",
  description: "Global modifier and trade-up price matrix management",
};

export default function ModifierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div>{children}</div>;
}
