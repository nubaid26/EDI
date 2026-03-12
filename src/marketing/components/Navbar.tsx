import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "./ui/Button";

const NAV_LINKS = [
  { label: "Features", href: "/features" },
  { label: "Architecture", href: "/architecture" },
  { label: "Pricing", href: "/pricing" },
  { label: "Use Cases", href: "/use-cases" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-[var(--background)] border-b border-[var(--foreground)]">
      <div className="mx-auto w-full max-w-7xl px-6 md:px-8 lg:px-12 flex items-center justify-between h-16 md:h-20">
        {/* Logo */}
        <Link to="/" className="font-display text-lg md:text-xl font-bold tracking-[0.15em] uppercase">
          CloudGuard
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-10">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-100"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:block">
          <Button className="!py-3 !px-6 !text-xs">
            Request Demo&nbsp;&nbsp;&rarr;
          </Button>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden p-2"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-[var(--foreground)] text-[var(--background)] flex flex-col items-center justify-center gap-10">
          <button
            className="absolute top-5 right-6 p-2"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X size={28} strokeWidth={1.5} className="text-[var(--background)]" />
          </button>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setOpen(false)}
              className="font-display text-3xl font-bold tracking-tight hover:underline underline-offset-8"
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/"
            onClick={() => setOpen(false)}
            className="font-mono text-sm uppercase tracking-[0.1em] border-2 border-[var(--background)] px-8 py-4 hover:bg-[var(--background)] hover:text-[var(--foreground)] transition-colors duration-100 mt-4"
          >
            Request Demo&nbsp;&nbsp;&rarr;
          </Link>
        </div>
      )}
    </nav>
  );
}
