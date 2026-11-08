import React from 'react';
import { LandingNav } from '@/components/landing/LandingNav';
import { HeroSection } from '@/components/landing/HeroSection';
import { ProductPreview } from '@/components/landing/ProductPreview';
import { FeatureGrid } from '@/components/landing/FeatureGrid';
import { SecuritySection } from '@/components/landing/SecuritySection';
import { LandingFooter } from '@/components/landing/LandingFooter';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-text flex flex-col selection:bg-primary/25 selection:text-white">
      <LandingNav />
      <main className="flex-1">
        <HeroSection />
        <ProductPreview />
        <FeatureGrid />
        <SecuritySection />
      </main>
      <LandingFooter />
    </div>
  );
};
export default LandingPage;

