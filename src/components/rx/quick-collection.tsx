"use client";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import toast from "react-hot-toast";
import { useCan } from "@/components/permissions-context";
import { collectionHistoryUrl, tk } from "@/components/agreement-panel";

const today = () => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// Bill collection from the prescription page: the running agreement's
// total / collected / due, an amount and a discount box. Saves a cash collection for this
// case on that agreement and creates its draft journal voucher (as Save & Finalize does).
// As on the Bill Collection page: amount = paid + discount, and the discount only lowers the due.
export default function QuickCollection({ patientId, caseId, caseLabel }: { patientId: number; caseId: number; caseLabel: string }) {
    const can = useCan();
    const [agreement, setAgreement] = useState<any>(undefined); // undefined = loading, null = none running
    const [amount, setAmount] = useState("");
    const [discount, setDiscount] = useState("");
    const [saving, setSaving] = useState(false);

    const load = useCallback(
        () =>
            fetch(`/api/patients/${patientId}/agreements`)
                .then((r) => r.json())
                .then((rows) => setAgreement((Array.isArray(rows) ? rows : []).find((a: any) => a.isClosed === "N") || null))
                .catch(() => setAgreement(null)),
        [patientId]
    );

    useEffect(() => {
        load();
    }, [load]);

    const collect = async () => {
        const n = Number(amount || 0);
        const d = Number(discount || 0);
        if (isNaN(n) || isNaN(d) || n < 0 || d < 0) return toast.error("Amount and discount must be numbers.");
        if (!(n > 0) && !(d > 0)) return toast.error("Enter the amount collected or a discount.");
        if (agreement && n + d > agreement.dues && !confirm(`${tk(n + d)} (amount + discount) is more than the due ${tk(agreement.dues)}. Save anyway?`)) return;
        if (!agreement && !confirm("This patient has no running agreement. Save the collection without one?")) return;
        setSaving(true);
        const r = await fetch("/api/payments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                patientId,
                caseHistoryId: caseId,
                agreementId: agreement?.id || "",
                description: `${caseLabel} collection`,
                amount: n + d,
                discount: d,
                paidAmount: n,
                type: "PAYMENT",
                method: "CASH",
                paymentDate: today(),
            }),
        });
        const saved = await r.json().catch(() => null);
        if (!r.ok) {
            setSaving(false);
            return toast.error(saved?.error || "Could not save the collection.");
        }
        toast.success([n > 0 && `${tk(n)} collected`, d > 0 && `${tk(d)} discount`].filter(Boolean).join(", "));
        // the voucher books the cash only; a discount-only entry has none
        if (n > 0) {
            const f = await fetch(`/api/payments/${saved.id}/finalize`, { method: "POST" });
            const v = await f.json().catch(() => null);
            if (f.ok) toast.success(`Draft journal voucher ${v?.voucherNo || ""} created`);
            else toast.error(v?.error || "Collection saved, but the journal voucher was not created.", { duration: 7000 });
        }
        setSaving(false);
        setAmount("");
        setDiscount("");
        load();
    };

    if (agreement === undefined) return <div className="h-[58px] w-[300px] animate-pulse rounded-xl bg-slate-100" />;

    return (
        <div className="rounded-xl border bg-white px-3 py-2 shadow-sm">
            <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                {agreement ? (
                    <>
                        <span>
                            Agreement <b className="text-slate-700">{tk(agreement.serviceChargeAmount)}</b>
                        </span>
                        <span>
                            Paid <b className="text-teal-700">{tk(agreement.collected)}</b>
                        </span>
                        {agreement.discount > 0 && <span>Discount {tk(agreement.discount)}</span>}
                        <span>
                            Due <b className={agreement.dues > 0 ? "text-red-600" : "text-slate-700"}>{tk(agreement.dues)}</b>
                        </span>
                    </>
                ) : (
                    <span>No running agreement</span>
                )}
                <a className="ml-auto text-teal-700 hover:underline" href={collectionHistoryUrl(patientId)} target="_blank">
                    History
                </a>
            </div>
            {can("PAYMENT.C") && (
                <div className="mt-1.5 flex items-center gap-2">
                    <input
                        className="input !w-32 !py-1.5"
                        placeholder="Amount"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                        onKeyDown={(e) => e.key === "Enter" && collect()}
                        aria-label="Collection amount"
                    />
                    <input
                        className="input !w-28 !py-1.5"
                        placeholder="Discount"
                        inputMode="decimal"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value.replace(/[^0-9.]/g, ""))}
                        onKeyDown={(e) => e.key === "Enter" && collect()}
                        aria-label="Discount amount"
                    />
                    <button type="button" className="btn-primary !px-3 !py-1.5" disabled={saving} onClick={collect}>
                        {saving ? <Loader2 size={15} className="mr-1.5 animate-spin" /> : <Wallet size={15} className="mr-1.5" />}
                        Collect
                    </button>
                </div>
            )}
        </div>
    );
}
