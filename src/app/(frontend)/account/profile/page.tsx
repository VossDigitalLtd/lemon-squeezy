'use client';

import { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import Image from 'next/image';
import { Camera, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AccountPageHeader, AccountSection, FormError, FormField, pillButton } from '@/components/account/AccountUI';
import { cn } from '@/utils/cn';
import { useAuth } from '@/lib/supabase/auth';
import { useToast } from '@/hooks/useToast';
import type { Profile } from '@/types';

export default function AccountProfilePage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/profile', { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setProfile(json.data);
          setFullName(json.data.full_name ?? '');
        }
      })
      .finally(() => setLoading(false));
  }, []);

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
      setError(json.error ?? 'Failed to save.');
    } else {
      setProfile(json.data);
      addToast('Profile updated.', 'success');
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
      setError(json.error ?? 'Failed to upload photo.');
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
      setError(json.error ?? 'Failed to remove photo.');
    } else {
      setProfile((prev) => prev ? { ...prev, avatar_url: null, avatar_path: null } : prev);
    }
    setAvatarUploading(false);
  };

  const initials = (profile?.full_name || user?.email || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const hasNameChanged = fullName !== (profile?.full_name ?? '');

  if (loading) {
    return (
      <div className="grid h-60 place-items-center" aria-busy="true">
        <span className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  return (
    <div>
      <AccountPageHeader title="Profile" intro="How you appear on Lemon Squeezy." />

      <div className="grid gap-6">
        {error && <FormError>{error}</FormError>}

        {/* Photo */}
        <AccountSection title="Photo" description="Shown in the top corner when you're signed in.">
          <div className="flex flex-wrap items-center gap-6">
            <div className="relative">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="group relative grid size-24 place-items-center overflow-hidden rounded-full bg-primary text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={profile?.avatar_url ? 'Change photo' : 'Add a photo'}
              >
                {profile?.avatar_url ? (
                  <Image src={profile.avatar_url} alt="" width={96} height={96} className="h-full w-full object-cover" />
                ) : (
                  <span className="font-display text-3xl">{initials}</span>
                )}
                <span className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera size={22} className="text-white" />
                </span>
              </button>
              {avatarUploading && (
                <span className="absolute inset-0 grid place-items-center rounded-full bg-background/70" aria-busy="true">
                  <span className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
                </span>
              )}
            </div>
            <div className="grid gap-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  className={cn(pillButton.base, pillButton.outline)}
                >
                  <Camera size={16} />
                  {profile?.avatar_url ? 'Change photo' : 'Add a photo'}
                </button>
                {profile?.avatar_url && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={avatarUploading}
                    className={cn(pillButton.base, pillButton.ghost, 'text-destructive')}
                  >
                    <Trash2 size={16} />
                    Remove
                  </button>
                )}
              </div>
              <p className="text-[0.8125rem] text-muted-foreground">JPEG, PNG, GIF or WebP, up to 2MB.</p>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" className="hidden" onChange={handleAvatarChange} />
        </AccountSection>

        {/* Details */}
        <AccountSection title="Your details">
          <form onSubmit={handleSave} className="grid max-w-md gap-5">
            <FormField label="Name" htmlFor="fullName">
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" className="h-11" />
            </FormField>
            <FormField label="Email" htmlFor="email" hint="Get in touch with us if you need to change your email address.">
              <Input id="email" value={user?.email ?? ''} disabled className="h-11 bg-muted text-muted-foreground" />
            </FormField>
            <div>
              <button type="submit" disabled={saving || !hasNameChanged} className={cn(pillButton.base, pillButton.primary)}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </AccountSection>
      </div>
    </div>
  );
}
