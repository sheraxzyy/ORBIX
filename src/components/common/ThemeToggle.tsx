import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme, type Theme } from '@/contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const handleCycle = () => {
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('system');
    else setTheme('dark');
  };

  const getIcon = () => {
    if (theme === 'system') {
      return <Monitor className="w-4 h-4 text-text-muted" aria-hidden="true" />;
    }
    return resolvedTheme === 'dark' ? (
      <Moon className="w-4 h-4 text-primary" aria-hidden="true" />
    ) : (
      <Sun className="w-4 h-4 text-amber-500" aria-hidden="true" />
    );
  };

  const getLabel = (t: Theme) => {
    switch (t) {
      case 'dark':
        return 'Current: Dark theme. Click to switch to Light.';
      case 'light':
        return 'Current: Light theme. Click to switch to System.';
      case 'system':
        return 'Current: System theme. Click to switch to Dark.';
    }
  };

  return (
    <button
      type="button"
      onClick={handleCycle}
      className={`p-2 rounded-lg border border-border bg-surface/80 hover:bg-card hover:border-primary/50 text-text transition-colors focus-visible:outline-primary ${className}`}
      aria-label={getLabel(theme)}
      title={getLabel(theme)}
    >
      {getIcon()}
    </button>
  );
};

