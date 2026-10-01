'use client';

import { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import Image from 'next/image';
import { Camera, Trash2, User, ShieldCheck, TriangleAlert, Monitor, Download, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PASSWORD_RULES, validatePassword } from '@/lib/utils/password';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/supabase/auth';
import { useAdminRole } from '@/app/admin/context';
import { useToast } from '@/hooks/useToast';
import { createClient } from '@/lib/supabase/client';
import { ROLE_LABELS } from '@/lib/config/app';
import type { Profile } from '@/types';

const ROLE_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  user: 'secondary',
  editor: 'outline',
  admin: 'default',
  super_admin: 'destructive',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { role } = useAdminRole();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Profile ──────────────────────────────────────────────────────────────
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Password ─────────────────────────────────────────────────────────────
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // ── MFA ──────────────────────────────────────────────────────────────────
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaLoading, setMfaLoading] = useState(true);

  // Enrollment dialog
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollStep, setEnrollStep] = useState<1 | 2>(1);
  const [enrollFactorId, setEnrollFactorId] = useState('');
  const [enrollQrCode, setEnrollQrCode] = useState('');
  const [enrollSecret, setEnrollSecret] = useState('');
  const [enrollCode, setEnrollCode] = useState('');
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  // Disable dialog
  const [disableOpen, setDisableOpen] = useState(false);
  const [disabling, setDisabling] = useState(false);

  // ── Sessions ──────────────────────────────────────────────────────────────
  const [signingOutOthers, setSigningOutOthers] = useState(false);

  // ── Account deletion ──────────────────────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ── Data fetching ─────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      // Fetch profile and MFA status in parallel
      const supabase = createClient();
      const [profileRes, mfaRes] = await Promise.all([
        fetch('/api/profile', { cache: 'no-store' }),
        supabase.auth.mfa.listFactors(),
      ]);

      const profileJson = await profileRes.json();
      if (profileJson.data) {
        setProfile(profileJson.data);
        setFullName(profileJson.data.full_name ?? '');

      }
      setLoading(false);

      if (!mfaRes.error) {
        const verified = mfaRes.data.totp.find((f) => f.status === 'verified');
        setMfaFactorId(verified?.id ?? null);
      }
      setMfaLoading(false);
    }
    init();
  }, []);

  // ── Profile handlers ──────────────────────────────────────────────────────

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: fullName }),
    });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? 'Failed to save');
    } else {
      setProfile(json.data);
      addToast('Profile updated successfully.', 'success');
    }
    setSaving(false);
  };

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/profile/avatar', { method: 'POST', body: formData });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? 'Failed to upload avatar');
    } else {
      setProfile(json.data);
    }

    setAvatarUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAvatar = async () => {
    setAvatarUploading(true);
    setError(null);

    const res = await fetch('/api/profile/avatar', { method: 'DELETE' });

    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? 'Failed to remove avatar');
    } else {
      setProfile((prev) => prev ? { ...prev, avatar_url: null, avatar_path: null } : prev);
    }

    setAvatarUploading(false);
  };

  // ── Password handler ──────────────────────────────────────────────────────

  const handlePasswordChange = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError(null);

    const validationError = validatePassword(newPassword);
    if (validationError) {
      setPasswordError(validationError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
      setPasswordError(updateError.message ?? 'Failed to update password.');
    } else {
      addToast('Password updated successfully.', 'success');
      setNewPassword('');
      setConfirmPassword('');
    }
    setPasswordSaving(false);
  };

  // ── MFA handlers ──────────────────────────────────────────────────────────

  const handleStartEnroll = async () => {
    const supabase = createClient();

    // Clean up any leftover unverified factors before starting fresh
    const { data: existing } = await supabase.auth.mfa.listFactors();
    if (existing) {
      for (const factor of existing.all.filter((f) => f.factor_type === 'totp' && f.status === 'unverified')) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
    }

    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });

    if (error || !data) {
      addToast(error?.message ?? 'Failed to start 2FA setup.', 'error');
      return;
    }

    setEnrollFactorId(data.id);
    setEnrollQrCode(data.totp.qr_code);
    setEnrollSecret(data.totp.secret);
    setEnrollStep(1);
    setEnrollCode('');
    setEnrollError(null);
    setEnrollOpen(true);
  };

  const handleEnrollClose = async () => {
    // Clean up the unverified factor if enrollment was abandoned
    if (enrollFactorId) {
      const supabase = createClient();
      supabase.auth.mfa.unenroll({ factorId: enrollFactorId });
    }
    setEnrollOpen(false);
    setEnrollFactorId('');
    setEnrollQrCode('');
    setEnrollSecret('');
    setEnrollCode('');
    setEnrollError(null);
    setEnrollStep(1);
  };

  const handleVerifyEnroll = async () => {
    if (enrollCode.length !== 6) {
      setEnrollError('Please enter a 6-digit code.');
      return;
    }

    setEnrolling(true);
    setEnrollError(null);

    const supabase = createClient();

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: enrollFactorId,
    });

    if (challengeError || !challenge) {
      setEnrollError(challengeError?.message ?? 'Failed to create verification challenge.');
      setEnrolling(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: enrollFactorId,
      challengeId: challenge.id,
      code: enrollCode,
    });

    if (verifyError) {
      setEnrollError('Invalid code. Please check your authenticator app and try again.');
      setEnrolling(false);
      return;
    }

    // Success — factor is now verified
    setMfaFactorId(enrollFactorId);
    setEnrollOpen(false);
    setEnrollFactorId('');
    addToast('Two-factor authentication enabled.', 'success');
    setEnrolling(false);
  };

  const handleDisable = async () => {
    if (!mfaFactorId) return;
    setDisabling(true);

    const supabase = createClient();
    const { error } = await supabase.auth.mfa.unenroll({ factorId: mfaFactorId });

    if (error) {
      addToast(error.message ?? 'Failed to disable 2FA.', 'error');
    } else {
      setMfaFactorId(null);
      setDisableOpen(false);
      addToast('Two-factor authentication disabled.', 'success');
    }
    setDisabling(false);
  };

  // ── Session handler ───────────────────────────────────────────────────────

  const handleSignOutOthers = async () => {
    setSigningOutOthers(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut({ scope: 'others' });
    if (error) {
      addToast(error.message ?? 'Failed to sign out other sessions.', 'error');
    } else {
      addToast('All other sessions have been signed out.', 'success');
    }
    setSigningOutOthers(false);
  };



  // ── Account deletion handler ──────────────────────────────────────────────

  const handleDeleteAccount = async () => {
    setDeleteError(null);
    setDeleting(true);

    const res = await fetch('/api/profile', { method: 'DELETE' });

    if (!res.ok) {
      const json = await res.json();
      setDeleteError(json.error ?? 'Failed to delete account. Please try again.');
      setDeleting(false);
      return;
    }

    // Session is gone — redirect to login
    window.location.href = '/login';
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const initials = (profile?.full_name || user?.email || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const hasNameChanged = fullName !== (profile?.full_name ?? '');

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account details.</p>
      </div>

      {/* Avatar */}
      <div className="bg-card rounded-xl border border-border shadow-card p-6 mb-6">
        <h2 className="text-sm font-medium text-foreground mb-4">Photo</h2>
        <div className="flex items-center gap-6">
          <div className="relative group">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="relative h-20 w-20 rounded-full overflow-hidden bg-primary text-primary-foreground flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Change avatar"
            >
              {profile?.avatar_url ? (
                <Image src={profile.avatar_url} alt="Avatar" width={80} height={80} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl font-semibold">{initials}</span>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={20} className="text-white" />
              </div>
            </button>
            {avatarUploading && (
              <div className="absolute inset-0 rounded-full flex items-center justify-center bg-white/70">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
            >
              <User size={14} />
              {profile?.avatar_url ? 'Change photo' : 'Upload photo'}
            </Button>
            {profile?.avatar_url && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveAvatar}
                disabled={avatarUploading}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 size={14} />
                Remove
              </Button>
            )}
            <p className="text-xs text-muted-foreground">JPEG, PNG, GIF or WebP · Max 2MB</p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </div>

      {/* Details */}
      <div className="bg-card rounded-xl border border-border shadow-card p-6 mb-6">
        <h2 className="text-sm font-medium text-foreground mb-4">Details</h2>
        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <div className="space-y-1">
            <label htmlFor="fullName" className="block text-sm font-medium text-foreground">
              Full name
            </label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Email</label>
            <Input value={user?.email ?? ''} disabled className="bg-muted text-muted-foreground" />
          </div>
          <Button type="submit" disabled={saving || !hasNameChanged} className="w-full sm:w-auto">
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </form>
      </div>

      {/* Account */}
      <div className="bg-card rounded-xl border border-border shadow-card p-6 mb-6">
        <h2 className="text-sm font-medium text-foreground mb-4">Account</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Role</span>
            <Badge variant={ROLE_VARIANTS[role ?? 'user']}>
              {ROLE_LABELS[role ?? 'user']}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Member since</span>
            <span className="text-foreground">
              {profile?.created_at ? formatDate(profile.created_at) : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Security — password */}
      <div className="bg-card rounded-xl border border-border shadow-card p-6 mb-6">
        <h2 className="text-sm font-medium text-foreground mb-4">Security</h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          {passwordError && (
            <div className="rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-700">{passwordError}</p>
            </div>
          )}
          <div className="space-y-1">
            <label htmlFor="newPassword" className="block text-sm font-medium text-foreground">
              New password
            </label>
            <PasswordInput
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
            {newPassword.length > 0 && (
              <ul className="mt-2 space-y-1">
                {PASSWORD_RULES.map((rule) => {
                  const met = rule.test(newPassword);
                  return (
                    <li key={rule.id} className={`flex items-center gap-1.5 text-xs ${met ? 'text-green-600' : 'text-muted-foreground'}`}>
                      <Check size={11} className={met ? 'opacity-100' : 'opacity-30'} />
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="space-y-1">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
              Confirm new password
            </label>
            <PasswordInput
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
          <Button
            type="submit"
            disabled={passwordSaving || !newPassword || !confirmPassword}
            className="w-full sm:w-auto"
          >
            {passwordSaving ? 'Updating...' : 'Update password'}
          </Button>
        </form>
      </div>

      {/* Two-factor authentication */}
      <div className="bg-card rounded-xl border border-border shadow-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={16} className={mfaFactorId ? 'text-green-600' : 'text-muted-foreground'} />
            </div>
            <div>
              <h2 className="text-sm font-medium text-foreground">Two-factor authentication</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {mfaFactorId
                  ? 'Your account is protected with an authenticator app.'
                  : 'Add an extra layer of security using an authenticator app.'}
              </p>
            </div>
          </div>

          {mfaLoading ? (
            <div className="h-8 w-24 bg-muted animate-pulse rounded-md flex-shrink-0" />
          ) : mfaFactorId ? (
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full whitespace-nowrap">
                Enabled
              </span>
              <Button variant="outline" size="sm" onClick={() => setDisableOpen(true)}>
                Disable
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="flex-shrink-0" onClick={handleStartEnroll}>
              Enable 2FA
            </Button>
          )}
        </div>
      </div>

      {/* Sessions */}
      <div className="bg-card rounded-xl border border-border shadow-card p-6 mt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Monitor size={16} className="text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-foreground">Active sessions</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Signed in on this device. Sign out all other browsers or devices where your account is active.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="flex-shrink-0"
            onClick={handleSignOutOthers}
            disabled={signingOutOthers}
          >
            {signingOutOthers ? 'Signing out...' : 'Sign out others'}
          </Button>
        </div>
      </div>

      {/* Your data */}
      <div className="bg-card rounded-xl border border-border shadow-card p-6 mt-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <Download size={16} className="text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-medium text-foreground">Your data</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Download a copy of all data associated with your account as a JSON file.
            </p>
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a href="/api/profile/export" download>
                  <Download size={14} />
                  Download my data
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-card rounded-xl border border-destructive/30 shadow-card p-6 mt-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="mt-0.5 h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <TriangleAlert size={16} className="text-destructive" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-foreground">Danger Zone</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Permanently delete your account and all associated data. This cannot be undone.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-destructive/50 text-destructive hover:bg-destructive hover:text-white"
          onClick={() => { setDeleteConfirm(''); setDeleteError(null); setDeleteOpen(true); }}
        >
          Delete my account
        </Button>
      </div>

      {/* ── Enrollment Dialog ─────────────────────────────────────────────── */}
      <Dialog open={enrollOpen} onOpenChange={(o) => !o && handleEnrollClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set up two-factor authentication</DialogTitle>
            <DialogDescription>
              {enrollStep === 1
                ? 'Scan the QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.).'
                : 'Enter the 6-digit code shown in your authenticator app to confirm setup.'}
            </DialogDescription>
          </DialogHeader>

          {enrollStep === 1 && (
            <div className="space-y-4 pt-1">
              <div className="flex justify-center">
                <div className="p-3 bg-white border border-border rounded-lg inline-block">
                  {/* Supabase returns a base64 SVG data URI — next/image doesn't support data: URIs */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={enrollQrCode} alt="2FA QR code" className="h-44 w-44" />
                </div>
              </div>
              <div className="rounded-md bg-muted p-3">
                <p className="text-xs text-muted-foreground mb-1.5">Can&apos;t scan? Enter this key manually:</p>
                <p className="text-xs font-mono font-semibold text-foreground tracking-widest break-all select-all">
                  {enrollSecret}
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleEnrollClose}>
                  Cancel
                </Button>
                <Button onClick={() => { setEnrollCode(''); setEnrollError(null); setEnrollStep(2); }}>
                  Next
                </Button>
              </DialogFooter>
            </div>
          )}

          {enrollStep === 2 && (
            <div className="space-y-4 pt-1">
              {enrollError && (
                <div className="rounded-md bg-red-50 p-3">
                  <p className="text-sm text-red-700">{enrollError}</p>
                </div>
              )}
              <div className="space-y-1">
                <label htmlFor="enrollCode" className="block text-sm font-medium text-foreground">
                  Verification code
                </label>
                <Input
                  id="enrollCode"
                  value={enrollCode}
                  onChange={(e) => setEnrollCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000 000"
                  maxLength={6}
                  autoFocus
                  className="text-center text-xl tracking-[0.4em] font-mono"
                  onKeyDown={(e) => e.key === 'Enter' && enrollCode.length === 6 && handleVerifyEnroll()}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => { setEnrollStep(1); setEnrollError(null); }}
                  disabled={enrolling}
                >
                  Back
                </Button>
                <Button
                  onClick={handleVerifyEnroll}
                  disabled={enrolling || enrollCode.length !== 6}
                >
                  {enrolling ? 'Verifying...' : 'Enable 2FA'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Disable Confirmation Dialog ───────────────────────────────────── */}
      <Dialog open={disableOpen} onOpenChange={(o) => !o && !disabling && setDisableOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Disable two-factor authentication</DialogTitle>
            <DialogDescription>
              Your account will no longer require a verification code when signing in.
              You can re-enable 2FA at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDisableOpen(false)}
              disabled={disabling}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDisable} disabled={disabling}>
              {disabling ? 'Disabling...' : 'Disable 2FA'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Account Dialog ─────────────────────────────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={(o) => !o && !deleting && setDeleteOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete account</DialogTitle>
            <DialogDescription>
              This will permanently delete your account and all associated data.
              This action <strong>cannot be undone</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {deleteError && (
              <div className="rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-700">{deleteError}</p>
              </div>
            )}
            <div className="space-y-1">
              <label htmlFor="deleteConfirm" className="block text-sm font-medium text-foreground">
                Type your email address to confirm
              </label>
              <Input
                id="deleteConfirm"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={user?.email ?? ''}
                autoComplete="off"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleting || deleteConfirm !== user?.email}
            >
              {deleting ? 'Deleting...' : 'Delete my account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
