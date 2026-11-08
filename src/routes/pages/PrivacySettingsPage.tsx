import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { contactService } from '@/services/contactService';
import type { Profile } from '@/services/profileService';

export const PrivacySettingsPage: React.FC = () => {
  const { user, settings, updateSettings } = useAuth();

  const [lastSeen, setLastSeen] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');
  const [onlineStatus, setOnlineStatus] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');
  const [avatarVis, setAvatarVis] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');

  const [blockedUsers, setBlockedUsers] = useState<Profile[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setLastSeen(settings.last_seen_visibility);
      setOnlineStatus(settings.online_status_visibility);
      setAvatarVis(settings.avatar_visibility);
    }
  }, [settings]);

  useEffect(() => {
    if (user) {
      setLoadingBlocks(true);
      contactService
        .getBlockedUsers(user.id)
        .then((res) => setBlockedUsers(res))
        .catch((err) => console.error('Failed to load blocked users:', err))
        .finally(() => setLoadingBlocks(false));
    }
  }, [user]);

  const handleSaveSettings = async (updates: {
    last_seen_visibility?: 'everyone' | 'contacts' | 'nobody';
    online_status_visibility?: 'everyone' | 'contacts' | 'nobody';
    avatar_visibility?: 'everyone' | 'contacts' | 'nobody';
  }) => {
    setSaving(true);
    setSuccessMsg(null);
    try {
      await updateSettings(updates);
      setSuccessMsg('Privacy preference updated.');
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err) {
      console.error('Failed to update privacy settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleUnblock = async (blockedId: string) => {
    if (!user) return;
    try {
      await contactService.unblockUser(user.id, blockedId);
      setBlockedUsers((prev) => prev.filter((p) => p.id !== blockedId));
      setSuccessMsg('User unblocked.');
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err) {
      console.error('Failed to unblock user:', err);
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-background">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link
          to="/app/settings"
          className="inline-flex items-center gap-2 text-xs font-mono text-text-muted hover:text-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Settings</span>
        </Link>

        <div className="pb-6 border-b border-border">
          <h1 className="text-2xl font-bold tracking-tight text-text">Privacy Controls</h1>
          <p className="text-sm text-text-muted mt-1">
            Manage who can see your presence, profile details, and communication history.
          </p>
        </div>

        {successMsg && (
          <div className="p-3 rounded-lg bg-success/10 border border-success/30 text-success text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="p-6 rounded-2xl bg-surface border border-border space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-5 border-b border-border">
            <div>
              <h3 className="text-sm font-semibold text-text">Last Seen Timestamp</h3>
              <p className="text-xs text-text-muted">Control who can see when you were last active</p>
            </div>
            <select
              value={lastSeen}
              disabled={saving}
              onChange={(e) => {
                const val = e.target.value as 'everyone' | 'contacts' | 'nobody';
                setLastSeen(val);
                handleSaveSettings({ last_seen_visibility: val });
              }}
              className="bg-card border border-border rounded-lg text-xs px-3 py-2 text-text focus-visible:outline-primary"
            >
              <option value="everyone">Everyone</option>
              <option value="contacts">Contacts Only</option>
              <option value="nobody">Nobody (Privacy Max)</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-5 border-b border-border">
            <div>
              <h3 className="text-sm font-semibold text-text">Active Online Status</h3>
              <p className="text-xs text-text-muted">Broadcast green online beacon to other users</p>
            </div>
            <select
              value={onlineStatus}
              disabled={saving}
              onChange={(e) => {
                const val = e.target.value as 'everyone' | 'contacts' | 'nobody';
                setOnlineStatus(val);
                handleSaveSettings({ online_status_visibility: val });
              }}
              className="bg-card border border-border rounded-lg text-xs px-3 py-2 text-text focus-visible:outline-primary"
            >
              <option value="everyone">Everyone</option>
              <option value="contacts">Contacts Only</option>
              <option value="nobody">Nobody</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-5 border-b border-border">
            <div>
              <h3 className="text-sm font-semibold text-text">Profile Photo Visibility</h3>
              <p className="text-xs text-text-muted">Restrict avatar display to allowed users</p>
            </div>
            <select
              value={avatarVis}
              disabled={saving}
              onChange={(e) => {
                const val = e.target.value as 'everyone' | 'contacts' | 'nobody';
                setAvatarVis(val);
                handleSaveSettings({ avatar_visibility: val });
              }}
              className="bg-card border border-border rounded-lg text-xs px-3 py-2 text-text focus-visible:outline-primary"
            >
              <option value="everyone">Everyone</option>
              <option value="contacts">Contacts Only</option>
              <option value="nobody">Nobody</option>
            </select>
          </div>

          {/* Blocked Users Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text">Blocked Users Management</h3>
            <p className="text-xs text-text-muted">
              Blocked accounts cannot find, direct message, or invite you to groups.
            </p>

            {loadingBlocks ? (
              <div className="py-4 text-center">
                <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
              </div>
            ) : blockedUsers.length === 0 ? (
              <div className="p-4 rounded-xl bg-card border border-border text-center text-xs text-text-muted">
                No users currently blocked.
              </div>
            ) : (
              <div className="space-y-2">
                {blockedUsers.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 rounded-xl bg-card border border-border flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-danger/10 text-danger flex items-center justify-center font-bold text-xs">
                        {b.display_name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-text">{b.display_name}</p>
                        <p className="text-[10px] text-text-muted">@{b.username}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnblock(b.id)}
                      className="text-xs text-danger hover:bg-danger/10"
                    >
                      Unblock
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border text-xs text-text-muted flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <span>
            Privacy controls are enforced directly in PostgreSQL Row-Level Security policies.
          </span>
        </div>
      </div>
    </div>
  );
};
export default PrivacySettingsPage;
