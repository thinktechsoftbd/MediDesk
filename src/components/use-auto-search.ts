"use client";
import { useEffect, useRef } from "react";

// search as you type: search() runs once the text has not changed for `delay` ms
// (not on mount: the page does its first load itself)
export function useAutoSearch(text: string, search: () => void, delay = 400) {
    const run = useRef(search);
    run.current = search;
    const last = useRef(text); // the text the list was last searched with
    useEffect(() => {
        if (text === last.current) return;
        const t = setTimeout(() => {
            last.current = text;
            run.current();
        }, delay);
        return () => clearTimeout(t);
    }, [text, delay]);
}

// the latest load wins: call at the start of a load, and drop the response when it returns false
// (typing fires a load per pause, and an earlier one can come back after a later one)
export function useLatestRequest() {
    const n = useRef(0);
    return () => {
        const id = ++n.current;
        return () => id === n.current;
    };
}
