import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  AtSign,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';
import { profileService, RESERVED_USERNAMES } from '@/services/profileService';

export const RegisterPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [immediateSuccess, setImmediateSuccess] = useState(false);

  const { signUp, resendVerification } = useAuth();
  const navigate = useNavigate();

  const validateInputs = (): string | null => {
    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      return 'Please enter your full name (at least 2 characters).';
    }
    if (trimmedName.length > 70) {
      return 'Full name must not exceed 70 characters.';
    }

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3 || cleanUsername.length > 30) {
      return 'Username must be between 3 and 30 characters.';
    }

    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      return 'Username can only contain letters, numbers, and underscores.';
    }

    if (RESERVED_USERNAMES.includes(cleanUsername)) {
      return 'This username is reserved by the system. Please choose another username.';
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return 'Please enter a valid email address.';
    }

    if (!password || password.length < 8) {
      return 'Password must be at least 8 characters long.';
    }

    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumberOrSymbol = /[\d!@#$%^&*(),.?":{}|<>]/.test(password);
    if (!hasLetter || !hasNumberOrSymbol) {
      return 'Password must contain both letters and at least one number or symbol.';
    }

    if (password !== confirmPassword) {
      return 'Passwords do not match. Please re-enter your confirmation password.';
    }

    return null;
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const validationError = validateInputs();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    setLoading(true);

    try {
      // 1. Verify username availability before signup
      const available = await profileService.isUsernameAvailable(cleanUsername);
      if (!available) {
        setErrorMsg('This username is already taken. Please choose another.');
        setLoading(false);
        return;
      }

      // 2. Connect registration to Supabase Auth
      const result = await signUp({
        email: cleanEmail,
        password,
        username: cleanUsername,
        displayName: cleanName,
      });

      // 3. Check if session was created immediately or requires email confirmation
      if (result.session) {
        setImmediateSuccess(true);
        setTimeout(() => {
          navigate('/app/chats', { replace: true });
        }, 1200);
      } else {
        // Email verification is enabled on Supabase
        setRequiresVerification(true);
      }
    } catch (err: unknown) {
      const formatted = authService.formatAuthError(err);
      setErrorMsg(formatted);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim() || resending) return;
    setResending(true);
    setResendStatus(null);
    try {
      await resendVerification(email.trim().toLowerCase());
      setResendStatus('A new confirmation email has been dispatched to your inbox.');
    } catch (err: unknown) {
      setResendStatus(authService.formatAuthError(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text flex flex-col justify-center items-center px-4 py-12 relative">
      <Link
        to="/"
        className="absolute top-6 left-6 inline-flex items-center gap-2 text-xs font-mono text-text-muted hover:text-text transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return Home</span>
      </Link>

      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <BrandLogo className="justify-center mb-4" />
          <h1 className="text-2xl font-bold tracking-tight text-text">Initialize Your Account</h1>
          <p className="text-sm text-text-muted">
            Join ORBIX — Connect Beyond Limits
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs leading-relaxed space-y-2">
              <div>{errorMsg}</div>
              {errorMsg.toLowerCase().includes('already exists') && (
                <div className="flex items-center gap-3 pt-1 border-t border-danger/20 text-xs font-semibold">
                  <Link to="/login" className="underline hover:text-text transition-colors">
                    Log In Now →
                  </Link>
                  <Link to="/forgot-password" className="underline hover:text-text transition-colors">
                    Reset Password?
                  </Link>
                </div>
              )}
            </div>
          )}

          {immediateSuccess ? (
            <div className="py-8 text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-success mx-auto animate-bounce" />
              <h2 className="text-base font-bold text-text">Welcome to ORBIX</h2>
              <p className="text-xs text-text-muted leading-relaxed">
                Account created successfully. Initializing your secure workspace...
              </p>
            </div>
          ) : requiresVerification ? (
            <div className="py-4 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto text-primary">
                <Mail className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-bold text-text">Verify Your Email Address</h2>
                <p className="text-xs text-text-muted leading-relaxed">
                  We sent a confirmation link to <span className="font-semibold text-text">{email}</span>.
                  Please check your inbox and verify your email to activate your account.
                </p>
              </div>

              {resendStatus && (
                <div className="p-2.5 rounded-lg bg-surface border border-border text-xs text-text-muted">
                  {resendStatus}
                </div>
              )}

              <div className="pt-2 space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="w-full h-10 text-xs font-semibold gap-2"
                >
                  {resending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Resend Verification Email</span>
                </Button>

                <Button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full h-10 text-xs font-semibold"
                >
                  Proceed to Sign In
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5" noValidate>
              {/* Full Name */}
              <div className="space-y-1.5">
                <label htmlFor="fullName" className="block text-xs font-medium text-text">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Elena Rostova"
                    className="pl-9"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="username" className="block text-xs font-medium text-text">
                    Unique Username
                  </label>
                  <span className="text-[10px] font-mono text-text-muted">
                    Handle
                  </span>
                </div>
                <div className="relative">
                  <AtSign className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="elena_rostova"
                    className="pl-9"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label htmlFor="regEmail" className="block text-xs font-medium text-text">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="regEmail"
                    type="email"
                    placeholder="elena@orbix.network"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="regPassword" className="block text-xs font-medium text-text">
                    Password
                  </label>
                  <span className="text-[10px] text-text-muted">Min. 8 chars</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="regPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
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

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="block text-xs font-medium text-text">
                  Confirm Password
                </label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="confirmPassword"
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
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-3">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 text-sm font-semibold"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Account...</span>
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-border text-center text-xs text-text-muted">
            <span>Already have an account? </span>
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
