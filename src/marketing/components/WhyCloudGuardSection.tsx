import { Container } from "./ui/Container";
import { SectionWrapper } from "./ui/SectionWrapper";

const ROWS = [
  {
    feature: "Cost Prediction",
    cloudguard: "Predicts leaks before they happen",
    traditional: "Detects after cost spike occurs",
  },
  {
    feature: "Financial Impact",
    cloudguard: "Shows exact dollar waste per anomaly",
    traditional: "Shows metrics, not financial impact",
  },
  {
    feature: "Platform Scope",
    cloudguard: "FinOps + Security unified in one tool",
    traditional: "Separate systems for each concern",
  },
  {
    feature: "Detection Method",
    cloudguard: "Multi-signal AI fusion (4 ML models)",
    traditional: "Static thresholds or single model",
  },
  {
    feature: "Attribution",
    cloudguard: "Identifies exact resource causing spike",
    traditional: "Shows charts without attribution",
  },
  {
    feature: "Infrastructure Model",
    cloudguard: "Graph-based resource relationship mapping",
    traditional: "Individual resource analysis only",
  },
  {
    feature: "Risk Scoring",
    cloudguard: "Weighted 0-100 composite score",
    traditional: "Binary alert or metric threshold",
  },
  {
    feature: "Optimization",
    cloudguard: "Autonomous AI agent (Gemini-powered)",
    traditional: "Manual investigation required",
  },
];

interface WhyCloudGuardSectionProps {
  noBorder?: boolean;
}

export function WhyCloudGuardSection({ noBorder = false }: WhyCloudGuardSectionProps) {
  return (
    <SectionWrapper id="why" texture="grid" noBorder={noBorder}>
      <Container>
        <div className="grid grid-cols-12 gap-12 mb-16">
          <div className="col-span-12 lg:col-span-5 pt-4">
            <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
              Comparison
            </span>
            <h2 className="font-display text-4xl lg:text-5xl font-bold tracking-tight mt-6">
              Why CloudGuard AI
            </h2>
          </div>
          <div className="col-span-12 lg:col-span-7">
            <p className="font-body text-lg leading-relaxed text-[var(--muted-foreground)]">
              The platform is designed to prevent waste before it escalates, while traditional
              monitoring tools remain largely reactive and fragmented.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border border-[var(--foreground)]">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[var(--foreground)] text-[var(--background)]">
                <th className="text-left font-mono text-xs uppercase tracking-[0.1em] px-6 py-5 border border-[var(--foreground)]">
                  Capability
                </th>
                <th className="text-left font-mono text-xs uppercase tracking-[0.1em] px-6 py-5 border border-[var(--foreground)]">
                  CloudGuard AI
                </th>
                <th className="text-left font-mono text-xs uppercase tracking-[0.1em] px-6 py-5 border border-[var(--foreground)]">
                  Traditional Tools
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <tr key={row.feature} className={i % 2 === 0 ? "bg-[var(--muted)]" : ""}>
                  <td className="font-display text-sm font-bold px-6 py-5 border border-[var(--border-light)]">
                    {row.feature}
                  </td>
                  <td className="font-body text-sm leading-relaxed px-6 py-5 border border-[var(--border-light)]">
                    {row.cloudguard}
                  </td>
                  <td className="font-body text-sm leading-relaxed px-6 py-5 border border-[var(--border-light)] text-[var(--muted-foreground)]">
                    {row.traditional}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-16 border-y-4 border-[var(--foreground)] py-10 text-center">
          <p className="font-display text-3xl italic leading-snug max-w-[65ch] mx-auto">
            "The difference between a $10K cloud bill and a $100K cloud bill is often
            just three weeks of undetected waste."
          </p>
        </div>
      </Container>
    </SectionWrapper>
  );
}
