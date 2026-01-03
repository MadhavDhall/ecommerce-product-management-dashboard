export default function Skeleton({ className = "" }) {
    return (
        <div
            className={["animate-pulse rounded-md bg-gray-200", className].filter(Boolean).join(" ")}
            aria-hidden="true"
        />
    );
}
