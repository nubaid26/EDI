import { Activity, ShieldAlert, DollarSign, Search } from "lucide-react";
import { Container } from "./ui/Container";
import { SectionWrapper } from "./ui/SectionWrapper";

const PILLARS = [
  {
    icon: Activity,
    title: "Anomaly Detection",
    subtitle: "Multi-Model AI",
    description:
      "Four specialized ML models - Prophet, Isolation Forest, XGBoost, and DBSCAN - work in concert to detect cost anomalies, idle resources, cryptomining, and behavioral outliers.",
  },
  {
    icon: ShieldAlert,
    title: "Predictive Cost Guard",
    subtitle: "Prevent Before Spike",
    description:
      "Instead of alerting after the damage, CloudGuard AI forecasts cost trajectories and flags potential leaks before they impact your bill.",
  },
  {
    icon: DollarSign,
    title: "Financial Impact Analysis",
    subtitle: "Show Dollar Waste",
    description:
      "Every anomaly is translated into estimated financial impact - not abstract metrics, but real dollar amounts your organization is losing.",
  },
  {
    icon: Search,
    title: "Root Cause Intelligence",
    subtitle: "Explain Why",
    description:
      "Automated root cause analysis traces each anomaly back to the specific resource, configuration, or behavior causing it, with actionable remediation steps.",
  },
];

function SolutionSection() {
  return (
    <SectionWrapper id="solution" texture="horizontal-lines">
      <Container>
        <div className="grid grid-cols-12 gap-12">
          <div className="col-span-12 lg:col-span-5">
            <div className="pt-4">
              <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
                The Solution
              </span>
              <h2 className="font-display text-4xl lg:text-5xl font-bold tracking-tight mt-6">
                Predict.
                <br />
                Prevent.
                <br />
                Protect.
              </h2>
            </div>
            <p className="font-body text-lg leading-relaxed text-[var(--muted-foreground)] mt-10">
              CloudGuard AI unifies FinOps and security telemetry into a single decision system,
              so teams can stop waste before it compounds and explain exactly why every anomaly occurred.
            </p>
          </div>

          <div className="col-span-12 lg:col-span-7">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {PILLARS.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <div
                    key={pillar.title}
                    className="group border border-black p-8 transition-colors hover:bg-black hover:text-white"
                  >
                    <div className="flex items-center gap-3 mb-5">
                      <Icon size={22} strokeWidth={1.5} />
                      <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--muted-foreground)] group-hover:text-white">
                        {pillar.subtitle}
                      </span>
                    </div>
                    <h3 className="font-display text-xl font-bold mb-4 leading-tight">
                      {pillar.title}
                    </h3>
                    <p className="font-body text-sm leading-relaxed text-[var(--muted-foreground)] group-hover:text-white">
                      {pillar.description}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 border-2 border-[var(--foreground)] p-8">
              <p className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--muted-foreground)] mb-8">
                Signal Fusion Engine
              </p>

              <div className="space-y-4 mb-8">
                {[
                  { name: "Prophet", signal: "Cost Anomaly", weight: "0.4" },
                  { name: "Isolation Forest", signal: "Resource Behavior", weight: "0.3" },
                  { name: "DBSCAN", signal: "Infra Behavior", weight: "0.2" },
                  { name: "XGBoost", signal: "Abuse Signal", weight: "0.1" },
                ].map((model) => (
                  <div
                    key={model.name}
                    className="flex items-center justify-between border-b border-[var(--border-light)] pb-4"
                  >
                    <div>
                      <span className="font-mono text-xs font-semibold">{model.name}</span>
                      <span className="font-body text-base text-[var(--muted-foreground)] ml-3">
                        {model.signal}
                      </span>
                    </div>
                    <span className="font-mono text-sm font-bold">x{model.weight}</span>
                  </div>
                ))}
              </div>

              <div className="bg-[var(--foreground)] text-[var(--background)] p-8 text-center">
                <p className="font-mono text-xs uppercase tracking-[0.1em] mb-3 opacity-70">
                  Composite Output
                </p>
                <p className="font-display text-2xl font-bold">Risk Score 0-100</p>
              </div>
            </div>

            <div className="mt-8 bg-[var(--foreground)] text-[var(--background)] p-8">
              <p className="font-display text-2xl font-bold italic leading-snug">
                "CloudGuard AI predicts cost leaks before they happen, turning reactive monitoring into proactive prevention."
              </p>
            </div>
          </div>
        </div>
      </Container>
    </SectionWrapper>
  );
}

export { SolutionSection };
export default SolutionSection;
