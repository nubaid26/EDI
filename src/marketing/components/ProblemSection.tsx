import {
  ServerCrash,
  TrendingUp,
  Cpu,
  Bitcoin,
  EyeOff,
} from "lucide-react";
import { Container } from "./ui/Container";
import { SectionWrapper } from "./ui/SectionWrapper";

const PROBLEMS = [
  {
    icon: ServerCrash,
    title: "Idle Resources",
    description:
      "Virtual machines running 24/7 but utilized only a fraction of the time. Storage volumes allocated and never accessed. Money evaporating silently.",
  },
  {
    icon: TrendingUp,
    title: "Cost Spikes",
    description:
      "Unexpected billing surges that traditional threshold-based alerts miss entirely. By the time you notice, the damage is done.",
  },
  {
    icon: Cpu,
    title: "Resource Abuse",
    description:
      "Scripts spinning up hundreds of instances. Over-provisioned configurations that nobody audits. Accumulated waste across every cloud account.",
  },
  {
    icon: Bitcoin,
    title: "Cryptomining",
    description:
      "Unauthorized workloads hijacking your infrastructure for cryptocurrency mining - invisible to standard monitoring tools.",
  },
  {
    icon: EyeOff,
    title: "Hidden Inefficiencies",
    description:
      "Orphaned load balancers, unattached volumes, zombie resources. An infrastructure graveyard quietly draining your budget.",
  },
];

export function ProblemSection() {
  return (
    <SectionWrapper id="problem" texture="grid">
      <Container>
        <div className="grid grid-cols-12 gap-12">
          <div className="col-span-12 lg:col-span-5">
            <div className="pt-4">
              <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
                The Problem
              </span>
              <h2 className="font-display text-4xl lg:text-5xl font-bold tracking-tight mt-6">
                Your Cloud Is
                <br />
                Bleeding Money
              </h2>
            </div>

            <p className="font-body text-lg leading-relaxed text-[var(--muted-foreground)] mt-10">
              Companies lose significant budget to idle resources, infrastructure misuse,
              and inefficient cloud configurations. Traditional monitoring finds problems
              only after spikes happen, when the waste has already landed on the bill.
            </p>
          </div>

          <div className="col-span-12 lg:col-span-7">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {PROBLEMS.map((problem) => {
                const Icon = problem.icon;
                return (
                  <div
                    key={problem.title}
                    className="group border border-black p-8 transition-colors hover:bg-black hover:text-white"
                  >
                    <Icon size={24} strokeWidth={1.5} className="mb-6" />
                    <h3 className="font-display text-xl font-bold mb-4 leading-tight">
                      {problem.title}
                    </h3>
                    <p className="font-body text-sm leading-relaxed text-[var(--muted-foreground)] group-hover:text-white">
                      {problem.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-20 border-y-4 border-[var(--foreground)] py-12 text-center">
          <p className="font-display text-5xl font-bold tracking-tight">$14.1B+</p>
          <p className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--muted-foreground)] mt-4">
            Wasted annually on idle cloud resources worldwide
          </p>
        </div>
      </Container>
    </SectionWrapper>
  );
}
