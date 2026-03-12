import { Container } from "./ui/Container";
import { SectionWrapper } from "./ui/SectionWrapper";

const STEPS = [
  {
    label: "Cloud Infrastructure",
    detail: "AWS, Azure, GCP telemetry ingestion across all services and regions.",
  },
  {
    label: "Data Collectors",
    detail: "Lightweight agents pull CloudWatch, Azure Monitor, and GCP Monitoring metrics.",
  },
  {
    label: "Ingestion Pipeline",
    detail: "Real-time stream processing with data normalization and deduplication.",
  },
  {
    label: "Feature Engineering",
    detail: "Time-series decomposition, statistical features, and behavioral fingerprints.",
  },
  {
    label: "AI Detection Models",
    detail: "Prophet, Isolation Forest, XGBoost, and DBSCAN run in parallel across signals.",
  },
  {
    label: "Signal Fusion",
    detail: "Weighted ensemble combines model outputs into a single composite risk score.",
  },
  {
    label: "Root Cause Analyzer",
    detail: "Graph-based attribution traces anomalies to specific resources and configs.",
  },
  {
    label: "Cost Attribution",
    detail: "Every anomaly is mapped to its estimated financial impact in real dollars.",
  },
  {
    label: "Optimization Agent",
    detail: "Gemini-powered AI generates actionable remediation with confidence scoring.",
  },
  {
    label: "Dashboard",
    detail: "Unified command center for alerts, cost graphs, risk scores, and optimization.",
  },
];

interface ArchitectureSectionProps {
  noBorder?: boolean;
}

function ArchitectureSection({ noBorder = false }: ArchitectureSectionProps) {
  return (
    <SectionWrapper id="architecture" texture="diagonal" noBorder={noBorder}>
      <Container>
        <div className="grid grid-cols-12 gap-12">
          <div className="col-span-12 lg:col-span-5">
            <div className="pt-4">
              <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
                Architecture
              </span>
              <h2 className="font-display text-4xl lg:text-5xl font-bold tracking-tight mt-6">
                End-to-End
                <br />
                Intelligence Pipeline
              </h2>
            </div>
            <p className="font-body text-lg leading-relaxed text-[var(--muted-foreground)] mt-10">
              CloudGuard AI processes telemetry from ingestion to optimization in a tightly
              connected chain, where each stage contributes to faster and more reliable decisions.
            </p>
          </div>

          <div className="col-span-12 lg:col-span-7">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {STEPS.map((step, i) => (
                <div
                  key={step.label}
                  className="group border border-black p-6 transition-colors hover:bg-black hover:text-white"
                >
                  <span className="font-mono text-xs text-[var(--muted-foreground)] opacity-70 group-hover:text-white group-hover:opacity-100">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-display text-lg font-bold mt-3 mb-3 leading-tight">
                    {step.label}
                  </h3>
                  <p className="font-body text-sm leading-relaxed text-[var(--muted-foreground)] group-hover:text-white">
                    {step.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-20 border-t border-[var(--border-light)] pt-8">
          <p className="font-body text-lg leading-relaxed text-[var(--muted-foreground)]">
            The full pipeline operates in near real time, processing cloud telemetry from ingestion
            to actionable recommendation in under 60 seconds, with independently scalable stages.
          </p>
        </div>
      </Container>
    </SectionWrapper>
  );
}

export { ArchitectureSection };
export default ArchitectureSection;
