import {
  ShieldCheck,
  Layers,
  BrainCircuit,
  Search,
  Coins,
  GitGraph,
  Gauge,
  Zap,
} from "lucide-react";
import { Container } from "./ui/Container";
import { SectionWrapper } from "./ui/SectionWrapper";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Predictive Cost Leak Prevention",
    description:
      "Forecast cost trajectories using Prophet time-series analysis and flag potential budget overruns before they occur.",
  },
  {
    icon: Layers,
    title: "Unified FinOps + Security",
    description:
      "A single platform that bridges financial operations and security monitoring with no siloed tooling.",
  },
  {
    icon: BrainCircuit,
    title: "Multi-Signal AI Detection",
    description:
      "Four ML models (Prophet, Isolation Forest, XGBoost, DBSCAN) fused into one composite intelligence layer.",
  },
  {
    icon: Search,
    title: "Root Cause Analysis",
    description:
      "Automated graph-based tracing from anomaly to exact resource, configuration, and behavioral root cause.",
  },
  {
    icon: Coins,
    title: "Cost Attribution Engine",
    description:
      "Every detected anomaly is mapped to an estimated dollar impact, turning abstract alerts into business decisions.",
  },
  {
    icon: GitGraph,
    title: "Infrastructure Graph Intelligence",
    description:
      "Models resource relationships and dependencies to identify cascading risks and hidden optimization opportunities.",
  },
  {
    icon: Gauge,
    title: "Risk Scoring System",
    description:
      "Weighted 0-100 composite score: 40% cost anomaly, 30% resource behavior, 20% infra behavior, 10% abuse signal.",
  },
  {
    icon: Zap,
    title: "Autonomous Optimization Agent",
    description:
      "Gemini-powered AI agent generates and optionally executes remediation actions with confidence scoring.",
  },
];

interface FeaturesSectionProps {
  noBorder?: boolean;
}

export function FeaturesSection({ noBorder = false }: FeaturesSectionProps) {
  return (
    <SectionWrapper id="features" noBorder={noBorder}>
      <Container>
        <div className="grid grid-cols-12 gap-12 mb-16">
          <div className="col-span-12 lg:col-span-5 pt-4">
            <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
              Capabilities
            </span>
            <h2 className="font-display text-4xl lg:text-5xl font-bold tracking-tight mt-6">
              Eight Pillars of
              <br />
              Cloud Intelligence
            </h2>
          </div>
          <div className="col-span-12 lg:col-span-7">
            <p className="font-body text-lg leading-relaxed text-[var(--muted-foreground)]">
              CloudGuard AI combines predictive economics, infrastructure behavior analysis,
              and security anomaly detection into a single operating surface for cloud teams.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group border border-black p-8 transition-colors hover:bg-black hover:text-white"
              >
                <Icon size={22} strokeWidth={1.5} className="mb-6" />
                <h3 className="font-display text-lg font-bold mb-4 leading-tight">
                  {feature.title}
                </h3>
                <p className="font-body text-sm leading-relaxed text-[var(--muted-foreground)] group-hover:text-white">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </Container>
    </SectionWrapper>
  );
}
