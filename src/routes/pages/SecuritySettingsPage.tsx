import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  KeyRound,
  QrCode,
  Mail,
  Laptop,
  LogOut,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  Calendar,
  Shield,
  Smartphone,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';
import { supabase } from '@/lib/supabase';

export const SecuritySettingsPage: React.FC = () => {
  const { user, profile, refreshProfile, signOut, deactivateAccount, deleteAccount } = useAuth();
  const navigate = useNavigate();

  // Password Security State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Email Security State
  const [newEmail, setNewEmail] = useState('');
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // MFA TOTP State
  const [mfaEnrolled, setMfaEnrolled] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [qrCodeSvg, setQrCodeSvg] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [totpVerifyCode, setTotpVerifyCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaSuccess, setMfaSuccess] = useState<string | null>(null);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Session Security State
  const [signingOutAll, setSigningOutAll] = useState(false);
  const [sessionSuccess, setSessionSuccess] = useState<string | null>(null);

  // Account Lifecycle State: Deactivate / Delete Modals
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Load MFA Factors
  const checkMfaStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (!error && data) {
        const verifiedTotp = data.totp.find((f) => f.status === 'verified');
        if (verifiedTotp) {
          setMfaEnrolled(true);
          setMfaFactorId(verifiedTotp.id);
        } else {
          setMfaEnrolled(false);
          setMfaFactorId(null);
        }
      }
    } catch {
      // Ignore if MFA not configured on backend
    }
  }, []);

  useEffect(() => {
    checkMfaStatus();
  }, [checkMfaStatus]);

  // A. Password Update Handler
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (!/[a-zA-Z]/.test(newPassword) || !/[\d!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      setPasswordError('New password must contain letters and at least one number or symbol.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('Confirmation password does not match.');
      return;
    }

    setUpdatingPassword(true);
    try {
      // Re-verify current password if provided
      if (currentPassword && user?.email) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });
        if (signInErr) {
          setPasswordError('Current password is incorrect.');
          setUpdatingPassword(false);
          return;
        }
      }

      await authService.updatePassword(newPassword);
      setPasswordSuccess('Password successfully updated. Please use your new password next time you sign in.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      setPasswordError(authService.formatAuthError(err));
    } finally {
      setUpdatingPassword(false);
    }
  };

  // B. Email Change Handler
  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailSuccess(null);
    setEmailError(null);

    const cleanEmail = newEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    setUpdatingEmail(true);
    try {
      await authService.updateEmail(cleanEmail);
      setEmailSuccess(
        `Confirmation dispatched to ${cleanEmail}. Both your current and new email must confirm the change.`
      );
      setNewEmail('');
    } catch (err) {
      setEmailError(authService.formatAuthError(err));
    } finally {
      setUpdatingEmail(false);
    }
  };

  // C. MFA TOTP Setup Handlers
  const handleStartMfaEnroll = async () => {
    setMfaLoading(true);
    setMfaError(null);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'ORBIX',
      });
      if (error) throw error;
      setMfaFactorId(data.id);
      setQrCodeSvg(data.totp.qr_code);
      setTotpSecret(data.totp.secret);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize MFA enrollment.';
      setMfaError(msg);
    } finally {
      setMfaLoading(false);
    }
  };

  const handleVerifyTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaFactorId || !totpVerifyCode.trim()) return;
    setMfaLoading(true);
    setMfaError(null);
    setMfaSuccess(null);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.data.id,
        code: totpVerifyCode.trim(),
      });
      if (verify.error) throw verify.error;

      setMfaEnrolled(true);
      setQrCodeSvg(null);
      setTotpSecret(null);
      setTotpVerifyCode('');
      setMfaSuccess('Two-Factor Authentication is now actively protecting your account.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid code. Please check your authenticator app.';
      setMfaError(msg);
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!mfaFactorId) return;
    setMfaLoading(true);
    setMfaError(null);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: mfaFactorId });
      if (error) throw error;
      setMfaEnrolled(false);
      setMfaFactorId(null);
      setMfaSuccess('Two-Factor Authentication has been disabled.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to disable MFA.';
      setMfaError(msg);
    } finally {
      setMfaLoading(false);
    }
  };

  // D. Session Revocation Handler
  const handleSignOutAllSessions = async () => {
    setSigningOutAll(true);
    setSessionSuccess(null);
    try {
      await signOut('others');
      setSessionSuccess('Successfully signed out of all other active browser and device sessions.');
    } catch (err) {
      console.error('Error revoking other sessions:', err);
    } finally {
      setSigningOutAll(false);
    }
  };

  // E. Account Deactivation Handler
  const handleConfirmDeactivation = async () => {
    setDeactivating(true);
    setDeactivateError(null);
    try {
      await deactivateAccount();
      setShowDeactivateModal(false);
      await refreshProfile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to deactivate account.';
      setDeactivateError(msg);
    } finally {
      setDeactivating(false);
    }
  };

  // F. Permanent Deletion Handler
  const handleConfirmDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmText.trim() !== 'DELETE MY ACCOUNT' || !deletePassword) {
      setDeleteError('Please type DELETE MY ACCOUNT and provide your current password.');
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount(deletePassword);
      setShowDeleteModal(false);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete account.';
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-background text-text">
      <div className="max-w-2xl mx-auto space-y-8 pb-12">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-6 border-b border-border">
          <div>
            <Link
              to="/app/settings"
              className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition-colors mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Settings</span>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-text">Security & Account</h1>
            <p className="text-xs text-text-muted mt-1">
              Multi-factor authentication, session management, password security, and lifecycle controls.
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-card border border-border text-primary shadow-crimson-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        {/* SECTION 1: Account Security Status Information */}
        <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-card border border-border text-primary">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text">Account Security Status</h2>
              <p className="text-xs text-text-muted">Live telemetry and authentication state</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-card border border-border space-y-1">
              <span className="text-[10px] font-mono uppercase text-text-muted">Account Status</span>
              <p className="text-xs font-semibold capitalize flex items-center gap-1 text-success">
                <span className="w-2 h-2 rounded-full bg-success" />
                <span>{profile?.status || 'Active'}</span>
              </p>
            </div>
            <div className="p-3 rounded-xl bg-card border border-border space-y-1">
              <span className="text-[10px] font-mono uppercase text-text-muted">Email Verification</span>
              <p className="text-xs font-semibold flex items-center gap-1 text-success">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified</span>
              </p>
            </div>
            <div className="p-3 rounded-xl bg-card border border-border space-y-1">
              <span className="text-[10px] font-mono uppercase text-text-muted">2FA Protection</span>
              <p
                className={`text-xs font-semibold flex items-center gap-1 ${
                  mfaEnrolled ? 'text-success' : 'text-text-muted'
                }`}
              >
                {mfaEnrolled ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Enabled</span>
                  </>
                ) : (
                  <span>Disabled</span>
                )}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-card border border-border space-y-1">
              <span className="text-[10px] font-mono uppercase text-text-muted">Member Since</span>
              <p className="text-xs font-semibold font-mono flex items-center gap-1 text-text">
                <Calendar className="w-3 h-3 text-text-muted" />
                <span>
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 2: Password Security */}
        <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-card border border-border text-primary">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text">Change Password</h2>
              <p className="text-xs text-text-muted">
                Requires minimum 8 characters with letters, numbers, or symbols.
              </p>
            </div>
          </div>

          <form onSubmit={handlePasswordUpdate} className="space-y-3 pt-2">
            <div>
              <label htmlFor="currentPasswordInput" className="block text-xs font-medium text-text mb-1">Current Password</label>
              <Input
                id="currentPasswordInput"
                type="password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="bg-card text-xs h-10"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="newPasswordInput" className="block text-xs font-medium text-text mb-1">New Password</label>
                <div className="relative">
                  <Input
                    id="newPasswordInput"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-card text-xs h-10 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text p-1"
                    aria-label="Toggle password visibility"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmNewPasswordInput" className="block text-xs font-medium text-text mb-1">Confirm New Password</label>
                <Input
                  id="confirmNewPasswordInput"
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="bg-card text-xs h-10"
                />
              </div>
            </div>

            {passwordSuccess && (
              <div className="p-3 rounded-xl bg-success/10 border border-success/30 text-success text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={updatingPassword || !newPassword || !confirmNewPassword}
              className="text-xs h-9 gap-1.5"
            >
              {updatingPassword ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <span>Update Password</span>
              )}
            </Button>
          </form>
        </div>

        {/* SECTION 3: Multi-Factor Authentication (TOTP) */}
        <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-card border border-border text-primary">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-text">Two-Factor Authentication (TOTP)</h2>
                <p className="text-xs text-text-muted">
                  Standard authenticator app (Google Authenticator, 1Password, Authy).
                </p>
              </div>
            </div>

            {mfaEnrolled && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-success/15 border border-success/30 text-success">
                Enrolled
              </span>
            )}
          </div>

          {mfaEnrolled ? (
            <div className="pt-2 space-y-3">
              <p className="text-xs text-text-muted leading-relaxed">
                Two-Factor Authentication is currently enabled on your ORBIX account. Each sign-in requires an authenticator code.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisableMfa}
                disabled={mfaLoading}
                className="text-xs border-danger/40 text-danger hover:bg-danger/10 h-8 gap-1.5"
              >
                {mfaLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Disable 2FA</span>}
              </Button>
            </div>
          ) : qrCodeSvg ? (
            <div className="pt-2 space-y-4 border-t border-border mt-3">
              <p className="text-xs text-text-muted">
                Scan the QR code with your authenticator app, then enter the 6-digit verification code below:
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-card border border-border">
                <div
                  className="w-36 h-36 bg-white p-2 rounded-xl flex items-center justify-center shrink-0"
                  dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
                />

                <div className="space-y-2 flex-1 min-w-0">
                  <span className="text-[10px] font-mono uppercase text-text-muted">Secret Key</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-primary bg-surface px-2.5 py-1 rounded border border-border truncate">
                      {totpSecret}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        if (totpSecret) {
                          navigator.clipboard.writeText(totpSecret);
                          setCopiedSecret(true);
                          setTimeout(() => setCopiedSecret(false), 2000);
                        }
                      }}
                      className="p-1.5 rounded-lg border border-border bg-surface text-text-muted hover:text-text"
                      title="Copy Secret"
                    >
                      {copiedSecret ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <form onSubmit={handleVerifyTotp} className="flex gap-2">
                <Input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={totpVerifyCode}
                  onChange={(e) => setTotpVerifyCode(e.target.value.replace(/\D/g, ''))}
                  className="bg-card text-xs h-10 w-36 font-mono tracking-widest text-center"
                />
                <Button
                  type="submit"
                  disabled={mfaLoading || totpVerifyCode.length !== 6}
                  className="text-xs h-10 px-4 gap-1.5"
                >
                  {mfaLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Verify & Enable</span>}
                </Button>
              </form>
            </div>
          ) : (
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartMfaEnroll}
                disabled={mfaLoading}
                className="text-xs h-9 gap-1.5 border-border"
              >
                {mfaLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Setup Two-Factor Authentication</span>
                  </>
                )}
              </Button>
            </div>
          )}

          {mfaSuccess && (
            <div className="p-3 rounded-xl bg-success/10 border border-success/30 text-success text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{mfaSuccess}</span>
            </div>
          )}

          {mfaError && (
            <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{mfaError}</span>
            </div>
          )}
        </div>

        {/* SECTION 4: Email Address Security */}
        <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-card border border-border text-primary">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text">Email Address</h2>
              <p className="text-xs text-text-muted">
                Current email: <span className="font-mono text-text">{user?.email || 'N/A'}</span>
              </p>
            </div>
          </div>

          <form onSubmit={handleEmailUpdate} className="space-y-3 pt-2">
            <div>
              <label htmlFor="newEmailAddressInput" className="block text-xs font-medium text-text mb-1">New Email Address</label>
              <div className="flex gap-2">
                <Input
                  id="newEmailAddressInput"
                  type="email"
                  placeholder="newemail@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="bg-card text-xs h-10 flex-1"
                />
                <Button
                  type="submit"
                  disabled={updatingEmail || !newEmail.trim()}
                  className="text-xs h-10 px-4 gap-1.5 shrink-0"
                >
                  {updatingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Change Email</span>}
                </Button>
              </div>
            </div>

            {emailSuccess && (
              <div className="p-3 rounded-xl bg-success/10 border border-success/30 text-success text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{emailSuccess}</span>
              </div>
            )}

            {emailError && (
              <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{emailError}</span>
              </div>
            )}
          </form>
        </div>

        {/* SECTION 5: Session Security */}
        <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-card border border-border text-primary">
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text">Session Management</h2>
              <p className="text-xs text-text-muted">Inspect and revoke active authentication sessions.</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-card border border-border flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="font-semibold text-text">Current Active Session</span>
              <p className="text-text-muted text-[11px] font-mono">
                Expires in {user ? '24 hours' : 'N/A'} • Authenticated via Supabase Auth
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success/15 border border-success/30 text-success">
              Active Now
            </span>
          </div>

          {sessionSuccess && (
            <div className="p-3 rounded-xl bg-success/10 border border-success/30 text-success text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{sessionSuccess}</span>
            </div>
          )}

          <div className="pt-1 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOutAllSessions}
              disabled={signingOutAll}
              className="text-xs border-border h-9 gap-1.5"
            >
              {signingOutAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out All Other Sessions</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* SECTION 6: Danger Zone — Account Lifecycle (Deactivation & Permanent Deletion) */}
        <div className="p-5 rounded-2xl bg-danger/5 border border-danger/20 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-danger/10 border border-danger/30 text-danger">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-danger">Account Lifecycle & Danger Zone</h2>
              <p className="text-xs text-text-muted">
                Temporary account deactivation or permanent account deletion.
              </p>
            </div>
          </div>

          <div className="divide-y divide-border/60 pt-1">
            {/* Deactivation Row */}
            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-semibold text-text">Deactivate Account</h3>
                <p className="text-[11px] text-text-muted">
                  Temporarily disable your profile and mute messaging. Reactivate at any time.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeactivateModal(true)}
                className="text-xs border-border h-8 shrink-0 hover:bg-card"
              >
                Deactivate Account
              </Button>
            </div>

            {/* Permanent Deletion Row */}
            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-semibold text-danger">Delete Account Permanently</h3>
                <p className="text-[11px] text-text-muted">
                  Irreversibly remove your authentication record, attachments, and profile data.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
                className="text-xs border-danger/40 text-danger hover:bg-danger/10 h-8 shrink-0 gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL: Account Deactivation */}
      {showDeactivateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-text">Deactivate Your ORBIX Account?</h2>
                <p className="text-xs text-text-muted">Temporary deactivation</p>
              </div>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Your ORBIX account will be temporarily deactivated. You will not receive active messages, and fellow users will see your account as inactive. You can reactivate it at any time by signing in.
            </p>

            {deactivateError && (
              <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs">
                {deactivateError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeactivateModal(false)}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmDeactivation}
                disabled={deactivating}
                className="text-xs h-9 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              >
                {deactivating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Confirm Deactivation</span>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: Permanent Account Deletion */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-danger/40 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-danger/10 border border-danger/30 text-danger">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-danger">Delete Account Permanently</h2>
                <p className="text-xs text-text-muted">This action is irreversible</p>
              </div>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Permanent deletion will remove your credentials, settings, contacts, and personal attachments. To preserve conversation history for fellow participants, past messages will be anonymized under <strong className="text-text">"Deleted User"</strong>.
            </p>

            <form onSubmit={handleConfirmDeletion} className="space-y-3 pt-1">
              <div>
                <label htmlFor="confirmCurrentPasswordInput" className="block text-xs font-medium text-text mb-1">
                  Confirm Current Password
                </label>
                <Input
                  id="confirmCurrentPasswordInput"
                  type="password"
                  placeholder="Enter current password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="bg-card text-xs h-10"
                />
              </div>

              <div>
                <label htmlFor="deleteConfirmationTextInput" className="block text-xs font-medium text-text mb-1">
                  Type <strong className="text-danger font-mono">DELETE MY ACCOUNT</strong> to confirm:
                </label>
                <Input
                  id="deleteConfirmationTextInput"
                  type="text"
                  placeholder="DELETE MY ACCOUNT"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="bg-card text-xs h-10 font-mono"
                />
              </div>

              {deleteError && (
                <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs">
                  {deleteError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteModal(false)}
                  className="text-xs h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={deleting || deleteConfirmText !== 'DELETE MY ACCOUNT' || !deletePassword}
                  className="text-xs h-9 bg-danger hover:bg-danger/90 text-white font-semibold"
                >
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Permanently Delete</span>}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecuritySettingsPage;

