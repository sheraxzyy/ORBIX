import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, CheckCircle2, Loader2 } from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authService } from '@/services/authService';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      await authService.resetPasswordForEmail(email);
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send recovery email';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text flex flex-col justify-center items-center px-4 py-12 relative">
      <Link
        to="/login"
        className="absolute top-6 left-6 inline-flex items-center gap-2 text-xs font-mono text-text-muted hover:text-text transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Login</span>
      </Link>

      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <BrandLogo className="justify-center mb-4" />
          <h1 className="text-2xl font-bold tracking-tight text-text">Recover Password</h1>
          <p className="text-sm text-text-muted">
            Receive a secure recovery link to regain access
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs leading-relaxed">
              {errorMsg}
            </div>
          )}

          {submitted ? (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
              <h2 className="text-base font-bold text-text">Recovery Link Dispatched</h2>
              <p className="text-xs text-text-muted leading-relaxed">
                If an account exists for {email}, a password recovery link has been sent to your email.
              </p>
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link to="/login">Return to Login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="recoveryEmail" className="block text-xs font-medium text-text">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="recoveryEmail"
                    type="email"
                    placeholder="user@orbix.network"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
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
                      <span>Sending link...</span>
                    </span>
                  ) : (
                    'Send Recovery Link'
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
export default ForgotPasswordPage;
