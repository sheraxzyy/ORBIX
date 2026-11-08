import React from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '@/components/common/BrandLogo';
import { ThemeToggle } from '@/components/common/ThemeToggle';

export const LandingFooter: React.FC = () => {
  return (
    <footer className="border-t border-border bg-surface/50 text-text-muted py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-10 border-b border-border">
          <div className="space-y-3">
            <BrandLogo />
            <p className="text-xs max-w-sm text-text-muted leading-relaxed">
              ORBIX — CONNECT BEYOND LIMITS. Next-generation real-time messaging platform
              built with high-performance TypeScript and Postgres Row-Level Security.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs">
            <Link to="/login" className="hover:text-text transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="hover:text-text transition-colors">
              Create Account
            </Link>
            <Link to="/app" className="hover:text-text transition-colors">
              Launch Shell
            </Link>
            <a
              href="#security"
              className="hover:text-text transition-colors"
            >
              Security Whitepaper
            </a>
            <ThemeToggle />
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
          <p>© {new Date().getFullYear()} ORBIX Platform. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-text-muted">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Build M1: Foundation & Shell
            </span>
            <span className="text-text-muted">WCAG 2.1 AA Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

