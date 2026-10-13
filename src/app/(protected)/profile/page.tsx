"use client";
import { useEffect, useState } from "react";
import { Card, Input, Label, Button } from "@/components/ui";
import PhotoUpload from "@/components/photo-upload";
import PageLoader from "@/components/page-loader";
import { Save, KeyRound } from "lucide-react";
import toast from "react-hot-toast";

export default function Profile() {
    const [me, setMe] = useState<any>(null);
    const [name, setName] = useState("");
    const [photoUrl, setPhotoUrl] = useState("");
    const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
    const [saving, setSaving] = useState(false);
    const [changing, setChanging] = useState(false);

    useEffect(() => {
        fetch("/api/profile")
            .then((r) => r.json())
            .then((d) => {
                setMe(d);
                setName(d?.name || "");
                setPhotoUrl(d?.photoUrl || "");
            });
    }, []);

    if (!me) return <PageLoader />;

    const saveProfile = async (e: any) => {
        e.preventDefault();
        setSaving(true);
        const r = await fetch("/api/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, photoUrl }),
        });
        setSaving(false);
        if (!r.ok) {
            toast.error((await r.json()).error || "Failed to save profile.");
            return;
        }
        toast.success("Profile updated");
        window.dispatchEvent(new Event("profile-updated"));
    };

    const changePassword = async (e: any) => {
        e.preventDefault();
        if (pw.next !== pw.confirm) {
            toast.error("New password and confirmation do not match.");
            return;
        }
        setChanging(true);
        const r = await fetch("/api/profile/password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                currentPassword: pw.current,
                newPassword: pw.next,
            }),
        });
        setChanging(false);
        if (!r.ok) {
            toast.error((await r.json()).error || "Failed to change password.");
            return;
        }
        toast.success("Password changed");
        setPw({ current: "", next: "", confirm: "" });
    };

    return (
        <div>
            <div className="mb-4">
                <h1 className="text-2xl font-bold">My Profile</h1>

                <p className="text-sm text-slate-500">
                    Your account details and password.
                </p>
            </div>

            <div className="grid items-start gap-6 xl:grid-cols-2">
                <Card className="p-5">
                    <h2 className="mb-4 font-semibold">Profile</h2>

                    <form onSubmit={saveProfile} className="space-y-4">
                        <PhotoUpload value={photoUrl} onChange={setPhotoUrl} />

                        <div>
                            <Label required>Name</Label>

                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <Label>Email</Label>

                            <Input
                                value={me.email}
                                readOnly
                                className="bg-slate-50 text-slate-500"
                            />
                        </div>

                        <div>
                            <Label>Role</Label>

                            <Input
                                value={
                                    me.roles
                                        ?.map((r: any) => r.role.name)
                                        .join(", ") || "-"
                                }
                                readOnly
                                className="bg-slate-50 text-slate-500"
                            />
                        </div>

                        <Button type="submit" disabled={saving}>
                            <Save size={16} className="mr-1.5" />
                            Save Profile
                        </Button>
                    </form>
                </Card>

                <Card className="p-5">
                    <h2 className="mb-4 font-semibold">Change Password</h2>

                    <form onSubmit={changePassword} className="space-y-4">
                        <div>
                            <Label required>Current Password</Label>

                            <Input
                                type="password"
                                value={pw.current}
                                onChange={(e) =>
                                    setPw({ ...pw, current: e.target.value })
                                }
                                required
                            />
                        </div>

                        <div>
                            <Label required>New Password</Label>

                            <Input
                                type="password"
                                value={pw.next}
                                onChange={(e) =>
                                    setPw({ ...pw, next: e.target.value })
                                }
                                required
                            />
                        </div>

                        <div>
                            <Label required>Confirm New Password</Label>

                            <Input
                                type="password"
                                value={pw.confirm}
                                onChange={(e) =>
                                    setPw({ ...pw, confirm: e.target.value })
                                }
                                required
                            />
                        </div>

                        <Button type="submit" disabled={changing}>
                            <KeyRound size={16} className="mr-1.5" />
                            Change Password
                        </Button>
                    </form>
                </Card>
            </div>
        </div>
    );
}
