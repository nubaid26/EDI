interface SectionDividerProps {
  weight?: "thick" | "ultra";
  className?: string;
}

export function SectionDivider({ weight = "thick", className = "" }: SectionDividerProps) {
  const h = weight === "ultra" ? "h-2" : "h-1";
  return <div className={`w-full bg-[var(--foreground)] ${h} ${className}`} role="separator" />;
}
