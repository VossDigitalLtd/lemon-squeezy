'use client';

import { useState } from 'react';
import { Download, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/supabase/auth';
import { useToast } from '@/hooks/useToast';
import { AccountPageHeader, AccountSection, FormError, pillButton } from '@/components/account/AccountUI';
import { cn } from '@/utils/cn';

export default function AccountDataPage() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [downloading, setDownloading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch('/api/profile/export');
      if (!res.ok) {
        addToast('Failed to export data. Please try again.', 'error');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-account-data.json';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

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
    window.location.href = '/';
  };

  return (
    <div>
      <AccountPageHeader title="Data & privacy" intro="Your information is yours. Take a copy, or delete your account." />

      <div className="grid gap-6">
        <AccountSection
          title="Download your data"
          description="A copy of your account details and saved recipes, as a JSON file."
        >
          <button type="button" onClick={handleDownload} disabled={downloading} className={cn(pillButton.base, pillButton.outline)}>
            <Download size={16} />
            {downloading ? 'Preparing…' : 'Download my data'}
          </button>
        </AccountSection>

        <AccountSection
          tone="danger"
          title="Delete your account"
          description="Permanently removes your account, profile and recipe box. This can't be undone."
        >
          <button
            type="button"
            onClick={() => { setDeleteOpen(true); setDeleteConfirm(''); setDeleteError(null); }}
            className={cn(pillButton.base, pillButton.danger)}
          >
            <TriangleAlert size={16} />
            Delete account
          </button>
        </AccountSection>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={(open) => { if (!open) { setDeleteOpen(false); setDeleteConfirm(''); setDeleteError(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete your account</DialogTitle>
            <DialogDescription>
              This will permanently delete your account and all your data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {deleteError && <FormError>{deleteError}</FormError>}
            <div className="space-y-1">
              <label htmlFor="deleteConfirm" className="block text-sm font-medium text-foreground">
                Type <span className="font-mono">{user?.email}</span> to confirm
              </label>
              <Input
                id="deleteConfirm"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={user?.email ?? ''}
                autoComplete="off"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteConfirm !== user?.email || deleting}
              onClick={handleDeleteAccount}
            >
              {deleting ? 'Deleting...' : 'Delete my account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
