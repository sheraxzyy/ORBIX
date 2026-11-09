import React, { useState } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Loader2, CheckCircle2, KeyRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminService } from '@/services/adminService';

export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-text">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-xs font-mono text-text-muted">Authenticating Session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Open auth modal and redirect to public chat view
    return <Navigate to="/app/chats" state={{ from: location, requireAuth: true }} replace />;
  }

  return <>{children}</>;
};

export const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, isAuthenticated, isLoading, isAdmin, refreshProfile } = useAuth();
  const location = useLocation();
  const [bootstrapEmail, setBootstrapEmail] = useState('');
  const [bootstrapping, setBootstrapping] = useState(false);
  const [bootstrapMsg, setBootstrapMsg] = useState<string | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-text">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-xs font-mono text-text-muted">Verifying Administrative Privileges...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location, message: 'Please sign in with administrator credentials.' }} replace />;
  }

  if (!isAdmin) {
    const handleBootstrap = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!bootstrapEmail.trim()) return;
      setBootstrapping(true);
      setBootstrapMsg(null);
      setBootstrapError(null);
      try {
        const res = await adminService.bootstrapInitialAdmin(bootstrapEmail.trim());
        setBootstrapMsg(res);
        await refreshProfile();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Bootstrap procedure failed.';
        setBootstrapError(msg);
      } finally {
        setBootstrapping(false);
      }
    };

    return (
      <div className="min-h-screen bg-background text-text flex flex-col justify-center items-center px-4 py-12">
        <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl bg-surface border border-border shadow-2xl space-y-6 text-center animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-danger/10 border border-danger/30 flex items-center justify-center text-danger mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight text-text">
              Administrative Privileges Required
            </h1>
            <p className="text-xs text-text-muted leading-relaxed">
              Signed in as <span className="font-mono text-text">@{profile?.username || user?.email}</span>.
              This restricted area requires an authenticated administrator or super administrator role.
            </p>
          </div>

          {/* Secure Bootstrap Box */}
          <div className="p-4 rounded-xl bg-card border border-border text-left space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-text">
              <KeyRound className="w-4 h-4 text-primary" />
              <span>Initial Administrator Bootstrap</span>
            </div>
            <p className="text-[11px] text-text-muted">
              If you are the platform owner setting up the first administrator, enter your account email below to claim super administrator privileges:
            </p>
            <form onSubmit={handleBootstrap} className="space-y-2">
              <Input
                type="email"
                placeholder="admin@example.com"
                value={bootstrapEmail}
                onChange={(e) => setBootstrapEmail(e.target.value)}
                className="text-xs h-9 bg-surface"
              />
              <Button
                type="submit"
                disabled={bootstrapping || !bootstrapEmail.trim()}
                className="w-full h-9 text-xs gap-1.5"
              >
                {bootstrapping ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>Claim Super Admin Role</span>
                )}
              </Button>
            </form>

            {bootstrapMsg && (
              <div className="p-2.5 rounded-lg bg-success/10 border border-success/30 text-success text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{bootstrapMsg}</span>
              </div>
            )}

            {bootstrapError && (
              <div className="p-2.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs">
                {bootstrapError}
              </div>
            )}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <Link to="/app/chats" className="flex-1">
              <Button variant="outline" className="w-full text-xs h-10 gap-2 border-border">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Chats</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export const RedirectIfAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/app/chats';
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
};
