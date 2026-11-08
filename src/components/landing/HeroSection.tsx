import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Zap, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const HeroSection: React.FC = () => {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-24 md:pb-32">
      {/* Background Orbital Glows */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-primary/15 rounded-full blur-[120px] pointer-events-none -z-10"
        aria-hidden="true"
      />
      <div
        className="absolute top-1/3 left-1/3 w-72 h-72 bg-primary/10 rounded-full blur-[90px] pointer-events-none -z-10"
        aria-hidden="true"
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Subtle Pill Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-surface/70 backdrop-blur-sm text-xs font-mono text-text-muted mb-6 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />
          <span>ORBIX v2.0 • Real-Time Engine Active</span>
        </div>

        {/* Hero Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-text leading-[1.08] mb-6">
          Communication <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-[#FF2E4D] to-primary">
            Without Limits.
          </span>
        </h1>

        {/* Supporting Copy */}
        <p className="max-w-2xl mx-auto text-lg sm:text-xl text-text-muted leading-relaxed mb-10">
          Connect with people, share moments, and keep every conversation in one place with ORBIX.
          Built on PostgreSQL Row-Level Security with zero fake latency.
        </p>

        {/* Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-14">
          <Button size="lg" className="w-full sm:w-auto text-base gap-2" asChild>
            <Link to="/register">
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full sm:w-auto text-base"
            asChild
          >
            <Link to="/login">Sign In</Link>
          </Button>
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left pt-6 border-t border-border/60">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-surface/40 border border-border/40">
            <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0" aria-hidden="true" />
            <span className="text-xs text-text font-medium">PostgreSQL Row-Level Security</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-surface/40 border border-border/40">
            <Zap className="w-5 h-5 text-primary flex-shrink-0" aria-hidden="true" />
            <span className="text-xs text-text font-medium">Sub-Second Realtime Streaming</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-surface/40 border border-border/40">
            <Lock className="w-5 h-5 text-primary flex-shrink-0" aria-hidden="true" />
            <span className="text-xs text-text font-medium">Encrypted in Transit & at Rest</span>
          </div>
        </div>
      </div>
    </section>
  );
};

