import { Check } from "lucide-react";
import { Container } from "./ui/Container";
import { SectionWrapper } from "./ui/SectionWrapper";
import { Button, ButtonInverted } from "./ui/Button";

interface Tier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted: boolean;
  cta: string;
}

const TIERS: Tier[] = [
  {
    name: "Starter",
    price: "$0",
    period: "forever",
    description: "For small teams getting started with cloud cost visibility.",
    features: [
      "Up to 50 monitored resources",
      "Basic anomaly detection",
      "Cost attribution reports",
      "7-day data retention",
      "Single cloud provider",
      "Community support",
    ],
    highlighted: false,
    cta: "Get Started Free",
  },
  {
    name: "Professional",
    price: "$499",
    period: "/month",
    description: "For growing teams that need predictive intelligence and automation.",
    features: [
      "Unlimited monitored resources",
      "Multi-signal AI detection (4 models)",
      "Predictive cost guard",
      "Root cause analysis",
      "Optimization agent",
      "Multi-cloud support (AWS, Azure, GCP)",
      "90-day data retention",
      "Risk scoring and graph intelligence",
      "Priority support",
    ],
    highlighted: true,
    cta: "Start Free Trial",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For organizations requiring full platform control and dedicated support.",
    features: [
      "Everything in Professional",
      "Dedicated infrastructure",
      "Custom ML model tuning",
      "SSO and RBAC",
      "Unlimited data retention",
      "Dedicated success manager",
      "SLA guarantees",
      "Custom integrations",
    ],
    highlighted: false,
    cta: "Talk to Sales",
  },
];

interface PricingSectionProps {
  noBorder?: boolean;
}

export function PricingSection({ noBorder = false }: PricingSectionProps) {
  return (
    <SectionWrapper id="pricing" noBorder={noBorder}>
      <Container>
        <div className="grid grid-cols-12 gap-12 mb-16">
          <div className="col-span-12 lg:col-span-5 pt-4">
            <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
              Pricing
            </span>
            <h2 className="font-display text-4xl lg:text-5xl font-bold tracking-tight mt-6">
              Transparent
              <br />
              Pricing
            </h2>
          </div>
          <div className="col-span-12 lg:col-span-7">
            <p className="font-body text-lg leading-relaxed text-[var(--muted-foreground)]">
              Choose the plan that matches your cloud footprint, from early-stage teams
              to enterprise organizations with strict governance and custom requirements.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`border border-black p-8 flex flex-col transition-colors ${
                tier.highlighted
                  ? "bg-black text-white md:py-12"
                  : "hover:bg-black hover:text-white"
              }`}
            >
              <span
                className={`font-mono text-xs uppercase tracking-[0.1em] ${
                  tier.highlighted ? "opacity-70" : "text-[var(--muted-foreground)]"
                }`}
              >
                {tier.name}
              </span>

              <div className="mt-4 mb-3">
                <span className="font-display text-5xl font-bold">{tier.price}</span>
                {tier.period && (
                  <span
                    className={`font-body text-lg ml-2 ${
                      tier.highlighted ? "opacity-70" : "text-[var(--muted-foreground)]"
                    }`}
                  >
                    {tier.period}
                  </span>
                )}
              </div>

              <p
                className={`font-body text-lg leading-relaxed mb-8 ${
                  tier.highlighted ? "opacity-80" : "text-[var(--muted-foreground)]"
                }`}
              >
                {tier.description}
              </p>

              <ul className="space-y-4 mb-10 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check size={18} strokeWidth={2} className="mt-1 shrink-0" />
                    <span className="font-body text-lg leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>

              {tier.highlighted ? (
                <ButtonInverted className="w-full justify-center">
                  {tier.cta}&nbsp;&nbsp;&rarr;
                </ButtonInverted>
              ) : (
                <Button className="w-full justify-center">{tier.cta}&nbsp;&nbsp;&rarr;</Button>
              )}
            </div>
          ))}
        </div>
      </Container>
    </SectionWrapper>
  );
}
