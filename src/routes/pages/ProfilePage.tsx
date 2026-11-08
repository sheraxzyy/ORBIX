import React, { useState, useEffect, useRef } from 'react';
import { Camera, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { profileService } from '@/services/profileService';

export const ProfilePage: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const cleanUsername = username.toLowerCase().trim();

    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      setErrorMsg('Username must be between 3 and 30 characters.');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      setErrorMsg('Username can only contain letters, numbers, and underscores.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await profileService.updateProfile(user.id, {
        display_name: displayName.trim(),
        username: cleanUsername,
        bio: bio.trim(),
        avatar_url: avatarUrl,
      });
      await refreshProfile();
      setSuccessMsg('Profile updated successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    setErrorMsg(null);

    try {
      const url = await profileService.uploadAvatar(user.id, file);
      setAvatarUrl(url);
      await profileService.updateProfile(user.id, { avatar_url: url });
      await refreshProfile();
      setSuccessMsg('Avatar updated!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Avatar upload failed:', err);
      setErrorMsg('Failed to upload avatar. Supabase Storage bucket may not be initialized.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-background">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="pb-6 border-b border-border">
          <h1 className="text-2xl font-bold tracking-tight text-text">Profile</h1>
          <p className="text-sm text-text-muted mt-1">
            Manage your personal identity and avatar visible across conversations.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs leading-relaxed">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg bg-success/10 border border-success/30 text-success text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Avatar Section */}
        <div className="flex items-center gap-5 p-5 rounded-2xl bg-surface border border-border">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName || 'Avatar'}
                className="w-20 h-20 rounded-full object-cover border-2 border-primary/40 shadow-crimson-sm"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center font-bold text-2xl text-primary shadow-crimson-sm">
                {(displayName || 'User').substring(0, 2).toUpperCase()}
              </div>
            )}

            <button
              type="button"
              disabled={uploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 rounded-full bg-card border border-border text-text hover:text-primary transition-colors focus-visible:outline-primary shadow-sm"
              title="Change Profile Picture"
              aria-label="Upload Avatar"
            >
              {uploadingAvatar ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-text">{displayName || 'User'}</h3>
            <p className="text-xs text-text-muted">@{username || 'handle'}</p>
            <p className="text-[11px] font-mono text-success">Verified Authenticated Session</p>
          </div>
        </div>

        {/* Profile Attributes Form */}
        <form onSubmit={handleSave} className="p-6 rounded-2xl bg-surface border border-border space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="displayName" className="block text-xs font-medium text-text">
              Display Name
            </label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Elena Rostova"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="username" className="block text-xs font-medium text-text">
              Username
            </label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. elena_rostova"
              required
            />
            <p className="text-[10px] text-text-muted font-mono">
              Unique handle used for direct messaging and discovery.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="bio" className="block text-xs font-medium text-text">
              Bio / Status
            </label>
            <Input
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. Connected beyond limits."
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-text">Account Email (Private)</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={user?.email || 'N/A'}
                disabled
                className="pl-9 text-text-muted bg-card/60 cursor-not-allowed"
              />
            </div>
            <p className="text-[10px] text-text-muted font-mono">
              Guaranteed private: Never queryable by other users or exposed in public profile views.
            </p>
          </div>

          <div className="pt-2">
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </span>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default ProfilePage;
