'use client';

import { useState, useEffect, FormEvent } from 'react';
import { ShieldCheck, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AccountPageHeader, AccountSection, FormError, FormField, pillButton } from '@/components/account/AccountUI';
import { cn } from '@/utils/cn';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PASSWORD_RULES, validatePassword } from '@/lib/utils/password';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/useToast';
import { createClient } from '@/lib/supabase/client';

export default function AccountSecurityPage() {
  const { addToast } = useToast();

  // ── Password ─────────────────────────────────────────────────────────────
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // ── MFA ──────────────────────────────────────────────────────────────────
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaLoading, setMfaLoading] = useState(true);

  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollStep, setEnrollStep] = useState<1 | 2>(1);
  const [enrollFactorId, setEnrollFactorId] = useState('');
  const [enrollQrCode, setEnrollQrCode] = useState('');
  const [enrollSecret, setEnrollSecret] = useState('');
  const [enrollCode, setEnrollCode] = useState('');
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  const [disableOpen, setDisableOpen] = useState(false);
  const [disabling, setDisabling] = useState(false);

  // ── Sessions ─────────────────────────────────────────────────────────────
  const [signingOutOthers, setSigningOutOthers] = useState(false);

  // ── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.mfa.listFactors().then(({ data, error }) => {
      if (!error && data) {
        const verified = data.totp.find((f) => f.status === 'verified');
        setMfaFactorId(verified?.id ?? null);
      }
      setMfaLoading(false);
    });
  }, []);

  // ── Password handler ──────────────────────────────────────────────────────
  const handlePasswordChange = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError(null);
    const validationError = validatePassword(newPassword);
    if (validationError) { setPasswordError(validationError); return; }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match.'); return; }

    setPasswordSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordError(error.message ?? 'Failed to update password.');
    } else {
      addToast('Password updated.', 'success');
      setNewPassword('');
      setConfirmPassword('');
    }
    setPasswordSaving(false);
  };

  // ── MFA handlers ─────────────────────────────────────────────────────────
  const handleStartEnroll = async () => {
    const supabase = createClient();
    const { data: existing } = await supabase.auth.mfa.listFactors();
    if (existing) {
      for (const factor of existing.all.filter((f) => f.factor_type === 'totp' && f.status === 'unverified')) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    if (error || !data) { addToast(error?.message ?? 'Failed to start 2FA setup.', 'error'); return; }
    setEnrollFactorId(data.id);
    setEnrollQrCode(data.totp.qr_code);
    setEnrollSecret(data.totp.secret);
    setEnrollStep(1);
    setEnrollCode('');
    setEnrollError(null);
    setEnrollOpen(true);
  };

  const handleEnrollClose = async () => {
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
    if (enrollCode.length !== 6) { setEnrollError('Please enter a 6-digit code.'); return; }
    setEnrolling(true);
    setEnrollError(null);
    const supabase = createClient();
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: enrollFactorId });
    if (challengeError || !challenge) {
      setEnrollError(challengeError?.message ?? 'Failed to create challenge.');
      setEnrolling(false);
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: enrollFactorId, challengeId: challenge.id, code: enrollCode });
    if (verifyError) {
      setEnrollError('Invalid code. Please check your authenticator app and try again.');
      setEnrolling(false);
      return;
    }
    setMfaFactorId(enrollFactorId);
    setEnrollOpen(false);
    setEnrollFactorId('');
    addToast('Two-factor sign-in is on.', 'success');
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
      addToast('Two-factor sign-in is off.', 'success');
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
      addToast('Signed out of all other devices.', 'success');
    }
    setSigningOutOthers(false);
  };

  return (
    <div>
      <AccountPageHeader title="Security" intro="Keep your account safe. You won't need these often." />

      <div className="grid gap-6">
        {/* Password */}
        <AccountSection title="Password" description="Choose a new password. You'll stay signed in on this device.">
          <form onSubmit={handlePasswordChange} className="grid max-w-md gap-5">
            {passwordError && <FormError>{passwordError}</FormError>}
            <FormField label="New password" htmlFor="newPassword">
              <PasswordInput id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
              {newPassword.length > 0 && (
                <ul className="mt-1.5 grid gap-1">
                  {PASSWORD_RULES.map((rule) => {
                    const met = rule.test(newPassword);
                    return (
                      <li key={rule.id} className={cn('flex items-center gap-1.5 text-[0.8125rem]', met ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground')}>
                        <Check size={13} className={met ? 'opacity-100' : 'opacity-30'} />
                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
              )}
            </FormField>
            <FormField label="Confirm new password" htmlFor="confirmPassword">
              <PasswordInput id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
            </FormField>
            <div>
              <button type="submit" disabled={passwordSaving || !newPassword || !confirmPassword} className={cn(pillButton.base, pillButton.primary)}>
                {passwordSaving ? 'Updating…' : 'Update password'}
              </button>
            </div>
          </form>
        </AccountSection>

        {/* 2FA */}
        <AccountSection
          title="Two-factor sign-in"
          description={
            mfaFactorId ? (
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-green-700 dark:text-green-400" />
                On. Signing in also asks for a code from your authenticator app.
              </span>
            ) : (
              'Ask for a code from an authenticator app as well as your password when you sign in.'
            )
          }
          action={
            !mfaLoading &&
            (mfaFactorId ? (
              <button type="button" onClick={() => setDisableOpen(true)} className={cn(pillButton.base, pillButton.outline)}>
                Turn off
              </button>
            ) : (
              <button type="button" onClick={handleStartEnroll} className={cn(pillButton.base, pillButton.primary)}>
                Turn on
              </button>
            ))
          }
        />

        {/* Sessions */}
        <AccountSection
          title="Other devices"
          description="Signed in somewhere you no longer use, like an old phone or a shared computer? Sign out everywhere except here."
        >
          <button type="button" onClick={handleSignOutOthers} disabled={signingOutOthers} className={cn(pillButton.base, pillButton.outline)}>
            {signingOutOthers ? 'Signing out…' : 'Sign out of other devices'}
          </button>
        </AccountSection>
      </div>

      {/* 2FA Enrollment dialog */}
      <Dialog open={enrollOpen} onOpenChange={(open) => { if (!open) handleEnrollClose(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Turn on two-factor sign-in</DialogTitle>
            <DialogDescription>
              {enrollStep === 1
                ? 'Scan this QR code with your authenticator app (e.g. Google Authenticator, Authy).'
                : 'Enter the 6-digit code from your authenticator app to confirm setup.'}
            </DialogDescription>
          </DialogHeader>

          {enrollStep === 1 ? (
            <div className="space-y-4">
              {enrollQrCode && (
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={enrollQrCode} alt="2FA QR code" className="w-48 h-48 rounded-lg border border-border" />
                </div>
              )}
              {enrollSecret && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground text-center">Can&apos;t scan? Enter this code manually:</p>
                  <code className="block text-center text-xs font-mono bg-muted px-3 py-2 rounded-md break-all">{enrollSecret}</code>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {enrollError && <FormError>{enrollError}</FormError>}
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={enrollCode}
                onChange={(e) => setEnrollCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full text-center text-2xl font-mono tracking-widest border border-input rounded-lg px-4 py-3 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={handleEnrollClose}>Cancel</Button>
            {enrollStep === 1 ? (
              <Button onClick={() => setEnrollStep(2)}>Continue</Button>
            ) : (
              <Button onClick={handleVerifyEnroll} disabled={enrolling || enrollCode.length !== 6}>
                {enrolling ? 'Checking…' : 'Turn on'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable 2FA dialog */}
      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Turn off two-factor sign-in?</DialogTitle>
            <DialogDescription>
              You&rsquo;ll only need your password to sign in. You can turn it back on at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setDisableOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDisable} disabled={disabling}>
              {disabling ? 'Turning off…' : 'Turn off'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
