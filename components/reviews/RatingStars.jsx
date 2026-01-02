"use client";

import { useMemo } from "react";

const toRatingNumber = (value) => {
    if (value == null) return null;

    if (typeof value === "number") {
        if (!Number.isFinite(value)) return null;
        return Math.max(0, Math.min(5, value));
    }

    const raw = String(value).trim();
    if (!raw) return null;

    const asNum = Number(raw);
    if (Number.isFinite(asNum)) {
        return Math.max(0, Math.min(5, asNum));
    }

    const upper = raw.toUpperCase();
    const wordMap = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
    for (const [word, n] of Object.entries(wordMap)) {
        if (upper === word || upper.includes(word)) return n;
    }

    const m = upper.match(/\b([0-5](?:\.[0-9]+)?)\b/);
    if (m) {
        const parsed = Number(m[1]);
        if (Number.isFinite(parsed)) return Math.max(0, Math.min(5, parsed));
    }

    return null;
};

export default function RatingStars({ value, className = "" }) {
    const percent = useMemo(() => {
        const rating = toRatingNumber(value);
        const clamped = rating == null ? null : Math.max(0, Math.min(5, rating));
        return clamped == null ? 0 : (clamped / 5) * 100;
    }, [value]);

    const label = useMemo(() => {
        const rating = toRatingNumber(value);
        const clamped = rating == null ? null : Math.max(0, Math.min(5, rating));
        return clamped == null ? "Rating unavailable" : `Rating ${clamped} out of 5`;
    }, [value]);

    const title = useMemo(() => {
        const rating = toRatingNumber(value);
        const clamped = rating == null ? null : Math.max(0, Math.min(5, rating));
        return clamped == null ? "Rating unavailable" : `${clamped}/5`;
    }, [value]);

    return (
        <span className={"relative inline-block leading-none " + className} aria-label={label} title={title}>
            <span className="text-xs text-gray-300">★★★★★</span>
            <span className="absolute left-0 top-0 overflow-hidden" style={{ width: `${percent}%` }}>
                <span className="bg-linear-to-r from-indigo-600 to-violet-600 bg-clip-text text-xs text-transparent">★★★★★</span>
            </span>
        </span>
    );
}
