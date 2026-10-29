import React from "react";
import { MarketingLayout } from "../components/marketing/MarketingLayout";
import {
  FinalCta,
  ForWho,
  HowItWorks,
  Story,
} from "../components/marketing/sections";

export function About() {
  return (
    <MarketingLayout title="About | NeoOps">
      <div className="ne-page-top">
        <Story />
      </div>
      <ForWho />
      <HowItWorks />
      <FinalCta />
    </MarketingLayout>
  );
}
