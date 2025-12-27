export default function Button({ children, className = "", variant = "primary", ...props }) {
    const base = "inline-flex items-center justify-center rounded-lg font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
    const sizes = "px-4 py-2.5 text-sm";
    const variants = {
        primary: "bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 shadow-sm",
        outline: "border border-gray-300 text-gray-900 bg-white hover:bg-gray-50",
        subtle: "bg-gray-100 text-gray-900 hover:bg-gray-200",
    };
    const classes = [base, sizes, variants[variant] || variants.primary, className].join(" ");
    return (
        <button className={classes} {...props}>
            {children}
        </button>
    );
}
