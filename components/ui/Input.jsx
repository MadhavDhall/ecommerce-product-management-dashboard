import { forwardRef } from "react";

const Input = forwardRef(function Input({ className = "", ...props }, ref) {
    const base = "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm outline-none ring-0 focus:border-indigo-500 focus:shadow-md";
    return <input ref={ref} className={[base, className].join(" ")} {...props} />;
});

export default Input;
