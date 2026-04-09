import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Plus, UserPlus, Database, Trash2, Users, AlertTriangle, Download } from 'lucide-react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { useAuth, type ManagedWorkspaceUser } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';

interface AuditLogEntry {
  id: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
}

interface AdminAccessRequest {
  id: string;
  name: string;
  email: string;
  workspaceName: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  reviewedAt?: string | null;
  reviewedByEmail?: string | null;
  reviewNote?: string | null;
  provisionedUserId?: string | null;
  provisionedAdminId?: string | null;
}

interface AdminRequestsApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  requests?: AdminAccessRequest[];
}

const MasterAdminDashboard = () => {
  const {
    user,
    role,
    loading,
    adminUnits,
    createAdminUnit,
    assignUserToAdmin,
    updateAdminUnitStatus,
    deleteAdminUnit,
    createManagedUserAccount,
    removeUserFromAdmin,
    listUsersByAdmin,
    runDefaultAdminMigration,
    refreshProfile,
  } = useAuth();
  const [adminName, setAdminName] = useState('');
  const [status, setStatus] = useState<'active' | 'upcoming'>('upcoming');
  const [adminUserId, setAdminUserId] = useState('');
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'student' | 'instructor' | 'admin'>('admin');
  const [newUserAdminId, setNewUserAdminId] = useState('');
  const [manageAdminId, setManageAdminId] = useState('');
  const [workspaceUsers, setWorkspaceUsers] = useState<ManagedWorkspaceUser[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [migrationSummary, setMigrationSummary] = useState<{
    defaultAdminId: string;
    usersProcessed: number;
    membershipsCreated: number;
    rolesCreated: number;
    coursesUpdated: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [actorFilter, setActorFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [workspaceFilter, setWorkspaceFilter] = useState('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [adminAccessRequests, setAdminAccessRequests] = useState<AdminAccessRequest[]>([]);
  const [adminRequestsLoading, setAdminRequestsLoading] = useState(false);
  const [adminRequestBusyId, setAdminRequestBusyId] = useState<string | null>(null);

  const authApiBaseUrl = useMemo(
    () => import.meta.env.VITE_AUTH_API_URL || 'http://localhost:3001/api/auth',
    []
  );

  const stats = useMemo(() => ({
    total: adminUnits.length,
    active: adminUnits.filter((a) => a.status === 'active').length,
    upcoming: adminUnits.filter((a) => a.status === 'upcoming').length,
  }), [adminUnits]);

  const workspaceNameById = useMemo(() => {
    const mapping: Record<string, string> = {};
    adminUnits.forEach((unit) => {
      mapping[unit.id] = unit.name;
    });
    return mapping;
  }, [adminUnits]);

  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const logsQuery = query(
        collection(db, 'admin_audit_logs'),
        orderBy('createdAt', 'desc'),
        limit(500)
      );
      const snapshot = await getDocs(logsQuery);
      const rows = snapshot.docs.map((entry) => {
        const data = entry.data() as Partial<AuditLogEntry>;
        return {
          id: entry.id,
          actorId: data.actorId || '',
          actorEmail: data.actorEmail || '',
          actorRole: data.actorRole || '',
          action: data.action || 'unknown_action',
          details: data.details || {},
          createdAt: data.createdAt || '',
        } as AuditLogEntry;
      });
      setAuditLogs(rows);
    } catch {
      setAuditLogs([]);
      setMessage('Failed to load audit logs.');
    } finally {
      setAuditLoading(false);
    }
  }, []);

  const callAdminRequestsApi = useCallback(async (
    path: string,
    init?: RequestInit
  ) => {
    if (!user) {
      throw new Error('User session not found. Please login again.');
    }

    const token = await user.getIdToken();
    const response = await fetch(`${authApiBaseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init?.headers || {}),
      },
    });

    const data = (await response.json()) as AdminRequestsApiResponse;
    if (!response.ok || !data.success) {
      throw new Error(data.error || data.message || 'Request failed.');
    }

    return data;
  }, [authApiBaseUrl, user]);

  const loadPendingAdminRequests = useCallback(async () => {
    setAdminRequestsLoading(true);
    try {
      const data = await callAdminRequestsApi('/admin-access/requests?status=pending', { method: 'GET' });
      setAdminAccessRequests(data.requests || []);
    } catch (error) {
      setAdminAccessRequests([]);
      setMessage(error instanceof Error ? error.message : 'Failed to load admin access requests.');
    } finally {
      setAdminRequestsLoading(false);
    }
  }, [callAdminRequestsApi]);

  const actionOptions = useMemo(() => {
    const values = Array.from(new Set(auditLogs.map((log) => log.action))).sort();
    return values;
  }, [auditLogs]);

  const filteredAuditLogs = useMemo(() => {
    const fromDate = dateFromFilter ? new Date(`${dateFromFilter}T00:00:00`).getTime() : null;
    const toDate = dateToFilter ? new Date(`${dateToFilter}T23:59:59`).getTime() : null;

    return auditLogs.filter((log) => {
      const details = log.details || {};
      const workspaceId = (details.adminId || details.defaultAdminId || details.workspaceId || '') as string;

      if (actorFilter.trim()) {
        const actorText = `${log.actorEmail} ${log.actorId}`.toLowerCase();
        if (!actorText.includes(actorFilter.trim().toLowerCase())) {
          return false;
        }
      }

      if (actionFilter !== 'all' && log.action !== actionFilter) {
        return false;
      }

      if (workspaceFilter !== 'all' && workspaceId !== workspaceFilter) {
        return false;
      }

      if (fromDate || toDate) {
        const created = new Date(log.createdAt).getTime();
        if (!Number.isFinite(created)) {
          return false;
        }
        if (fromDate && created < fromDate) {
          return false;
        }
        if (toDate && created > toDate) {
          return false;
        }
      }

      return true;
    });
  }, [auditLogs, actorFilter, actionFilter, workspaceFilter, dateFromFilter, dateToFilter]);

  const exportAuditCsv = () => {
    const csvEscape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const rows = filteredAuditLogs.map((log) => {
      const details = log.details || {};
      const workspaceId = (details.adminId || details.defaultAdminId || details.workspaceId || '') as string;
      const workspaceName = workspaceId ? (workspaceNameById[workspaceId] || workspaceId) : '';
      return [
        log.createdAt || '',
        log.actorEmail || '',
        log.actorRole || '',
        log.action || '',
        workspaceName,
        workspaceId,
        JSON.stringify(details),
      ].map((value) => csvEscape(String(value))).join(',');
    });

    const header = ['createdAt', 'actorEmail', 'actorRole', 'action', 'workspaceName', 'workspaceId', 'details'].join(',');
    const csv = [header, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!newUserAdminId && adminUnits.length > 0) {
      setNewUserAdminId(adminUnits[0].id);
    }
    if (!manageAdminId && adminUnits.length > 0) {
      setManageAdminId(adminUnits[0].id);
    }
  }, [adminUnits, newUserAdminId, manageAdminId]);

  const loadWorkspaceUsers = useCallback(async (adminId: string) => {
    if (!adminId) return;
    setUsersLoading(true);
    try {
      const result = await listUsersByAdmin(adminId);
      if (result.success && result.users) {
        setWorkspaceUsers(result.users);
      } else {
        setWorkspaceUsers([]);
        setMessage(result.message);
      }
    } finally {
      setUsersLoading(false);
    }
  }, [listUsersByAdmin]);

  useEffect(() => {
    if (manageAdminId) {
      loadWorkspaceUsers(manageAdminId);
    }
  }, [manageAdminId, loadWorkspaceUsers]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  useEffect(() => {
    loadPendingAdminRequests();
  }, [loadPendingAdminRequests]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-muted border-t-primary animate-spin" />
      </div>
    );
  }

  if (!user || role !== 'master_admin') {
    return <Navigate to="/login" replace />;
  }

  const handleCreateAdmin = async () => {
    if (!adminName.trim()) return;

    setBusy(true);
    const result = await createAdminUnit(adminName.trim(), status);
    setMessage(result.message);
    setAdminName('');
    setStatus('upcoming');
    setBusy(false);
  };

  const handleAssignAdmin = async () => {
    if (!adminUserId.trim() || !selectedAdminId) return;

    setBusy(true);
    const result = await assignUserToAdmin(adminUserId.trim(), selectedAdminId, 'admin', false);
    setMessage(result.message);
    setAdminUserId('');
    setBusy(false);
  };

  const handleCreateUserAccount = async () => {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword || !newUserAdminId) return;

    setBusy(true);
    try {
      const result = await createManagedUserAccount(
        newUserName.trim(),
        newUserEmail.trim(),
        newUserPassword,
        newUserAdminId,
        newUserRole
      );
      setMessage(result.message);
      if (result.success) {
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        if (manageAdminId === newUserAdminId) {
          await loadWorkspaceUsers(newUserAdminId);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveUser = async (userId: string, adminId: string) => {
    setBusy(true);
    try {
      const result = await removeUserFromAdmin(userId, adminId);
      setMessage(result.message);
      if (result.success) {
        await loadWorkspaceUsers(adminId);
      }
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (adminId: string, nextStatus: 'active' | 'upcoming') => {
    setBusy(true);
    try {
      const result = await updateAdminUnitStatus(adminId, nextStatus);
      setMessage(result.message);
    } finally {
      setBusy(false);
    }
  };

  const handleMigration = async () => {
    setBusy(true);
    setMigrationSummary(null);
    try {
      const result = await runDefaultAdminMigration();
      setMessage(result.message);
      if (result.summary) {
        setMigrationSummary(result.summary);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteWorkspace = async (adminId: string, adminName: string) => {
    const typedName = window.prompt(`Type the workspace name exactly to confirm deletion:\n${adminName}`);
    if (typedName !== adminName) {
      setMessage('Workspace deletion canceled. Confirmation name did not match.');
      return;
    }

    const typedFinal = window.prompt('Type DELETE to permanently delete this workspace.');
    if (typedFinal !== 'DELETE') {
      setMessage('Workspace deletion canceled. Final confirmation was not provided.');
      return;
    }

    setBusy(true);
    try {
      const result = await deleteAdminUnit(adminId);
      setMessage(result.message);
      if (result.success) {
        if (manageAdminId === adminId) {
          setManageAdminId('');
          setWorkspaceUsers([]);
        }
        if (newUserAdminId === adminId) {
          setNewUserAdminId('');
        }
        if (selectedAdminId === adminId) {
          setSelectedAdminId('');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const handleApproveAdminApplication = async (applicationId: string) => {
    setAdminRequestBusyId(applicationId);
    try {
      const data = await callAdminRequestsApi('/admin-access/approve', {
        method: 'POST',
        body: JSON.stringify({ applicationId }),
      });

      setMessage(data.message || 'Admin application approved.');
      await Promise.all([loadPendingAdminRequests(), refreshProfile(), loadAuditLogs()]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to approve admin application.');
    } finally {
      setAdminRequestBusyId(null);
    }
  };

  const handleRejectAdminApplication = async (applicationId: string) => {
    const reviewNote = window.prompt('Optional rejection reason (shown to applicant):', '') || '';

    setAdminRequestBusyId(applicationId);
    try {
      const data = await callAdminRequestsApi('/admin-access/reject', {
        method: 'POST',
        body: JSON.stringify({ applicationId, reviewNote }),
      });

      setMessage(data.message || 'Admin application rejected.');
      await Promise.all([loadPendingAdminRequests(), loadAuditLogs()]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to reject admin application.');
    } finally {
      setAdminRequestBusyId(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Master Admin Dashboard</h1>
        </div>
        <p className="text-muted-foreground">Manage current admins and upcoming admins across the platform.</p>
      </motion.div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 card-shadow">
          <p className="text-xs text-muted-foreground">Total Admin Workspaces</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 card-shadow">
          <p className="text-xs text-muted-foreground">Current Admins</p>
          <p className="text-2xl font-bold">{stats.active}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 card-shadow">
          <p className="text-xs text-muted-foreground">Upcoming Admins</p>
          <p className="text-2xl font-bold">{stats.upcoming}</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-4 card-shadow">
        <h2 className="font-semibold">Bootstrap Migration</h2>
        <p className="text-sm text-muted-foreground">Creates missing user roles and default memberships, and backfills courses without an admin workspace.</p>
        <Button onClick={handleMigration} disabled={busy} className="mt-3 gap-2">
          <Database className="h-4 w-4" /> Run Migration
        </Button>
        {migrationSummary && (
          <div className="mt-3 rounded-lg border border-border p-3 text-sm">
            <p>Default admin: {migrationSummary.defaultAdminId}</p>
            <p>Users processed: {migrationSummary.usersProcessed}</p>
            <p>Memberships created: {migrationSummary.membershipsCreated}</p>
            <p>Roles created: {migrationSummary.rolesCreated}</p>
            <p>Courses updated: {migrationSummary.coursesUpdated}</p>
          </div>
        )}
      </div>

      {message && (
        <p className="mt-4 text-sm text-muted-foreground">{message}</p>
      )}

      <div className="mt-6 rounded-xl border border-border bg-card p-4 card-shadow">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">Admin Access Applications</h2>
            <p className="text-sm text-muted-foreground">Review requests from users who want to become an admin and create a new workspace.</p>
          </div>
          <Button variant="outline" onClick={loadPendingAdminRequests} disabled={adminRequestsLoading || busy}>
            {adminRequestsLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        <div className="space-y-3">
          {adminRequestsLoading && (
            <p className="text-sm text-muted-foreground">Loading admin applications...</p>
          )}

          {!adminRequestsLoading && adminAccessRequests.map((request) => {
            const isRowBusy = adminRequestBusyId === request.id;

            return (
              <div key={request.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{request.name}</p>
                    <p className="text-xs text-muted-foreground">{request.email}</p>
                    <p className="mt-1 text-sm">Workspace: <span className="font-medium">{request.workspaceName}</span></p>
                    <p className="text-xs text-muted-foreground">Requested: {request.requestedAt ? new Date(request.requestedAt).toLocaleString() : '-'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="gap-1"
                      disabled={busy || isRowBusy}
                      onClick={() => handleApproveAdminApplication(request.id)}
                    >
                      <CheckCircle className="h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-destructive hover:text-destructive"
                      disabled={busy || isRowBusy}
                      onClick={() => handleRejectAdminApplication(request.id)}
                    >
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          {!adminRequestsLoading && adminAccessRequests.length === 0 && (
            <p className="text-sm text-muted-foreground">No pending admin applications.</p>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 card-shadow">
          <h2 className="font-semibold">Create User Account</h2>
          <p className="text-sm text-muted-foreground">Create admin, instructor, or student with email/password and assign to a workspace.</p>

          <div className="mt-4 space-y-3">
            <input
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="Email"
              type="email"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              placeholder="Password (min 6 chars)"
              type="password"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />

            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value as 'student' | 'instructor' | 'admin')}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="admin">Admin</option>
              <option value="instructor">Instructor</option>
              <option value="student">Student</option>
            </select>

            <select
              value={newUserAdminId}
              onChange={(e) => setNewUserAdminId(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select admin workspace</option>
              {adminUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} ({unit.status})
                </option>
              ))}
            </select>

            <Button
              onClick={handleCreateUserAccount}
              disabled={busy || !newUserName.trim() || !newUserEmail.trim() || !newUserPassword || !newUserAdminId}
              className="gap-2"
            >
              <Users className="h-4 w-4" /> Create User Account
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 card-shadow">
          <h2 className="font-semibold">Create Admin Workspace</h2>
          <p className="text-sm text-muted-foreground">Use upcoming status for a fresh workspace with no classes yet.</p>

          <div className="mt-4 space-y-3">
            <input
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="Admin name"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'active' | 'upcoming')}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="upcoming">Upcoming Admin</option>
              <option value="active">Current Admin</option>
            </select>

            <Button onClick={handleCreateAdmin} disabled={busy || !adminName.trim()} className="gap-2">
              <Plus className="h-4 w-4" /> Create Workspace
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 card-shadow">
          <h2 className="font-semibold">Assign Platform Admin</h2>
          <p className="text-sm text-muted-foreground">Map an existing user id to an admin workspace.</p>

          <div className="mt-4 space-y-3">
            <input
              value={adminUserId}
              onChange={(e) => setAdminUserId(e.target.value)}
              placeholder="User UID"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />

            <select
              value={selectedAdminId}
              onChange={(e) => setSelectedAdminId(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select admin workspace</option>
              {adminUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} ({unit.status})
                </option>
              ))}
            </select>

            <Button onClick={handleAssignAdmin} disabled={busy || !adminUserId.trim() || !selectedAdminId} className="gap-2">
              <UserPlus className="h-4 w-4" /> Assign As Admin
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-4 card-shadow">
        <h2 className="font-semibold">Manage Workspace Users</h2>
        <p className="text-sm text-muted-foreground">Remove admins, instructors, or students from a selected workspace.</p>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={manageAdminId}
            onChange={(e) => setManageAdminId(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select workspace</option>
            {adminUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name} ({unit.status})
              </option>
            ))}
          </select>
          <Button variant="outline" onClick={() => loadWorkspaceUsers(manageAdminId)} disabled={busy || usersLoading || !manageAdminId}>
            Refresh
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {usersLoading && <p className="text-sm text-muted-foreground">Loading users...</p>}
          {!usersLoading && workspaceUsers.map((member) => (
            <div key={`${member.userId}-${member.adminId}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div>
                <p className="font-medium">{member.displayName}</p>
                <p className="text-xs text-muted-foreground">{member.email || member.userId}</p>
                <p className="text-xs text-muted-foreground">{member.roleUnderAdmin} (app role: {member.appRole})</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRemoveUser(member.userId, member.adminId)}
                disabled={busy || member.userId === user.uid}
                className="gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Button>
            </div>
          ))}
          {!usersLoading && workspaceUsers.length === 0 && (
            <p className="text-sm text-muted-foreground">No users found for this workspace.</p>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-4 card-shadow">
        <h2 className="font-semibold mb-3">Admin Workspaces</h2>
        <p className="mb-3 flex items-start gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
          Delete is permanent and only allowed when the workspace has no users and no courses.
        </p>
        <div className="space-y-3">
          {adminUnits.map((unit) => (
            <div key={unit.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div>
                <p className="font-medium">{unit.name}</p>
                <p className="text-xs text-muted-foreground">{unit.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${unit.status === 'active' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                  {unit.status}
                </span>
                {unit.status === 'active' ? (
                  <Button size="sm" variant="outline" onClick={() => toggleStatus(unit.id, 'upcoming')} disabled={busy}>
                    Mark Upcoming
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => toggleStatus(unit.id, 'active')} disabled={busy}>
                    Mark Active
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeleteWorkspace(unit.id, unit.name)}
                  disabled={busy}
                  className="gap-1 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Workspace
                </Button>
              </div>
            </div>
          ))}
          {adminUnits.length === 0 && (
            <p className="text-sm text-muted-foreground">No admin workspaces found.</p>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-4 card-shadow">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Audit Logs</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadAuditLogs} disabled={auditLoading || busy}>
              {auditLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button variant="outline" size="sm" onClick={exportAuditCsv} disabled={filteredAuditLogs.length === 0} className="gap-1">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            placeholder="Filter by actor email/uid"
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All actions</option>
            {actionOptions.map((action) => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
          <select
            value={workspaceFilter}
            onChange={(e) => setWorkspaceFilter(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All workspaces</option>
            {adminUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>{unit.name}</option>
            ))}
          </select>
          <input
            type="date"
            value={dateFromFilter}
            onChange={(e) => setDateFromFilter(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="date"
            value={dateToFilter}
            onChange={(e) => setDateToFilter(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Date</th>
                <th className="px-3 py-2 text-left font-medium">Actor</th>
                <th className="px-3 py-2 text-left font-medium">Action</th>
                <th className="px-3 py-2 text-left font-medium">Workspace</th>
                <th className="px-3 py-2 text-left font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAuditLogs.map((log) => {
                const details = log.details || {};
                const workspaceId = (details.adminId || details.defaultAdminId || details.workspaceId || '') as string;
                const workspaceName = workspaceId ? (workspaceNameById[workspaceId] || workspaceId) : '-';
                return (
                  <tr key={log.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2 align-top text-xs text-muted-foreground">{log.createdAt ? new Date(log.createdAt).toLocaleString() : '-'}</td>
                    <td className="px-3 py-2 align-top">
                      <p className="font-medium">{log.actorEmail || '-'}</p>
                      <p className="text-xs text-muted-foreground">{log.actorRole || '-'}</p>
                    </td>
                    <td className="px-3 py-2 align-top text-xs">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{log.action}</span>
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-muted-foreground">{workspaceName}</td>
                    <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                      <pre className="max-w-[420px] whitespace-pre-wrap break-all">{JSON.stringify(details)}</pre>
                    </td>
                  </tr>
                );
              })}
              {!auditLoading && filteredAuditLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-muted-foreground">No audit logs match your filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MasterAdminDashboard;
