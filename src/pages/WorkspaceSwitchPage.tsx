import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

const WorkspaceSwitchPage = () => {
  const navigate = useNavigate();
  const { user, loading, role, memberships, adminUnits, activeAdminId, switchActiveAdmin } = useAuth();
  const [selectedAdminId, setSelectedAdminId] = useState(activeAdminId || '');
  const [saving, setSaving] = useState(false);

  const availableWorkspaces = useMemo(() => {
    const workspaceIds = new Set(memberships.map((m) => m.adminId));
    return adminUnits.filter((u) => workspaceIds.has(u.id));
  }, [memberships, adminUnits]);

  const getDashboardPath = () => {
    if (role === 'master_admin') return '/dashboard/master-admin';
    if (role === 'admin') return '/dashboard/admin';
    if (role === 'instructor') return '/dashboard/instructor';
    return '/dashboard/student';
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-muted border-t-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'master_admin') {
    return <Navigate to="/dashboard/master-admin" replace />;
  }

  if (availableWorkspaces.length === 0) {
    return <Navigate to="/dashboard" replace />;
  }

  if (availableWorkspaces.length === 1 && (activeAdminId || selectedAdminId)) {
    return <Navigate to={getDashboardPath()} replace />;
  }

  const handleContinue = async () => {
    if (!selectedAdminId) return;

    setSaving(true);
    try {
      await switchActiveAdmin(selectedAdminId);
      navigate(getDashboardPath(), { replace: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto max-w-xl px-4 py-10">
      <div className="rounded-xl border border-border bg-card p-6 card-shadow">
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Choose Your Workspace</h1>
        </div>

        <p className="mb-5 text-sm text-muted-foreground">
          Your account belongs to multiple admin workspaces. Select one to continue.
        </p>

        <div className="space-y-3">
          {availableWorkspaces.map((workspace) => (
            <label
              key={workspace.id}
              className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors ${
                selectedAdminId === workspace.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
              }`}
            >
              <div>
                <p className="font-medium">{workspace.name}</p>
                <p className="text-xs text-muted-foreground">{workspace.status}</p>
              </div>
              <input
                type="radio"
                name="workspace"
                checked={selectedAdminId === workspace.id}
                onChange={() => setSelectedAdminId(workspace.id)}
              />
            </label>
          ))}
        </div>

        <Button className="mt-5 w-full" disabled={!selectedAdminId || saving} onClick={handleContinue}>
          {saving ? 'Switching...' : 'Continue'}
        </Button>
      </div>
    </div>
  );
};

export default WorkspaceSwitchPage;
