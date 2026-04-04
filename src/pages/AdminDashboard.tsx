import { motion } from 'framer-motion';
import { Users, BookOpen, BarChart3, Shield, Trash2, Edit2, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCourseStore } from '@/stores/courseStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useEffect, useMemo } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MASTER_ADMIN_EMAIL } from '@/lib/constants';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'instructor' | 'admin' | 'master_admin';
  enrollments: number;
  joinedAt: Date;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, role, loading, activeAdminId, activeAdmin } = useAuth();
  const { courses, loadCoursesFromFirestore } = useCourseStore();

  const [profilesData, setProfilesData] = useState<any[]>([]);
  const [rolesData, setRolesData] = useState<Record<string, string>>({});
  const [allEnrollments, setAllEnrollments] = useState<any[]>([]);
  const [adminMemberships, setAdminMemberships] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [roleToChange, setRoleToChange] = useState<'student' | 'instructor' | 'admin'>('student');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!user || role !== 'admin' || !activeAdminId) return;

    loadCoursesFromFirestore();

    const qMemberships = query(collection(db, 'user_admin_memberships'), where('adminId', '==', activeAdminId));
    const unsubMemberships = onSnapshot(qMemberships, (snap) => {
      const memberships = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAdminMemberships(memberships);
    });

    // Real-time listener: all user profiles
    const unsubProfiles = onSnapshot(collection(db, 'profiles'), (snap) => {
      const profiles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProfilesData(profiles);
      setUsersLoading(false);
    }, () => setUsersLoading(false));

    // Real-time listener: all user roles
    const unsubRoles = onSnapshot(collection(db, 'user_roles'), (snap) => {
      const map: Record<string, string> = {};
      snap.docs.forEach(d => {
        const data = d.data();
        map[data.user_id || d.id] = data.role || 'student';
      });
      setRolesData(map);
    });

    // Real-time listener: all enrollments
    const unsubEnrollments = onSnapshot(collection(db, 'enrollments'), (snap) => {
      const enrollments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllEnrollments(enrollments);
    });

    return () => {
      unsubMemberships();
      unsubProfiles();
      unsubRoles();
      unsubEnrollments();
    };
  }, [user, role, activeAdminId]);

  // Derive merged user list from live Firestore data
  const adminUsers: AdminUser[] = useMemo(() => {
    const memberIds = new Set(adminMemberships.map((m: any) => m.userId));
    return profilesData.map(profile => ({
      id: profile.id,
      name: profile.display_name || 'Unknown',
      email: profile.email || '—',
      role: (rolesData[profile.id] || 'student') as AdminUser['role'],
      enrollments: allEnrollments.filter(e => e.studentId === profile.id).length,
      joinedAt: profile.created_at ? new Date(profile.created_at) : new Date(),
    })).filter((u) => {
      if (!memberIds.has(u.id)) return false;

      const isMasterAdminUser =
        u.role === 'master_admin' ||
        u.email?.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();

      return !isMasterAdminUser;
    });
  }, [profilesData, rolesData, allEnrollments, adminMemberships]);

  const scopedCourses = useMemo(
    () => courses.filter(c => !activeAdminId || !c.adminId || c.adminId === activeAdminId),
    [courses, activeAdminId]
  );

  const userIds = useMemo(() => new Set(adminUsers.map(u => u.id)), [adminUsers]);
  const scopedEnrollments = useMemo(
    () => allEnrollments.filter(e => userIds.has(e.studentId)),
    [allEnrollments, userIds]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 rounded-full border-4 border-muted border-t-primary animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  const totalUsers = adminUsers.length;
  const completionRate = scopedEnrollments.length > 0
    ? Math.round((scopedEnrollments.filter(e => e.progress === 100).length / scopedEnrollments.length) * 100)
    : 0;

  const stats = [
    { label: 'Total Users', value: usersLoading ? '…' : totalUsers, icon: Users, color: 'text-primary' },
    { label: 'Total Courses', value: scopedCourses?.length || 0, icon: BookOpen, color: 'text-success' },
    { label: 'Active Enrollments', value: scopedEnrollments.length, icon: BarChart3, color: 'text-warning' },
    { label: 'Completion Rate', value: `${completionRate}%`, icon: BarChart3, color: 'text-secondary' },
  ];

  const handleChangeUserRole = async (userId: string, newRole: 'student' | 'instructor' | 'admin') => {
    const targetUser = adminUsers.find((u) => u.id === userId);
    const isMasterAdminUser =
      targetUser?.role === 'master_admin' ||
      targetUser?.email?.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();

    if (isMasterAdminUser) {
      setSelectedUser(null);
      return;
    }

    setActionLoading(true);
    try {
      await setDoc(doc(db, 'user_roles', userId), { user_id: userId, role: newRole }, { merge: true });
    } catch (err) {
      console.error('Failed to change role:', err);
    } finally {
      setActionLoading(false);
      setSelectedUser(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const targetUser = adminUsers.find((u) => u.id === userId);
    const isMasterAdminUser =
      targetUser?.role === 'master_admin' ||
      targetUser?.email?.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();

    if (isMasterAdminUser) {
      setConfirmDelete(null);
      return;
    }

    setActionLoading(true);
    try {
      await deleteDoc(doc(db, 'profiles', userId));
      await deleteDoc(doc(db, 'user_roles', userId));
      // Delete all enrollments belonging to this user
      const enrollSnap = await getDocs(query(collection(db, 'enrollments'), where('studentId', '==', userId)));
      await Promise.all(enrollSnap.docs.map(d => deleteDoc(d.ref)));
    } catch (err) {
      console.error('Failed to delete user:', err);
    } finally {
      setActionLoading(false);
      setConfirmDelete(null);
    }
  };

  const handlePublishCourse = async (courseId: string) => {
    try {
      await updateDoc(doc(db, 'courses', courseId), { isPublished: true });
      loadCoursesFromFirestore();
    } catch (err) {
      console.error('Failed to publish course:', err);
    }
  };

  const getRoleColor = (r: string) => {
    switch (r) {
      case 'master_admin': return 'bg-warning/10 text-warning';
      case 'admin': return 'bg-destructive/10 text-destructive';
      case 'instructor': return 'bg-primary/10 text-primary';
      case 'student': return 'bg-secondary/10 text-secondary';
      default: return 'bg-muted/10 text-muted-foreground';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>
        <p className="text-muted-foreground">Platform overview and management — live data</p>
        <p className="text-xs text-muted-foreground">Workspace: {activeAdmin?.name || 'No workspace selected'}</p>
      </motion.div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="rounded-xl border border-border bg-card p-4 card-shadow">
            <s.icon className={`h-8 w-8 ${s.color} mb-2`} />
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-sm text-muted-foreground">{s.label}</div>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="users" className="mt-8">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="users">Users ({usersLoading ? '…' : totalUsers})</TabsTrigger>
          <TabsTrigger value="courses">Courses ({scopedCourses?.length || 0})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Users Management Tab */}
        <TabsContent value="users">
          <div className="mt-6 rounded-xl border border-border">
            {usersLoading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading users...</span>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">User</th>
                    <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Email</th>
                    <th className="px-4 py-3 text-left font-medium">Role</th>
                    <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Enrollments</th>
                    <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Joined</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {adminUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No users found</td>
                    </tr>
                  ) : adminUsers.map((u) => (
                    // Master admin accounts are visible but protected from role/delete actions.
                    <tr key={u.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <span className="font-medium">{u.name}</span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground text-xs">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getRoleColor(u.role)}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{u.enrollments}</td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                        {u.joinedAt.toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(() => {
                            const isMasterAdminUser =
                              u.role === 'master_admin' ||
                              u.email?.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();

                            return (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={isMasterAdminUser}
                                  onClick={() => { setSelectedUser(u.id); setRoleToChange(u.role === 'master_admin' ? 'admin' : u.role); }}
                                  className="text-primary disabled:cursor-not-allowed disabled:opacity-50"
                                  title={isMasterAdminUser ? 'Master admin role cannot be changed' : undefined}
                                >
                                  <Edit2 className="h-4 w-4 mr-1" />
                                  <span className="hidden sm:inline">Change Role</span>
                                </Button>
                                {String(u.id) !== String(user?.uid) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={isMasterAdminUser}
                                    onClick={() => setConfirmDelete(u.id)}
                                    className="text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                                    title={isMasterAdminUser ? 'Master admin account cannot be deleted' : undefined}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    <span className="hidden sm:inline">Delete</span>
                                  </Button>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        {/* Courses Management Tab */}
        <TabsContent value="courses">
          <div className="mt-6 rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Course</th>
                  <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Instructor</th>
                  <th className="px-4 py-3 text-left font-medium">Students</th>
                  <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Rating</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {scopedCourses?.map(c => (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <img src={c.thumbnail} alt="" className="h-8 w-12 rounded object-cover" />
                        <span className="font-medium line-clamp-1">{c.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground text-xs">{c.instructorName}</td>
                    <td className="px-4 py-3 font-semibold">{(c.enrollmentCount ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 hidden md:table-cell">⭐ {c.rating}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium flex items-center justify-center gap-1 w-fit mx-auto ${
                        c.isPublished
                          ? 'bg-success/10 text-success'
                          : 'bg-warning/10 text-warning'
                      }`}>
                        {c.isPublished ? (
                          <><CheckCircle className="h-3 w-3" /> Published</>
                        ) : (
                          <><XCircle className="h-3 w-3" /> Draft</>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/course/${c.id}`)}
                        >
                          View
                        </Button>
                        {!c.isPublished && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-success"
                            onClick={() => handlePublishCourse(c.id)}
                          >
                            Publish
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="font-semibold mb-4">User Distribution</h3>
                <div className="space-y-3">
                  {(['student', 'instructor', 'admin'] as const).map((r, idx) => {
                    const count = adminUsers.filter(u => u.role === r).length;
                    const pct = totalUsers > 0 ? (count / totalUsers) * 100 : 0;
                    const colors = ['bg-secondary', 'bg-primary', 'bg-destructive'];
                    return (
                      <div key={r}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm capitalize">{r}s</span>
                          <span className="font-semibold">{count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted mt-1">
                          <div
                            className={`h-full rounded-full ${colors[idx]} transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="font-semibold mb-4">Enrollment Statistics</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Enrollments</span>
                    <span className="font-semibold text-lg">{scopedEnrollments.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Completed</span>
                    <span className="font-semibold text-lg text-success">{allEnrollments.filter(e => e.progress === 100).length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">In Progress</span>
                    <span className="font-semibold text-lg text-primary">{allEnrollments.filter(e => e.progress > 0 && e.progress < 100).length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Not Started</span>
                    <span className="font-semibold text-lg text-warning">{allEnrollments.filter(e => e.progress === 0).length}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-semibold mb-4">Platform Performance</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Platform Completion Rate</p>
                  <p className="text-3xl font-bold mt-2">{completionRate}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Course Rating</p>
                  <p className="text-3xl font-bold mt-2">
                    {(courses?.length ?? 0) > 0
                      ? ((courses ?? []).reduce((a, c) => a + (c.rating || 0), 0) / (courses ?? []).length).toFixed(1)
                      : '0'}⭐
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Published Courses</p>
                  <p className="text-3xl font-bold mt-2">{(courses ?? []).filter(c => c.isPublished).length}/{courses?.length || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Lessons</p>
                  <p className="text-3xl font-bold mt-2">{(courses ?? []).reduce((a, c) => a + (c.curriculum?.reduce((s, sec) => s + sec.lessons.length, 0) || 0), 0)}</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Change User Role Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Select a new role for this user. This will update their access permissions immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select New Role:</label>
              <Select value={roleToChange} onValueChange={(v: any) => setRoleToChange(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="instructor">Instructor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              disabled={actionLoading}
              onClick={() => selectedUser && handleChangeUserRole(selectedUser, roleToChange)}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The user's profile and role data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading}
              onClick={() => confirmDelete && handleDeleteUser(confirmDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboard;
