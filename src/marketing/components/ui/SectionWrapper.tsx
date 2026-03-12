import type { ReactNode } from "react";

interface SectionWrapperProps {
  children: ReactNode;
  id?: string;
  inverted?: boolean;
  noBorder?: boolean;
  texture?: "horizontal-lines" | "grid" | "diagonal" | "vertical-lines-inverted" | "radial-inverted";
  className?: string;
}

export function SectionWrapper({
  children,
  id,
  inverted = false,
  noBorder = false,
  texture,
  className = "",
}: SectionWrapperProps) {
  const borderClass = noBorder ? "" : "border-t-4 border-black";
  return (
    <section
      id={id}
      className={`relative py-16 lg:py-24 ${borderClass} ${inverted ? "section-inverted border-black" : ""} ${className}`}
      data-texture={texture}
    >
      {children}
    </section>
  );
}
