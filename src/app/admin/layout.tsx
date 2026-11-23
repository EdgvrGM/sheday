import type { Metadata } from "next";

import { RequireAdmin } from "@/components/guards";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <RequireAdmin>{children}</RequireAdmin>;
}
