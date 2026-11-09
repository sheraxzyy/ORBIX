import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Loader2, Send } from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { authService } from '@/services/authService';

export const AuthCallbackPage: React.FC = () => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleAuthRedirect = async () => {
      // 1. Inspect URL parameters and hash
      const hash = window.location.hash || location.hash || '';
      const search = window.location.search || location.search || '';

      const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
      const queryParams = new URLSearchParams(search);

      const error = hashParams.get('error') || queryParams.get('error');
      const errorDesc =
        hashParams.get('error_description') || queryParams.get('error_description');
      const errorCode = hashParams.get('error_code') || queryParams.get('error_code');
      const type = hashParams.get('type') || queryParams.get('type');

      if (error || errorCode) {
        setStatus('error');
        if (errorCode === 'otp_expired' || errorDesc?.toLowerCase().includes('expired')) {
          setErrorMessage('This verification link has expired. Please request a new one.');
        } else {
          setErrorMessage(
            errorDesc || 'This verification link is invalid or has already been used.'
          );
        }
        return;
      }

      // If this is a password recovery link, immediately forward to /reset-password
      if (type === 'recovery') {
        navigate('/reset-password' + hash, { replace: true });
        return;
      }

      // 2. Allow Supabase client to process any tokens in URL
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setStatus('success');
        setTimeout(() => {
          navigate('/app/chats', { replace: true });
        }, 1500);
      } else {
        // Listen once for auth change
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, newSession) => {
          if (event === 'PASSWORD_RECOVERY') {
            subscription.unsubscribe();
            navigate('/reset-password', { replace: true });
          } else if (newSession && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
            subscription.unsubscribe();
            setStatus('success');
            setTimeout(() => {
              navigate('/app/chats', { replace: true });
            }, 1500);
          }
        });

        setTimeout(() => {
          subscription.unsubscribe();
          // If after 3 seconds no session or error was processed, redirect to login
          setStatus((prev) => {
            if (prev === 'processing') {
              navigate('/login', { replace: true });
            }
            return prev;
          });
        }, 3000);
      }
    };

    handleAuthRedirect();
  }, [location, navigate]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = resendEmail.trim().toLowerCase();
    if (!cleanEmail || resending) return;

    setResending(true);
    setResendStatus(null);
    try {
      await authService.resendVerificationEmail(cleanEmail);
      setResendStatus('A new confirmation email has been dispatched. Please check your inbox.');
    } catch (err) {
      setResendStatus(authService.formatAuthError(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text flex flex-col justify-center items-center px-4 py-12 relative">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <BrandLogo className="justify-center mb-4" />
          <h1 className="text-2xl font-bold tracking-tight text-text">Account Verification</h1>
          <p className="text-sm text-text-muted">Finalizing your ORBIX security credentials</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl text-center">
          {status === 'processing' && (
            <div className="py-8 space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
              <div className="space-y-1">
                <h2 className="text-base font-bold text-text">Verifying Credentials...</h2>
                <p className="text-xs text-text-muted">
                  Validating your cryptographic session token. Please wait a moment.
                </p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="py-6 space-y-4">
              <CheckCircle2 className="w-12 h-12 text-success mx-auto animate-bounce" />
              <div className="space-y-1">
                <h2 className="text-base font-bold text-text">Email Confirmed Successfully</h2>
                <p className="text-xs text-text-muted">
                  Your identity has been verified. Redirecting to your workspace...
                </p>
              </div>
              <Button className="w-full mt-2" onClick={() => navigate('/app/chats')}>
                Enter ORBIX
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="py-4 space-y-4 text-left">
              <div className="text-center space-y-2">
                <AlertCircle className="w-12 h-12 text-danger mx-auto" />
                <h2 className="text-base font-bold text-text">Verification Issue</h2>
                <p className="text-xs text-text-muted leading-relaxed">{errorMessage}</p>
              </div>

              {resendStatus && (
                <div className="p-2.5 rounded-lg bg-surface border border-border text-xs text-text-muted">
                  {resendStatus}
                </div>
              )}

              <form onSubmit={handleResend} className="space-y-3 pt-2">
                <div className="space-y-1">
                  <label htmlFor="resendEmail" className="block text-xs font-medium text-text">
                    Resend Verification to Email
                  </label>
                  <Input
                    id="resendEmail"
                    type="email"
                    placeholder="operator@orbix.network"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={resending}
                  className="w-full h-10 text-xs font-semibold gap-2"
                >
                  {resending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Resend Email</span>
                </Button>
              </form>

              <div className="pt-2 border-t border-border text-center">
                <Button variant="outline" className="w-full text-xs" asChild>
                  <Link to="/login">Return to Sign In</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthCallbackPage;

