import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ArrowRight } from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export const LandingNav: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <BrandLogo />

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-text-muted">
          <a
            href="#features"
            className="hover:text-text transition-colors focus-visible:outline-primary rounded-sm"
          >
            Features
          </a>
          <a
            href="#security"
            className="hover:text-text transition-colors focus-visible:outline-primary rounded-sm"
          >
            Security & RLS
          </a>
          <a
            href="#preview"
            className="hover:text-text transition-colors focus-visible:outline-primary rounded-sm"
          >
            Interface
          </a>
        </nav>

        {/* Action Controls */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          {isAuthenticated ? (
            <Button asChild>
              <Link to="/app/chats" className="flex items-center gap-1.5">
                <span>Open App</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link to="/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link to="/register" className="flex items-center gap-1.5">
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg border border-border text-text hover:bg-surface focus-visible:outline-primary"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-surface px-4 py-5 space-y-4 animate-fade-in">
          <nav className="flex flex-col space-y-3 text-base font-medium text-text">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-md hover:bg-card transition-colors"
            >
              Features
            </a>
            <a
              href="#security"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-md hover:bg-card transition-colors"
            >
              Security & RLS
            </a>
            <a
              href="#preview"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-md hover:bg-card transition-colors"
            >
              Interface
            </a>
          </nav>
          <div className="pt-3 border-t border-border flex flex-col gap-2.5">
            <Button variant="outline" className="w-full justify-center" asChild>
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                Log in
              </Link>
            </Button>
            <Button className="w-full justify-center" asChild>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                Get Started
              </Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};

