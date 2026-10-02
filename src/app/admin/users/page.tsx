'use client';

import { useState, useEffect, useCallback, FormEvent, ChangeEvent } from 'react';
import Image from 'next/image';
import { Search, UserPlus, Pencil, Trash2, ChevronLeft, ChevronRight, X, RefreshCw, Download } from 'lucide-react';
import { downloadCsv } from '@/lib/csv';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAdminRole } from '@/app/admin/context';
import { useAuth } from '@/lib/supabase/auth';
import { useToast } from '@/hooks/useToast';
import useDebounce from '@/hooks/useDebounce';
import { ROLE_LABELS, ROLE_DESCRIPTIONS, ADMIN_ASSIGNABLE_ROLES, VALID_ROLES } from '@/lib/config/app';
import type { ValidRole } from '@/lib/config/app';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  avatar_url: string | null;
  created_at: string;
  last_login_at: string | null;
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  invited_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLE_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  user: 'secondary',
  editor: 'outline',
  admin: 'default',
  super_admin: 'destructive',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(dateStr);
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function UserAvatar({ user }: { user: UserRow }) {
  const initials = (user.full_name || user.email || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="h-8 w-8 rounded-full overflow-hidden bg-primary flex items-center justify-center flex-shrink-0">
      {user.avatar_url ? (
        <Image src={user.avatar_url} alt="" width={32} height={32} className="h-full w-full object-cover" />
      ) : (
        <span className="text-xs font-semibold text-white">{initials}</span>
      )}
    </div>
  );
}

function RoleSelect({
  value,
  onChange,
  callerRole,
}: {
  value: string;
  onChange: (role: string) => void;
  callerRole: string | null;
}) {
  const assignable: ValidRole[] =
    callerRole === 'super_admin' ? [...VALID_ROLES] : ADMIN_ASSIGNABLE_ROLES;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {assignable.map((r) => (
          <SelectItem key={r} value={r} className="py-2">
            <span className="grid">
              <span>{ROLE_LABELS[r] ?? r}</span>
              {ROLE_DESCRIPTIONS[r] && (
                <span className="text-xs text-muted-foreground in-data-[slot=select-value]:hidden">{ROLE_DESCRIPTIONS[r]}</span>
              )}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ---------------------------------------------------------------------------
// Invite Modal
// ---------------------------------------------------------------------------

interface InviteModalProps {
  open: boolean;
  callerRole: string | null;
  onClose: () => void;
  onSuccess: (user: UserRow) => void;
  onPendingCreated: (invite: PendingInvite) => void;
}

function InviteModal({ open, callerRole, onClose, onSuccess, onPendingCreated }: InviteModalProps) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<string>('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setEmail('');
    setFullName('');
    setRole('user');
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, full_name: fullName || undefined, role }),
    });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? 'Failed to invite user');
    } else {
      // Invited users are pending until they accept — add to pending list
      onPendingCreated({
        id: json.data.id,
        email: json.data.email,
        role: json.data.role ?? role,
        invited_at: new Date().toISOString(),
      });
      // Also bubble up in case the caller wants the full UserRow
      onSuccess(json.data);
      reset();
      onClose();
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite user</DialogTitle>
          <DialogDescription>
            An invitation email will be sent so the user can set their password.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Email *</label>
            <Input
              type="email"
              value={email}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Full name</label>
            <Input
              value={fullName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Role</label>
            <RoleSelect value={role} onChange={setRole} callerRole={callerRole} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !email}>
              {loading ? 'Sending invite...' : 'Send invite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Edit Modal
// ---------------------------------------------------------------------------

interface EditModalProps {
  user: UserRow | null;
  callerRole: string | null;
  onClose: () => void;
  onSuccess: (user: UserRow) => void;
}

function EditModal({ user, callerRole, onClose, onSuccess }: EditModalProps) {
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name ?? '');
      setRole(user.role);
      setError(null);
    }
  }, [user]);

  const canEdit =
    callerRole === 'super_admin' ||
    (callerRole === 'admin' && user?.role !== 'admin' && user?.role !== 'super_admin');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !canEdit) return;
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: fullName, role }),
    });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? 'Failed to update user');
    } else {
      onSuccess(json.data);
      onClose();
    }
    setLoading(false);
  }

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>{user?.email}</DialogDescription>
        </DialogHeader>
        {!canEdit ? (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
            <p className="text-sm text-amber-800">
              You don&apos;t have permission to edit this user&apos;s account.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {error && (
              <div className="rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-foreground">Full name</label>
              <Input
                value={fullName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
                placeholder="Full name"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-foreground">Role</label>
              <RoleSelect value={role} onChange={setRole} callerRole={callerRole} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        )}
        {!canEdit && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Delete Dialog
// ---------------------------------------------------------------------------

interface DeleteDialogProps {
  user: UserRow | null;
  onClose: () => void;
  onSuccess: (id: string) => void;
}

function DeleteDialog({ user, onClose, onSuccess }: DeleteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!user) return;
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? 'Failed to delete user');
      setLoading(false);
    } else {
      onSuccess(user.id);
      onClose();
    }
  }

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete user</DialogTitle>
          <DialogDescription>
            This will permanently delete{' '}
            <span className="font-medium text-foreground">{user?.email}</span> and all their data.
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div className="rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? 'Deleting...' : 'Delete user'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Pending Invitations section
// ---------------------------------------------------------------------------

interface PendingInvitationsProps {
  invites: PendingInvite[];
  onResend: (invite: PendingInvite) => Promise<void>;
  onCancel: (invite: PendingInvite) => Promise<void>;
  resendingId: string | null;
  cancellingId: string | null;
}

function PendingInvitations({
  invites,
  onResend,
  onCancel,
  resendingId,
  cancellingId,
}: PendingInvitationsProps) {
  if (invites.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Pending invitations ({invites.length})
      </h2>
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Invited</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {invites.map((invite) => (
              <TableRow key={invite.id}>
                <TableCell className="text-sm text-foreground">{invite.email}</TableCell>
                <TableCell>
                  <Badge variant={ROLE_VARIANTS[invite.role] ?? 'secondary'}>
                    {ROLE_LABELS[invite.role] ?? invite.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {formatRelativeTime(invite.invited_at)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                      onClick={() => onResend(invite)}
                      disabled={resendingId === invite.id || cancellingId === invite.id}
                    >
                      <RefreshCw size={12} className={resendingId === invite.id ? 'animate-spin' : ''} />
                      {resendingId === invite.id ? 'Sending...' : 'Resend'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-600"
                      onClick={() => onCancel(invite)}
                      disabled={cancellingId === invite.id || resendingId === invite.id}
                      aria-label={`Cancel invitation for ${invite.email}`}
                    >
                      {cancellingId === invite.id ? (
                        <div className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      ) : (
                        <X size={14} />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { role: callerRole } = useAdminRole();
  const { addToast } = useToast();

  // Confirmed users
  const [users, setUsers] = useState<UserRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pending invitations
  const [pending, setPending] = useState<PendingInvite[]>([]);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Filters + pagination
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Modals
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      page: String(page),
      limit: '20',
      ...(debouncedSearch && { search: debouncedSearch }),
      ...(roleFilter !== 'all' && { role: roleFilter }),
    });

    const res = await fetch(`/api/admin/users?${params}`, { cache: 'no-store' });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? 'Failed to load users');
    } else {
      setUsers(json.data ?? []);
      setPagination(json.pagination);
    }
    setLoading(false);
  }, [page, debouncedSearch, roleFilter]);

  const fetchPending = useCallback(async () => {
    const res = await fetch('/api/admin/users/pending', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      setPending(json.data ?? []);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchPending();
  }, [fetchUsers, fetchPending]);

  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [debouncedSearch, roleFilter]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleInviteSuccess() {
    // Count increments when an invite is sent; confirmed count stays the same
    setPagination((prev) => ({ ...prev, total: prev.total + 1 }));
  }

  function handlePendingCreated(invite: PendingInvite) {
    setPending((prev) => [invite, ...prev]);
  }

  function handleEditSuccess(updated: UserRow) {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  }

  function handleDeleteSuccess(id: string) {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
  }

  async function handleResend(invite: PendingInvite) {
    setResendingId(invite.id);
    const res = await fetch(`/api/admin/users/${invite.id}/resend`, { method: 'POST' });
    const json = await res.json();
    setResendingId(null);

    if (res.ok) {
      // Update the invited_at timestamp optimistically
      setPending((prev) =>
        prev.map((i) => (i.id === invite.id ? { ...i, invited_at: new Date().toISOString() } : i))
      );
      addToast(`Invitation resent to ${invite.email}`, 'success');
    } else if (res.status === 400 && json.error?.includes('already accepted')) {
      // User accepted since last page load — clean up the stale row and refresh
      setPending((prev) => prev.filter((i) => i.id !== invite.id));
      fetchUsers();
      addToast(`${invite.email} has already joined.`, 'success');
    } else {
      addToast(json.error ?? 'Failed to resend invitation', 'error');
    }
  }

  async function handleCancelInvite(invite: PendingInvite) {
    setCancellingId(invite.id);
    const res = await fetch(`/api/admin/users/${invite.id}`, { method: 'DELETE' });
    setCancellingId(null);

    if (res.ok) {
      setPending((prev) => prev.filter((i) => i.id !== invite.id));
      setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      addToast(`Invitation to ${invite.email} cancelled`, 'success');
    } else {
      const json = await res.json();
      addToast(json.error ?? 'Failed to cancel invitation', 'error');
    }
  }

  async function handleExportAll() {
    const params = new URLSearchParams({
      ...(debouncedSearch && { search: debouncedSearch }),
      ...(roleFilter !== 'all' && { role: roleFilter }),
    });
    const res = await fetch(`/api/admin/users/export?${params}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function canManage(user: UserRow): boolean {
    if (user.id === currentUser?.id) return false;
    if (callerRole === 'super_admin') return true;
    return user.role !== 'admin' && user.role !== 'super_admin';
  }

  // Manageable users on the current page (used for select-all)
  const manageableUsers = users.filter(canManage);
  const allManageableSelected =
    manageableUsers.length > 0 && manageableUsers.every((u) => selectedIds.has(u.id));
  const someSelected = selectedIds.size > 0;

  function toggleSelectAll() {
    if (allManageableSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(manageableUsers.map((u) => u.id)));
    }
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBulkExport() {
    const selected = users.filter((u) => selectedIds.has(u.id));
    downloadCsv(
      `users-selected-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { header: 'Email',      getValue: (u: UserRow) => u.email },
        { header: 'Full Name',  getValue: (u: UserRow) => u.full_name ?? '' },
        { header: 'Role',       getValue: (u: UserRow) => u.role },
        { header: 'Joined',     getValue: (u: UserRow) => u.created_at },
        { header: 'Last Login', getValue: (u: UserRow) => u.last_login_at ?? '' },
      ],
      selected
    );
  }

  async function handleBulkDelete() {
    if (!window.confirm(`Delete ${selectedIds.size} user${selectedIds.size !== 1 ? 's' : ''}? This cannot be undone.`)) return;

    setBulkDeleting(true);
    let deletedCount = 0;
    const failedEmails: string[] = [];

    for (const id of selectedIds) {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        deletedCount++;
        setUsers((prev) => prev.filter((u) => u.id !== id));
        setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      } else {
        const user = users.find((u) => u.id === id);
        failedEmails.push(user?.email ?? id);
      }
    }

    setSelectedIds(new Set());
    setBulkDeleting(false);

    if (failedEmails.length === 0) {
      addToast(`Deleted ${deletedCount} user${deletedCount !== 1 ? 's' : ''}.`, 'success');
    } else {
      addToast(`Deleted ${deletedCount}, failed: ${failedEmails.join(', ')}`, 'error');
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <p className="text-muted-foreground mt-1">
            {pagination.total > 0 ? `${pagination.total} total` : 'Manage user accounts'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportAll} title="Export all users matching current filters">
            <Download size={15} />
            Export CSV
          </Button>
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus size={16} />
            Invite user
          </Button>
        </div>
      </div>

      {/* Pending Invitations */}
      <PendingInvitations
        invites={pending}
        onResend={handleResend}
        onCancel={handleCancelInvite}
        resendingId={resendingId}
        cancellingId={cancellingId}
      />

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {[...VALID_ROLES].map((r) => (
              <SelectItem key={r} value={r}>{ROLE_LABELS[r] ?? r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        {error ? (
          <div className="p-8 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={fetchUsers}>
              Try again
            </Button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-muted-foreground">
              {debouncedSearch || roleFilter !== 'all'
                ? 'No users match your search.'
                : 'No users yet. Invite your first user above.'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 pl-4">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                    checked={allManageableSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all manageable users"
                    disabled={manageableUsers.length === 0}
                  />
                </TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Last login</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className={selectedIds.has(user.id) ? 'bg-brand-muted/40' : user.id === currentUser?.id ? 'bg-brand-muted/20' : ''}>
                  <TableCell className="pl-4">
                    {canManage(user) ? (
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                        checked={selectedIds.has(user.id)}
                        onChange={() => toggleSelectOne(user.id)}
                        aria-label={`Select ${user.email}`}
                      />
                    ) : (
                      <span className="w-4 block" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserAvatar user={user} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {user.full_name || <span className="text-muted-foreground font-normal">No name</span>}
                          {user.id === currentUser?.id && (
                            <span className="ml-2 text-xs text-muted-foreground font-normal">(you)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={ROLE_VARIANTS[user.role] ?? 'secondary'}>
                      {ROLE_LABELS[user.role] ?? user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatRelativeTime(user.last_login_at)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDate(user.created_at)}
                  </TableCell>
                  <TableCell>
                    {canManage(user) && (
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditingUser(user)}
                          aria-label={`Edit ${user.email}`}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-600"
                          onClick={() => setDeletingUser(user)}
                          aria-label={`Delete ${user.email}`}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-card border border-border shadow-lg rounded-xl px-4 py-2.5">
          <span className="text-sm font-medium text-foreground whitespace-nowrap">
            {selectedIds.size} selected
          </span>
          <div className="h-4 w-px bg-border" />
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground" onClick={() => setSelectedIds(new Set())}>
            <X size={13} />
            Clear
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={handleBulkExport}>
            <Download size={13} />
            Export
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="h-8"
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
          >
            <Trash2 size={13} />
            {bulkDeleting ? 'Deleting...' : `Delete (${selectedIds.size})`}
          </Button>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pagination.limit + 1}–
            {Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
              <ChevronLeft size={16} />
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= pagination.totalPages}>
              Next
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <InviteModal
        open={inviteOpen}
        callerRole={callerRole}
        onClose={() => setInviteOpen(false)}
        onSuccess={handleInviteSuccess}
        onPendingCreated={handlePendingCreated}
      />
      <EditModal
        user={editingUser}
        callerRole={callerRole}
        onClose={() => setEditingUser(null)}
        onSuccess={handleEditSuccess}
      />
      <DeleteDialog
        user={deletingUser}
        onClose={() => setDeletingUser(null)}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
