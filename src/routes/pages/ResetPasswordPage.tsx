import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, CheckCircle2, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authService } from '@/services/authService';
import { supabase } from '@/lib/supabase';

export const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 1. Inspect URL hash for auth errors from Supabase
    const hash = window.location.hash || location.hash || '';
    if (hash.includes('error=')) {
      const params = new URLSearchParams(hash.replace(/^#/, ''));
      const errorDesc = params.get('error_description') || params.get('error');
      setLinkError(
        errorDesc?.includes('expired')
          ? 'This password reset link has expired. Please request a new recovery link.'
          : 'This password reset link is invalid or has already been used.'
      );
      setCheckingSession(false);
      return;
    }

    // 2. Check for active session or recovery token
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasValidSession(true);
      } else {
        // Listen once for password recovery event
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
          if (event === 'PASSWORD_RECOVERY' || (s && event === 'SIGNED_IN')) {
            setHasValidSession(true);
            setCheckingSession(false);
          }
        });

        // Give Supabase hash parser a small grace period before declaring no session
        setTimeout(() => {
          subscription.unsubscribe();
          setCheckingSession(false);
        }, 1200);
        return;
      }
      setCheckingSession(false);
    });
  }, [location]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!password) {
      setErrorMsg('Please enter a new password.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumberOrSymbol = /[\d!@#$%^&*(),.?":{}|<>]/.test(password);
    if (!hasLetter || !hasNumberOrSymbol) {
      setErrorMsg('Password must contain letters and at least one number or symbol.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter your confirmation password.');
      return;
    }

    setLoading(true);

    try {
      await authService.updatePassword(password);
      setComplete(true);
    } catch (err: unknown) {
      const formatted = authService.formatAuthError(err);
      setErrorMsg(formatted);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text flex flex-col justify-center items-center px-4 py-12 relative">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <BrandLogo className="justify-center mb-4" />
          <h1 className="text-2xl font-bold tracking-tight text-text">Set New Password</h1>
          <p className="text-sm text-text-muted">
            Define a strong key for your ORBIX credentials
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl">
          {checkingSession ? (
            <div className="py-8 text-center space-y-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
              <p className="text-xs text-text-muted">Verifying recovery credentials...</p>
            </div>
          ) : linkError ? (
            <div className="text-center space-y-4 py-4">
              <AlertCircle className="w-12 h-12 text-danger mx-auto" />
              <h2 className="text-base font-bold text-text">Invalid Recovery Link</h2>
              <p className="text-xs text-text-muted leading-relaxed">{linkError}</p>
              <Button className="w-full mt-4" asChild>
                <Link to="/forgot-password">Request New Recovery Link</Link>
              </Button>
            </div>
          ) : !hasValidSession && !complete ? (
            <div className="text-center space-y-4 py-4">
              <AlertCircle className="w-12 h-12 text-warning mx-auto" />
              <h2 className="text-base font-bold text-text">Session Not Detected</h2>
              <p className="text-xs text-text-muted leading-relaxed">
                No active recovery session was detected. If you followed a reset email, the link may have expired or was opened in another browser.
              </p>
              <div className="pt-2 space-y-2">
                <Button className="w-full" asChild>
                  <Link to="/forgot-password">Request Reset Link</Link>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/login">Return to Login</Link>
                </Button>
              </div>
            </div>
          ) : complete ? (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
              <h2 className="text-base font-bold text-text">Password Updated</h2>
              <p className="text-xs text-text-muted">
                Your credentials have been securely updated. You can now log in.
              </p>
              <Button className="w-full mt-4" onClick={() => navigate('/login?reset=true')}>
                Proceed to Login
              </Button>
            </div>
          ) : (
            <div>
              {errorMsg && (
                <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs leading-relaxed">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleUpdate} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <label htmlFor="newPass" className="block text-xs font-medium text-text">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      id="newPass"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimum 8 characters"
                      className="pl-9 pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirmPass" className="block text-xs font-medium text-text">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      id="confirmPass"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Repeat password"
                      className="pl-9 pr-10"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 text-sm font-semibold"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Updating password...</span>
                      </span>
                    ) : (
                      'Update Password'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
