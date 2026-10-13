"use client";

import { createContext, useContext } from "react";

// Effective permission codes of the signed-in user; null while loading.
export const PermissionsContext = createContext<string[] | null>(null);

// const can = useCan(); can("PATIENT.C")
export function useCan() {
    const codes = useContext(PermissionsContext);
    return (code: string) => !!codes && codes.includes(code);
}
