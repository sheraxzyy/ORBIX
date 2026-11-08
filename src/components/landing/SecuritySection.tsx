import React from 'react';
import { ShieldCheck, Lock, KeyRound, Server } from 'lucide-react';

export const SecuritySection: React.FC = () => {
  return (
    <section id="security" className="py-16 md:py-24 border-t border-border/60 bg-surface/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-semibold mb-4">
            <Lock className="w-3.5 h-3.5" aria-hidden="true" />
            Security & Cryptographic Foundation
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text mb-4">
            Database-Level Authorization by Design
          </h2>
          <p className="text-base sm:text-lg text-text-muted leading-relaxed">
            Unlike superficial client-side checks, ORBIX data boundaries are strictly enforced in the database kernel.
            All communications are{' '}
            <strong className="text-text font-semibold">
              encrypted in transit and at rest by the platform, with access controlled by PostgreSQL Row-Level Security (RLS).
            </strong>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-surface border border-border text-primary">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text mb-1">
                  Hardened Row-Level Security
                </h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  Every query is scoped by PostgreSQL RLS. Helper functions execute with strict{' '}
                  <code className="text-primary font-mono text-xs px-1 py-0.5 rounded bg-surface border border-border">
                    SET search_path = &apos;&apos;
                  </code>{' '}
                  to eliminate search-path injection vectors and recursive policy loops.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-surface border border-border text-primary">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text mb-1">
                  Zero Email Leakage & User Protection
                </h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  Emails are isolated inside authentication schemas and never exposed on public tables.
                  User discovery relies exclusively on public handles and display names protected by privacy preferences.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-surface border border-border text-primary">
                <Server className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text mb-1">
                  Private Storage with Short-Lived Tokens
                </h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  Attachments reside in private storage buckets accessible solely via conversation-verified
                  short-lived signed URLs. Guessing paths returns immediate authorization denial.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-surface border border-border text-primary">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text mb-1">
                  Server-Enforced Immutability
                </h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  Message edits preserve original sequences, soft-deletes wipe payloads server-side,
                  and group administrative actions prevent rogue role escalation or owner removal.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

