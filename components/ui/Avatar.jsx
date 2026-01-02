export default function Avatar({ src, alt = "", className = "" }) {
    const initials = getInitials(alt);
    return (
        <span className={["inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gray-200", className].join(" ")}
            aria-label={alt}
        >
            {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt={alt} className="h-full w-full object-cover" />
            ) : (
                <span className="text-sm font-semibold text-gray-600">{initials}</span>
            )}
        </span>
    );
}

function getInitials(value) {
    const str = String(value || "").trim();
    if (!str) return "—";
    const parts = str.split(/\s+/).filter(Boolean);
    const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).filter(Boolean);
    return letters.join("") || "—";
}
