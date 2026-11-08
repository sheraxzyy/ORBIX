import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { BrandLogo } from '@/components/common/BrandLogo';
import { PlaceholderBadge } from '@/components/common/PlaceholderBadge';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

const ThemeTester: React.FC = () => {
  const { theme, resolvedTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-val">{theme}</span>
      <span data-testid="resolved-val">{resolvedTheme}</span>
    </div>
  );
};

describe('Foundation & Branding Units', () => {
  it('renders BrandLogo with ORBIX typography and beyond limits tagline', () => {
    render(
      <BrowserRouter>
        <BrandLogo />
      </BrowserRouter>
    );
    expect(screen.getByText(/ORB/)).toBeInTheDocument();
    expect(screen.getByText(/Beyond Limits/i)).toBeInTheDocument();
  });

  it('renders PlaceholderBadge explicitly identifying preview shell', () => {
    render(<PlaceholderBadge label="Shell Mode" milestone="M1" />);
    expect(screen.getByText('Shell Mode')).toBeInTheDocument();
    expect(screen.getByText('M1')).toBeInTheDocument();
  });

  it('defaults to dark theme per Part C non-negotiables', () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <ThemeTester />
      </ThemeProvider>
    );
    expect(screen.getByTestId('theme-val').textContent).toBe('dark');
    expect(screen.getByTestId('resolved-val').textContent).toBe('dark');
  });
});

