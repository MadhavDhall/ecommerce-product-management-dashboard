import { forwardRef } from "react";

const Select = forwardRef(function Select({ className = "", children, ...props }, ref) {
    const base = "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm outline-none ring-0 focus:border-indigo-500 focus:shadow-md";
    return (
        <select ref={ref} className={[base, className].join(" ")} {...props}>
            {children}
        </select>
    );
});

export default Select;
