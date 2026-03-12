import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}

const base =
  "inline-flex items-center justify-center font-mono text-sm font-medium uppercase tracking-[0.1em] transition-colors duration-100 cursor-pointer";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--foreground)] text-[var(--background)] px-8 py-4 hover:bg-[var(--background)] hover:text-[var(--foreground)] border-2 border-[var(--foreground)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--foreground)] focus-visible:outline-offset-3",
  secondary:
    "bg-transparent text-[var(--foreground)] px-8 py-4 border-2 border-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-[var(--background)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--foreground)] focus-visible:outline-offset-3",
  ghost:
    "bg-transparent text-[var(--foreground)] px-4 py-2 hover:underline underline-offset-4 focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--foreground)] focus-visible:outline-offset-3",
};

export function Button({ variant = "primary", children, className = "", ...props }: ButtonProps) {
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

/* Inverted variant for dark-bg sections */
export function ButtonInverted({ variant = "primary", children, className = "", ...props }: ButtonProps) {
  const invertedVariants: Record<Variant, string> = {
    primary:
      "bg-[var(--background)] text-[var(--foreground)] px-8 py-4 border-2 border-[var(--background)] hover:bg-transparent hover:text-[var(--background)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--background)] focus-visible:outline-offset-3",
    secondary:
      "bg-transparent text-[var(--background)] px-8 py-4 border-2 border-[var(--background)] hover:bg-[var(--background)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--background)] focus-visible:outline-offset-3",
    ghost:
      "bg-transparent text-[var(--background)] px-4 py-2 hover:underline underline-offset-4 focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--background)] focus-visible:outline-offset-3",
  };
  return (
    <button className={`${base} ${invertedVariants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
