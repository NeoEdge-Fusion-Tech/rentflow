import React from "react";
import { MarketingLayout } from "../components/marketing/MarketingLayout";
import {
  CostCalculator,
  FeaturesIntro,
  FinalCta,
  Hero,
  HowItWorks,
  Outcomes,
} from "../components/marketing/sections";
import { FeatureGrid } from "../components/marketing/parts";

/** Public homepage. Features, pricing and about live on their own pages. */
export function Landing() {
  return (
    <MarketingLayout title="NeoOps | Event Operations Software">
      <Hero />
      <Outcomes />
      <CostCalculator />
      <FeaturesIntro>
        <FeatureGrid />
      </FeaturesIntro>
      <HowItWorks />
      <FinalCta />
    </MarketingLayout>
  );
}
