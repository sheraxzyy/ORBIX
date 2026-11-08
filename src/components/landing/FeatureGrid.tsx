import React from 'react';
import { Database, Cpu, Zap, EyeOff, Sparkles, Layers } from 'lucide-react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  tag: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, tag }) => {
  return (
    <div className="p-6 rounded-2xl border border-border bg-surface/70 hover:border-primary/50 hover:bg-card transition-all flex flex-col justify-between group">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="p-2.5 rounded-xl bg-card border border-border text-primary group-hover:border-primary/40 transition-colors">
            {icon}
          </div>
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-background border border-border text-text-muted">
            {tag}
          </span>
        </div>
        <h3 className="text-lg font-bold text-text mb-2">{title}</h3>
        <p className="text-sm text-text-muted leading-relaxed">{description}</p>
      </div>
    </div>
  );
};

export const FeatureGrid: React.FC = () => {
  return (
    <section id="features" className="py-16 md:py-24 border-t border-border/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text mb-4">
            Engineered for Precision & Speed
          </h2>
          <p className="text-text-muted text-base">
            Every layer from database triggers to client virtualization is tuned to eliminate latency,
            prevent race conditions, and preserve complete data integrity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Cpu className="w-5 h-5" />}
            tag="Realtime Core"
            title="Idempotent Dispatch"
            description="Client-generated UUIDs ensure zero-duplicate delivery on reconnections, retry bursts, or flaky network transitions."
          />
          <FeatureCard
            icon={<Database className="w-5 h-5" />}
            tag="Database"
            title="Monotonic Sequences"
            description="Deterministic per-conversation ordering guarantees flicker-free cursor pagination and instant unread count reconciliation."
          />
          <FeatureCard
            icon={<Zap className="w-5 h-5" />}
            tag="Supabase Realtime"
            title="Zero-Churn Presence"
            description="Ephemeral broadcast channels handle typing and active presence without generating useless, expensive disk writes."
          />
          <FeatureCard
            icon={<EyeOff className="w-5 h-5" />}
            tag="Privacy"
            title="Selective Visibility"
            description="Granular controls for last-seen timestamps, profile read-access, and proactive bi-directional blocking policies."
          />
          <FeatureCard
            icon={<Layers className="w-5 h-5" />}
            tag="Performance"
            title="Virtualized Rendering"
            description="React Virtuoso integration renders thousands of messages smoothly while maintaining exact anchor positions during prepend."
          />
          <FeatureCard
            icon={<Sparkles className="w-5 h-5" />}
            tag="Accessibility"
            title="Universal Access"
            description="Strict WCAG AA contrast compliance across light and dark modes with complete prefers-reduced-motion accommodations."
          />
        </div>
      </div>
    </section>
  );
};

