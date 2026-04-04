import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const navigate = useNavigate();
  const { role, loading, isAuthenticated, memberships } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        if (role !== 'master_admin' && memberships.length > 1) {
          navigate('/workspace-select', { replace: true });
          return;
        }

        // Redirect to role-specific dashboard
        if (role === 'master_admin') {
          navigate('/dashboard/master-admin', { replace: true });
        } else if (role === 'admin') {
          navigate('/dashboard/admin', { replace: true });
        } else if (role === 'instructor') {
          navigate('/dashboard/instructor', { replace: true });
        } else {
          navigate('/dashboard/student', { replace: true });
        }
      } else {
        // Redirect unauthenticated users to login
        navigate('/login', { replace: true });
      }
    }
  }, [role, loading, isAuthenticated, memberships, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="h-8 w-8 rounded-full border-4 border-muted border-t-primary animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">
          {loading ? 'Checking authentication...' : isAuthenticated ? 'Redirecting to your dashboard...' : 'Redirecting to sign in...'}
        </p>
      </div>
    </div>
  );
};

export default Index;

