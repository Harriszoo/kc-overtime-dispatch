import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary:   "bg-kc-blue-600 text-white hover:bg-kc-blue-700",
  secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50",
  danger:    "bg-red-600 text-white hover:bg-red-700",
  ghost:     "text-kc-blue-600 hover:underline",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export default function Button({ variant = "primary", className = "", children, ...props }: Props) {
  return (
    <button
      {...props}
      className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
