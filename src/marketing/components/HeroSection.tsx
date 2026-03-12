import { Link } from "react-router-dom";
import { Button } from "./ui/Button";
import { Container } from "./ui/Container";

export function HeroSection() {
  return (
    <section
      className="relative w-full py-24 lg:py-32"
      data-texture="horizontal-lines"
    >
      <Container>
        <div className="flex items-center gap-4 mb-10">
          <div className="w-20 h-[4px] bg-black" />
          <div className="w-3 h-3 border border-black" />
        </div>

        <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-none tracking-tighter mb-10">
          <span className="block">Stop Cloud</span>
          <span className="block">Cost Leakage</span>
          <span className="block">Before It Starts</span>
        </h1>

        <div className="max-w-3xl">
          <p className="font-body text-lg leading-relaxed text-[var(--muted-foreground)] mb-10">
            AI-powered prediction and prevention of cloud waste, resource abuse,
            and security misuse before they become billing spikes.
          </p>

          <div className="flex flex-wrap gap-4">
            <Button>Start Free Demo&nbsp;&nbsp;&rarr;</Button>
            <Link to="/architecture">
              <Button variant="ghost">View Architecture</Button>
            </Link>
          </div>
        </div>

        <div className="mt-14 border border-[var(--foreground)] p-6 md:p-8">
          <p className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--muted-foreground)] mb-6">
            System Pipeline
          </p>
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            {[
              "Cloud Infra",
              "Collectors",
              "Ingestion",
              "Feature Eng.",
              "AI Models",
              "Signal Fusion",
              "Root Cause",
              "Cost Attr.",
              "Optimizer",
              "Dashboard",
            ].map((step, i, arr) => (
              <span key={step} className="flex items-center whitespace-nowrap">
                <span className="border border-[var(--foreground)] px-3 py-2 text-[var(--foreground)]">
                  {step}
                </span>
                {i < arr.length - 1 && (
                  <span className="mx-1 md:mx-2 text-[var(--muted-foreground)]">&rarr;</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
