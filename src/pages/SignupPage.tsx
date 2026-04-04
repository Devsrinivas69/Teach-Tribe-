import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, Eye, EyeOff, BookOpen, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, type AppRole } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { MASTER_ADMIN_EMAIL } from '@/lib/constants';

const allRoles: { value: AppRole; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'student', label: 'Student', description: 'Enroll in courses and learn', icon: <BookOpen className="h-5 w-5" /> },
  { value: 'instructor', label: 'Instructor', description: 'Create and manage courses', icon: <Users className="h-5 w-5" /> },
];

const SignupPage = () => {
  const navigate = useNavigate();
  const { signup, signInWithGoogle, adminUnits } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole>('student');
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const isMasterEmail = email.trim().toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
  const roles = isMasterEmail
    ? [...allRoles, { value: 'master_admin' as AppRole, label: 'Master Admin', description: 'Manage platform admins and users', icon: <Users className="h-5 w-5" /> }]
    : allRoles;
  const effectiveRole = selectedRole;

  useEffect(() => {
    const hasSelectedRole = roles.some((r) => r.value === selectedRole);
    if (!hasSelectedRole) {
      setSelectedRole('student');
    }
  }, [roles, selectedRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast({ title: 'Password must be at least 6 characters', variant: 'destructive' }); return; }
    if (effectiveRole !== 'master_admin' && !selectedAdminId) {
      toast({ title: 'Select an admin workspace', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const result = await signup(
      name,
      email,
      password,
      effectiveRole,
      effectiveRole === 'master_admin' ? undefined : { adminId: selectedAdminId }
    );
    setLoading(false);
    if (result.success) {
      toast({ title: result.message });
      if (effectiveRole === 'admin') navigate('/dashboard/admin');
      else if (effectiveRole === 'instructor') navigate('/dashboard/instructor');
      else navigate('/dashboard/student');
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const result = await signInWithGoogle();
    setLoading(false);
    if (result.success) {
      toast({ title: result.message });
      navigate('/dashboard');
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-8 card-shadow">
        <div className="mb-6 text-center">
          <GraduationCap className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-3 text-2xl font-bold">Create Account</h1>
          <p className="text-sm text-muted-foreground">Start your learning journey today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role selector */}
          <div>
            <label className="text-sm font-medium">I want to join as</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {roles.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setSelectedRole(r.value)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 text-center transition-all ${
                    selectedRole === r.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary/30 text-muted-foreground'
                  }`}
                >
                  {r.icon}
                  <span className="text-xs font-semibold">{r.label}</span>
                  <span className="text-[10px] leading-tight opacity-70">{r.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Choose Admin Workspace</label>
            <select
              required={effectiveRole !== 'master_admin'}
              disabled={effectiveRole === 'master_admin'}
              value={selectedAdminId}
              onChange={e => setSelectedAdminId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select admin workspace</option>
              {adminUnits.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.name} ({admin.status})
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Upcoming admin workspaces start with zero classes. Instructors can join and curate first courses.
            </p>
          </div>

          {isMasterEmail && (
            <p className="text-[11px] text-primary">
              Master admin role is available because you entered the configured master admin email.
            </p>
          )}

          <div>
            <label className="text-sm font-medium">Full Name</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="John Doe" />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="you@example.com" />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <div className="relative mt-1">
              <input type={showPass ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Min 6 characters" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full bg-primary text-primary-foreground" disabled={loading}>
            {loading ? 'Creating account...' : `Sign up as ${allRoles.find(r => r.value === effectiveRole)?.label}`}
          </Button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={loading}>
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </Button>
        <p className="mt-1 text-center text-[11px] text-muted-foreground">Google sign-in creates a Student account by default</p>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/login" className="font-medium text-primary hover:underline">Log in</Link>
        </div>
      </motion.div>
    </div>
  );
};

export default SignupPage;
