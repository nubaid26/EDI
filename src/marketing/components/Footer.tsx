import { Github, Linkedin, Twitter } from "lucide-react";
import { Link } from "react-router-dom";
import { Container } from "./ui/Container";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Architecture", href: "/architecture" },
      { label: "Pricing", href: "/pricing" },
      { label: "Dashboard", href: "/app" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "#" },
      { label: "API Reference", href: "#" },
      { label: "Status", href: "#" },
      { label: "Changelog", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
      { label: "Security", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t-4 border-[var(--foreground)]">
      <Container className="py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-8">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="font-mono text-xs uppercase tracking-[0.1em] font-bold mb-6">
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith("/") ? (
                      <Link
                        to={link.href}
                        className="font-body text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-100"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        className="font-body text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-100"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[var(--border-light)] mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-mono text-xs text-[var(--muted-foreground)]">
            &copy; 2026 CloudGuard AI. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" aria-label="GitHub" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-100">
              <Github size={18} strokeWidth={1.5} />
            </a>
            <a href="#" aria-label="LinkedIn" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-100">
              <Linkedin size={18} strokeWidth={1.5} />
            </a>
            <a href="#" aria-label="Twitter" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-100">
              <Twitter size={18} strokeWidth={1.5} />
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
}
