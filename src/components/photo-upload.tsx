"use client";
import { useRef } from "react";
import { Camera, X } from "lucide-react";
import toast from "react-hot-toast";

// Small avatar picker: reads the image as a data URL (max ~500 KB).
export default function PhotoUpload({
    value,
    onChange,
    size = 88,
}: {
    value: string;
    onChange: (dataUrl: string) => void;
    size?: number;
}) {
    const inputRef = useRef<HTMLInputElement>(null);

    const pick = (e: any) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            toast.error("Please choose an image file.");
            return;
        }
        if (file.size > 500 * 1024) {
            toast.error("Image is too large. Use one under 500 KB.");
            return;
        }
        const reader = new FileReader();
        reader.onload = () => onChange(String(reader.result));
        reader.readAsDataURL(file);
    };

    return (
        <div className="flex items-center gap-3">
            <div
                className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border bg-slate-100"
                style={{ width: size, height: size }}
            >
                {value ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={value}
                        alt="Profile photo"
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <Camera size={size / 3.5} className="text-slate-400" />
                )}
            </div>

            <div className="flex flex-col gap-1.5">
                <button
                    type="button"
                    className="btn-secondary !px-3 !py-1.5 text-xs"
                    onClick={() => inputRef.current?.click()}
                >
                    <Camera size={14} className="mr-1.5" />
                    {value ? "Change Photo" : "Upload Photo"}
                </button>

                {value && (
                    <button
                        type="button"
                        className="btn-secondary !px-3 !py-1.5 text-xs !text-red-600"
                        onClick={() => onChange("")}
                    >
                        <X size={14} className="mr-1.5" />
                        Remove
                    </button>
                )}
            </div>

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={pick}
            />
        </div>
    );
}
