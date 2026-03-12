import { Container } from "./ui/Container";
import { SectionWrapper } from "./ui/SectionWrapper";
import { ButtonInverted } from "./ui/Button";

export function CTASection() {
  return (
    <SectionWrapper id="cta" inverted texture="radial-inverted">
      <Container>
        <div className="grid grid-cols-12 gap-12 items-end">
          <div className="col-span-12 lg:col-span-7">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-20 h-[4px] bg-white" />
              <div className="w-3 h-3 border border-white" />
            </div>
            <h2 className="font-display text-4xl lg:text-6xl font-bold tracking-tight leading-none">
              Protect Your
              <br />
              Cloud Spend
            </h2>
          </div>

          <div className="col-span-12 lg:col-span-5">
            <p className="font-body text-lg leading-relaxed opacity-80">
              Connect your AWS, Azure, or GCP account and start detecting waste in minutes.
              No agents to install, just connect and see results.
            </p>
            <div className="flex flex-wrap gap-4 mt-10">
              <ButtonInverted>Start Free Demo&nbsp;&nbsp;&rarr;</ButtonInverted>
              <ButtonInverted variant="ghost">Talk to Sales</ButtonInverted>
            </div>
          </div>
        </div>
      </Container>
    </SectionWrapper>
  );
}
