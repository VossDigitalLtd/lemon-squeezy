'use client';

import { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import Image from 'next/image';
import { Camera, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground mt-1">Update your name and photo.</p>
      </div>

      {/* Photo */}
      <div className="bg-card rounded-xl border border-border shadow-card p-6 mb-6">
        <h2 className="text-sm font-medium text-foreground mb-4">Photo</h2>
        <div className="flex items-center gap-6">
          <div className="relative group">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="relative h-20 w-20 rounded-full overflow-hidden bg-primary text-primary-foreground flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Change photo"
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
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={avatarUploading}>
              <User size={14} />
              {profile?.avatar_url ? 'Change photo' : 'Upload photo'}
            </Button>
            {profile?.avatar_url && (
              <Button type="button" variant="ghost" size="sm" onClick={handleRemoveAvatar} disabled={avatarUploading} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 size={14} />
                Remove
              </Button>
            )}
            <p className="text-xs text-muted-foreground">JPEG, PNG, GIF or WebP · Max 2MB</p>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" className="hidden" onChange={handleAvatarChange} />
      </div>

      {/* Details */}
      <div className="bg-card rounded-xl border border-border shadow-card p-6">
        <h2 className="text-sm font-medium text-foreground mb-4">Details</h2>
        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <div className="space-y-1">
            <label htmlFor="fullName" className="block text-sm font-medium text-foreground">Full name</label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Email</label>
            <Input value={user?.email ?? ''} disabled className="bg-muted text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Contact support to change your email address.</p>
          </div>
          <Button type="submit" disabled={saving || !hasNameChanged} className="w-full sm:w-auto">
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </form>
      </div>
    </div>
  );
}
