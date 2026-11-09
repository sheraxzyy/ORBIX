import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Lock,
  Mail,
  User,
  AtSign,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';
import { profileService, RESERVED_USERNAMES } from '@/services/profileService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'options' | 'login' | 'register';
  intendedAction?: string | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'options',
  intendedAction,
}) => {
  const { signIn, signUp, resendVerification } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'options' | 'login' | 'register' | 'verify'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      await signIn(email.trim().toLowerCase(), password);
      onClose();
      navigate('/app/chats');
    } catch (err: unknown) {
      setErrorMsg(authService.formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = fullName.trim();
    if (!cleanName || cleanName.length < 2) {
      setErrorMsg('Please enter your full name (at least 2 characters).');
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      setErrorMsg('Username must be between 3 and 30 characters.');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      setErrorMsg('Username can only contain letters, numbers, and underscores.');
      return;
    }

    if (RESERVED_USERNAMES.includes(cleanUsername)) {
      setErrorMsg('This username is reserved by the system. Please choose another username.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address.');
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
      const available = await profileService.isUsernameAvailable(cleanUsername);
      if (!available) {
        setErrorMsg('This username is already taken. Please choose another.');
        setLoading(false);
        return;
      }

      const result = await signUp({
        email: cleanEmail,
        password,
        username: cleanUsername,
        displayName: cleanName,
      });

      if (result.session) {
        onClose();
        navigate('/app/chats');
      } else {
        setMode('verify');
      }
    } catch (err: unknown) {
      setErrorMsg(authService.formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim() || resending) return;
    setResending(true);
    setResendStatus(null);
    try {
      await resendVerification(email.trim().toLowerCase());
      setResendStatus('Confirmation link sent. Please check your inbox.');
    } catch (err) {
      setResendStatus(authService.formatAuthError(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 sm:p-8 space-y-6 shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg text-text-muted hover:text-text hover:bg-card transition-colors focus-visible:outline-primary"
          aria-label="Close authentication modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2">
          <BrandLogo className="justify-center mb-3" />
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-text">
            {mode === 'verify' ? 'Confirm Your Email' : 'Join the ORBIX community.'}
          </h2>
          <p className="text-xs sm:text-sm text-text-muted max-w-xs mx-auto">
            {mode === 'verify'
              ? `We sent a confirmation link to ${email}. Verify it to activate your account.`
              : intendedAction
              ? `${intendedAction} — Sign in or create an account to proceed.`
              : 'Create an account or sign in to connect with people and start conversations.'}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs leading-relaxed space-y-2">
            <div>{errorMsg}</div>
            {errorMsg.toLowerCase().includes('already exists') && (
              <div className="flex items-center gap-3 pt-1 border-t border-danger/20 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setMode('login');
                  }}
                  className="underline hover:text-text transition-colors"
                >
                  Log In Now →
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/forgot-password');
                  }}
                  className="underline hover:text-text transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            )}
          </div>
        )}

        {mode === 'options' && (
          <div className="space-y-3 pt-2">
            <Button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setMode('register');
              }}
              className="w-full h-11 text-sm font-semibold gap-2"
            >
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4" />
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setErrorMsg(null);
                setMode('login');
              }}
              className="w-full h-11 text-sm font-semibold"
            >
              Log In
            </Button>
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-text">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="email"
                  placeholder="name@orbix.network"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 h-10 text-xs bg-card"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-text">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/forgot-password');
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 h-10 text-xs bg-card"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 text-sm font-semibold mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </span>
              ) : (
                'Log In'
              )}
            </Button>

            <div className="flex items-center justify-between text-xs text-text-muted pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setMode('options');
                }}
                className="hover:text-text transition-colors"
              >
                ← Back
              </button>
              <span>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setMode('register');
                  }}
                  className="text-primary font-medium hover:underline"
                >
                  Create one
                </button>
              </span>
            </div>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5" noValidate>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-text">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Elena Rostova"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-9 h-10 text-xs bg-card"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-text">Unique Username</label>
              <div className="relative">
                <AtSign className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="elena_rostova"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-9 h-10 text-xs bg-card"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-text">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="email"
                  placeholder="elena@orbix.network"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 h-10 text-xs bg-card"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-text">Password (min 8 chars)</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 h-10 text-xs bg-card"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-text">Confirm Password</label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="password"
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-9 h-10 text-xs bg-card"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 text-sm font-semibold mt-2"
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

            <div className="flex items-center justify-between text-xs text-text-muted pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setMode('options');
                }}
                className="hover:text-text transition-colors"
              >
                ← Back
              </button>
              <span>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setMode('login');
                  }}
                  className="text-primary font-medium hover:underline"
                >
                  Log In
                </button>
              </span>
            </div>
          </form>
        )}

        {mode === 'verify' && (
          <div className="space-y-4 py-2 text-center">
            <p className="text-xs text-text-muted">
              Didn't receive the verification email? Check your spam folder or request a new one below.
            </p>

            {resendStatus && (
              <div className="p-2.5 rounded-lg bg-card border border-border text-xs text-text-muted">
                {resendStatus}
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={handleResend}
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
              onClick={() => {
                setErrorMsg(null);
                setMode('login');
              }}
              className="w-full h-10 text-xs font-semibold"
            >
              Proceed to Sign In
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
