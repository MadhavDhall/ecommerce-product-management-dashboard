export default function Card({ children, className = "" }) {
    const base = "relative rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-none overflow-hidden";
    return <div className={[base, className].join(" ")}>{children}</div>;
}
