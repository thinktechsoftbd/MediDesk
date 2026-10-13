import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LayoutShell from "@/components/layout-shell";

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();

    if (!session) {
        redirect("/login");
    }

    return <LayoutShell>{children}</LayoutShell>;
}