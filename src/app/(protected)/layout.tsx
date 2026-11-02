import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LayoutShell from "@/components/layout-shell";
import { db } from "@/lib/prisma";

// The browser tab shows the active organization's name.
export async function generateMetadata() {
    const org = await db.organization.findFirst({
        where: { isActive: true },
        orderBy: { id: "asc" },
        select: { nameEn: true },
    });
    return { title: org?.nameEn ?? "MediDesk" };
}

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