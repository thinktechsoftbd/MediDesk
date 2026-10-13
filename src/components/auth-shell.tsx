import { Card } from "@/components/ui";

// Centered card used by login, forgot and reset password pages
export default function AuthShell({ subtitle, children }: { subtitle: string; children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 to-slate-100 p-4">
            <Card className="w-full max-w-md p-8">
                <div className="mb-8 text-center">
                    <div className="text-2xl font-bold text-teal-700">Mohonto Dental Care</div>
                    <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
                </div>
                {children}
                <p className="mt-5 text-center text-xs text-slate-400">
                    © {new Date().getFullYear()} ThinkTech. All Rights Reserved. | Powered by ThinkTech
                </p>
            </Card>
        </div>
    );
}
