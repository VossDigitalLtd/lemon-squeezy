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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Data & Privacy</h1>
        <p className="text-muted-foreground mt-1">Download a copy of your data or permanently delete your account.</p>
      </div>

      {/* Export */}
      <div className="bg-card rounded-xl border border-border shadow-card p-6 mb-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="mt-0.5 h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <Download size={16} className="text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-foreground">Download your data</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Get a copy of your account information as a JSON file.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handleDownload} disabled={downloading} className="w-full sm:w-auto">
          {downloading ? 'Preparing...' : 'Download data'}
        </Button>
      </div>

      {/* Delete account */}
      <div className="bg-card rounded-xl border border-destructive/40 shadow-card p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="mt-0.5 h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <TriangleAlert size={16} className="text-destructive" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-foreground">Delete account</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Permanently delete your account and all associated data. This cannot be undone.
            </p>
          </div>
        </div>
        <Button variant="destructive" onClick={() => { setDeleteOpen(true); setDeleteConfirm(''); setDeleteError(null); }} className="w-full sm:w-auto">
          Delete account
        </Button>
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
            {deleteError && (
              <div className="rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-700">{deleteError}</p>
              </div>
            )}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-foreground">
                Type <span className="font-mono">{user?.email}</span> to confirm
              </label>
              <Input
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
