import { Rocket, Monitor, PiggyBank, ShieldAlert } from "lucide-react";
import { Container } from "./ui/Container";
import { SectionWrapper } from "./ui/SectionWrapper";

const CASES = [
  {
    icon: Rocket,
    title: "Startups Controlling Cloud Spend",
    narrative:
      "Fast-growing startups scale infrastructure rapidly, but without visibility cloud spend scales even faster. CloudGuard AI gives lean teams enterprise-grade cost intelligence from day one.",
  },
  {
    icon: Monitor,
    title: "DevOps Teams Monitoring Infrastructure",
    narrative:
      "DevOps engineers need to know when infrastructure behaves abnormally, not just when a metric crosses an arbitrary threshold. Multi-signal detection surfaces anomalies that static rules miss.",
  },
  {
    icon: PiggyBank,
    title: "FinOps Teams Optimizing Cost",
    narrative:
      "FinOps practitioners need precise attribution and actionable recommendations. CloudGuard AI maps each anomaly to a dollar amount and produces AI-powered remediation guidance.",
  },
  {
    icon: ShieldAlert,
    title: "Security Teams Detecting Misuse",
    narrative:
      "Cryptomining, unauthorized workloads, and data exfiltration often hide below traditional thresholds. Behavioral AI models detect abuse patterns invisible to rule-based systems.",
  },
];

interface UseCasesSectionProps {
  noBorder?: boolean;
}

export function UseCasesSection({ noBorder = false }: UseCasesSectionProps) {
  return (
    <SectionWrapper id="use-cases" texture="horizontal-lines" noBorder={noBorder}>
      <Container>
        <div className="grid grid-cols-12 gap-12 mb-16">
          <div className="col-span-12 lg:col-span-5 pt-4">
            <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
              Use Cases
            </span>
            <h2 className="font-display text-4xl lg:text-5xl font-bold tracking-tight mt-6">
              Built for Every
              <br />
              Cloud Team
            </h2>
          </div>
          <div className="col-span-12 lg:col-span-7">
            <p className="font-body text-lg leading-relaxed text-[var(--muted-foreground)]">
              The same detection pipeline supports startup operators, mature DevOps groups,
              dedicated FinOps teams, and security teams handling infrastructure abuse.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {CASES.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="group border border-black p-8 transition-colors hover:bg-black hover:text-white"
              >
                <Icon size={26} strokeWidth={1.5} className="mb-6" />
                <h3 className="font-display text-xl font-bold mb-4 leading-tight">
                  {item.title}
                </h3>
                <p className="font-body text-sm leading-relaxed text-[var(--muted-foreground)] group-hover:text-white">
                  {item.narrative}
                </p>
              </div>
            );
          })}
        </div>
      </Container>
    </SectionWrapper>
  );
}
