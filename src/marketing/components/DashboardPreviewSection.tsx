import { Container } from "./ui/Container";
import { SectionWrapper } from "./ui/SectionWrapper";

const COST_DATA = [
  320, 310, 340, 360, 350, 380, 420, 460, 440, 480,
  520, 510, 530, 560, 540, 570, 610, 590, 620, 650,
  640, 680, 720, 700, 740, 760, 780, 810, 790, 830,
];

const ALERTS_MOCK = [
  { severity: "CRITICAL", resource: "ec2-i-0a3f7b", type: "Cost Spike", waste: "$2,340/mo", time: "2m ago" },
  { severity: "HIGH", resource: "rds-prod-01", type: "Idle Resource", waste: "$890/mo", time: "14m ago" },
  { severity: "MEDIUM", resource: "lambda-etl-v3", type: "Over-Provisioned", waste: "$420/mo", time: "1h ago" },
];

const RECOMMENDATIONS_MOCK = [
  { action: "Rightsize", resource: "ec2-i-0a3f7b", saving: "$1,200/mo", confidence: 94 },
  { action: "Terminate", resource: "ebs-vol-orphan", saving: "$340/mo", confidence: 99 },
  { action: "Schedule", resource: "rds-staging-02", saving: "$560/mo", confidence: 87 },
];

function Sparkline({
  data,
  width = 260,
  height = 60,
  inverted = false,
}: {
  data: number[];
  width?: number;
  height?: number;
  inverted?: boolean;
}) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`)
    .join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={inverted ? "#FFFFFF" : "#000000"}
        strokeWidth="2"
      />
    </svg>
  );
}

function RiskGauge({ score }: { score: number }) {
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#333" strokeWidth="4" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="butt"
          transform="rotate(-90 50 50)"
        />
        <text
          x="50"
          y="52"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#FFFFFF"
          fontSize="20"
          fontFamily="var(--font-display)"
          fontWeight="bold"
        >
          {score}
        </text>
      </svg>
      <span className="font-mono text-xs mt-2 opacity-60">RISK SCORE</span>
    </div>
  );
}

interface DashboardPreviewSectionProps {
  noBorder?: boolean;
}

export function DashboardPreviewSection({ noBorder = false }: DashboardPreviewSectionProps) {
  return (
    <SectionWrapper id="platform" inverted texture="vertical-lines-inverted" noBorder={noBorder}>
      <Container>
        <div className="grid grid-cols-12 gap-12">
          <div className="col-span-12 lg:col-span-5">
            <div className="pt-4">
              <span className="font-mono text-xs uppercase tracking-[0.1em] opacity-60">
                The Platform
              </span>
              <h2 className="font-display text-4xl lg:text-5xl font-bold tracking-tight mt-6">
                Command Center
                <br />
                for Cloud Intelligence
              </h2>
            </div>
            <p className="font-body text-lg leading-relaxed opacity-70 mt-8">
              Alerts, cost trajectories, risk scoring, and optimization actions are presented
              in one operational view so teams can triage and respond faster.
            </p>
            <div className="mt-10">
              <a
                href="/app"
                className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.1em] border-2 border-[var(--background)] px-8 py-4 hover:bg-[var(--background)] hover:text-[var(--foreground)] transition-colors duration-100"
              >
                Explore Live Dashboard&nbsp;&nbsp;&rarr;
              </a>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-7">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-2 border-[var(--background)] p-6">
                <div className="flex items-center justify-between mb-6">
                  <span className="font-mono text-xs uppercase tracking-[0.1em] opacity-60">
                    Cost Timeline - 30 Days
                  </span>
                  <span className="font-mono text-sm font-bold">$24,830</span>
                </div>
                <Sparkline data={COST_DATA} height={90} inverted />
                <div className="flex justify-between mt-4 font-mono text-xs opacity-40">
                  <span>Day 1</span>
                  <span>Day 30</span>
                </div>
              </div>

              <div className="border-2 border-[var(--background)] p-6">
                <span className="font-mono text-xs uppercase tracking-[0.1em] opacity-60 block mb-6">
                  System Overview
                </span>
                <div className="flex items-center gap-8">
                  <RiskGauge score={73} />
                  <div className="space-y-4 flex-1">
                    {[
                      { label: "Resources Monitored", value: "1,247" },
                      { label: "Anomalies Detected", value: "23" },
                      { label: "Est. Monthly Waste", value: "$8,420" },
                      { label: "Potential Savings", value: "$6,120" },
                    ].map((stat) => (
                      <div key={stat.label} className="flex justify-between border-b border-[rgba(255,255,255,0.15)] pb-3">
                        <span className="font-body text-sm opacity-70">{stat.label}</span>
                        <span className="font-mono text-sm font-bold">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-2 border-[var(--background)] p-6">
                <span className="font-mono text-xs uppercase tracking-[0.1em] opacity-60 block mb-6">
                  Active Alerts
                </span>
                <div className="space-y-5">
                  {ALERTS_MOCK.map((alert) => (
                    <div
                      key={`${alert.resource}-${alert.type}`}
                      className="flex items-start justify-between border-b border-[rgba(255,255,255,0.15)] pb-5"
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className={`font-mono text-xs font-bold px-2 py-1 ${
                              alert.severity === "CRITICAL"
                                ? "bg-white text-black"
                                : alert.severity === "HIGH"
                                  ? "border border-white"
                                  : "opacity-60"
                            }`}
                          >
                            {alert.severity}
                          </span>
                          <span className="font-mono text-xs opacity-40">{alert.time}</span>
                        </div>
                        <p className="font-body text-sm">
                          {alert.type} - <span className="font-mono text-xs opacity-60">{alert.resource}</span>
                        </p>
                      </div>
                      <span className="font-mono text-sm font-bold">{alert.waste}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-2 border-[var(--background)] p-6">
                <span className="font-mono text-xs uppercase tracking-[0.1em] opacity-60 block mb-6">
                  Optimization Queue
                </span>
                <div className="space-y-5">
                  {RECOMMENDATIONS_MOCK.map((rec) => (
                    <div
                      key={`${rec.action}-${rec.resource}`}
                      className="flex items-center justify-between border-b border-[rgba(255,255,255,0.15)] pb-5"
                    >
                      <div>
                        <p className="font-body text-sm">
                          <span className="font-mono text-xs font-bold mr-2">{rec.action}</span>
                          <span className="font-mono text-xs opacity-60">{rec.resource}</span>
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="h-1 flex-1 max-w-24 bg-[rgba(255,255,255,0.15)]">
                            <div className="h-full bg-white" style={{ width: `${rec.confidence}%` }} />
                          </div>
                          <span className="font-mono text-xs opacity-40">{rec.confidence}%</span>
                        </div>
                      </div>
                      <span className="font-mono text-sm font-bold text-white">{rec.saving}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </SectionWrapper>
  );
}
