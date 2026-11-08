import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, AtSign, Mail, Lock, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { profileService, RESERVED_USERNAMES } from '@/services/profileService';

export const RegisterPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim() || !email.trim() || !password) return;

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

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      // Pre-registration availability check
      const available = await profileService.isUsernameAvailable(cleanUsername);
      if (!available) {
        setErrorMsg('This username is already taken. Please choose another username.');
        setLoading(false);
        return;
      }

      await signUp(email.trim(), password, cleanUsername, fullName.trim());
      setSuccessInfo(
        'Account initialized! If email confirmation is required, please check your inbox before logging in.'
      );
      setTimeout(() => {
        navigate('/app/chats');
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      if (
        msg.includes('unique') ||
        msg.includes('profiles_username_unique') ||
        msg.includes('already registered') ||
        msg.includes('duplicate key')
      ) {
        setErrorMsg('This username is already taken. Please choose another username.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
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
            <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs leading-relaxed">
              {errorMsg}
            </div>
          )}

          {successInfo ? (
            <div className="py-6 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
              <h2 className="text-base font-bold text-text">Welcome to ORBIX</h2>
              <p className="text-xs text-text-muted leading-relaxed">{successInfo}</p>
            </div>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
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
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="username" className="block text-xs font-medium text-text">
                    Username
                  </label>
                  <span className="text-[10px] font-mono text-text-muted">
                    Unique handle
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
                  />
                </div>
              </div>

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
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="regPassword" className="block text-xs font-medium text-text">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="regPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 6 characters"
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
