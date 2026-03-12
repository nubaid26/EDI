import type { ReactNode } from "react";

interface ContainerProps {
  children: ReactNode;
  className?: string;
}

export function Container({ children, className = "" }: ContainerProps) {
  return (
    <div className={`mx-auto w-full max-w-[80rem] px-8 md:px-12 lg:px-16 ${className}`}>
      {children}
    </div>
  );
}
