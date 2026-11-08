import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle2, Loader2, Eye, EyeOff } from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authService } from '@/services/authService';

export const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      await authService.updatePassword(password);
      setComplete(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Password reset failed';
      setErrorMsg(msg);
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
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs leading-relaxed">
              {errorMsg}
            </div>
          )}

          {complete ? (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
              <h2 className="text-base font-bold text-text">Password Updated</h2>
              <p className="text-xs text-text-muted">
                Your credentials have been securely updated. You can now log in.
              </p>
              <Button className="w-full mt-4" onClick={() => navigate('/login')}>
                Proceed to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="newPass" className="block text-xs font-medium text-text">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="newPass"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 6 characters"
                    className="pl-9 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
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
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Repeat password"
                    className="pl-9 pr-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                      <span>Updating password...</span>
                    </span>
                  ) : (
                    'Update Password'
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
export default ResetPasswordPage;
