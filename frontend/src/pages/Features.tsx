import React from "react";
import { MarketingLayout } from "../components/marketing/MarketingLayout";
import {
  AlsoIncluded,
  FeaturesIntro,
  FinalCta,
  ProductTour,
} from "../components/marketing/sections";
import { Comparison } from "../components/marketing/parts";

export function Features() {
  return (
    <MarketingLayout title="Features | NeoOps">
      <div className="ne-page-top">
        <FeaturesIntro />
        <ProductTour />
        <AlsoIncluded />
      </div>
      <Comparison />
      <FinalCta />
    </MarketingLayout>
  );
}
