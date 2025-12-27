export default function Label({ htmlFor, children, className = "" }) {
    return (
        <label htmlFor={htmlFor} className={["block text-sm font-medium text-gray-700", className].join(" ")}>
            {children}
        </label>
    );
}
