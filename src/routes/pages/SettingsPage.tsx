import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ShieldCheck, Bell, Palette, ChevronRight, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, type Theme } from '@/contexts/ThemeContext';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings } = useAuth();
  const { theme, setTheme } = useTheme();

  const handleThemeChange = async (newTheme: Theme) => {
    setTheme(newTheme);
    try {
      await updateSettings({ theme: newTheme });
    } catch (err) {
      console.error('Failed to sync theme preference to database:', err);
    }
  };

  const sections = [
    {
      to: '/app/settings/security',
      icon: ShieldCheck,
      title: 'Security & Account',
      desc: 'Two-factor authentication, active sessions, change password, and account lifecycle.',
    },
    {
      to: '/app/settings/privacy',
      icon: Shield,
      title: 'Privacy & Visibility',
      desc: 'Control last-seen timestamps, profile discovery, and blocked users.',
    },
    {
      to: '/app/settings/notifications',
      icon: Bell,
      title: 'Notifications & Sounds',
      desc: 'Configure notification alerts, audio chimes, and viewport suppression.',
    },
  ];

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-background">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="pb-6 border-b border-border">
          <h1 className="text-2xl font-bold tracking-tight text-text">Settings</h1>
          <p className="text-sm text-text-muted mt-1">
            Configure platform behavior, security preferences, and interface appearance.
          </p>
        </div>

        {/* Theme Settings Section */}
        <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-card border border-border text-primary">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text">Appearance Theme</h3>
              <p className="text-xs text-text-muted">
                Changes persist in PostgreSQL and synchronize across all active devices.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-1">
            {(['dark', 'light', 'system'] as const).map((t) => {
              const isSelected = theme === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleThemeChange(t)}
                  className={`p-3 rounded-xl border text-xs font-semibold capitalize flex items-center justify-between transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary shadow-xs'
                      : 'border-border bg-card/60 text-text-muted hover:text-text hover:border-border'
                  }`}
                >
                  <span>{t}</span>
                  {isSelected && <Check className="w-4 h-4 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation to Subsections */}
        <div className="space-y-3">
          {sections.map((sec) => {
            const Icon = sec.icon;
            return (
              <Link
                key={sec.to}
                to={sec.to}
                className="p-5 rounded-2xl bg-surface border border-border hover:border-primary/50 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-card border border-border text-primary group-hover:border-primary/50 transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text group-hover:text-primary transition-colors">
                      {sec.title}
                    </h3>
                    <p className="text-xs text-text-muted">{sec.desc}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text transition-colors" />
              </Link>
            );
          })}
        </div>

        {/* Database Sync Status */}
        <div className="p-4 rounded-xl bg-surface/50 border border-border text-xs font-mono text-text-muted flex items-center justify-between">
          <span>PostgreSQL Settings Row:</span>
          <span className="text-success font-semibold">
            {settings ? 'Synced' : 'Loading...'}
          </span>
        </div>
      </div>
    </div>
  );
};
export default SettingsPage;
