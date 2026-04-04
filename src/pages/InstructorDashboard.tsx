import { useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, BookOpen, Star, Plus, Edit, Trash2, Eye, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCourseStore } from '@/stores/courseStore';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

const InstructorDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, role, loading, activeAdminId, activeAdmin } = useAuth();
  const { getInstructorCourses, enrollments, deleteCourse, publishCourseVersion } = useCourseStore();
  const { toast } = useToast();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 rounded-full border-4 border-muted border-t-primary animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your courses...</p>
        </div>
      </div>
    );
  }

  if (!user || role !== 'instructor') {
    return <Navigate to="/login" replace />;
  }

  const myCourses = getInstructorCourses(user?.uid, activeAdminId)
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const totalStudents = myCourses?.reduce((a, c) => a + (c?.enrollmentCount || 0), 0) || 0;
  const avgRating = myCourses?.length ? (myCourses?.reduce((a, c) => a + (c?.rating || 0), 0) / myCourses.length).toFixed(1) : '0';

  const enrolledStudents = enrollments?.filter(e => 
    myCourses?.some(c => c?.id === e?.courseId)
  ) || [];

  const stats = [
    { label: 'Total Students', value: (totalStudents ?? 0).toLocaleString(), icon: Users, color: 'text-primary' },
    { label: 'Courses', value: myCourses?.length || 0, icon: BookOpen, color: 'text-warning' },
    { label: 'Avg Rating', value: avgRating, icon: Star, color: 'text-secondary' },
  ];

  const handleDeleteCourse = async (courseId: string) => {
    await deleteCourse(courseId);
    setDeleteConfirm(null);
  };

  const handleEditCourse = (courseId: string) => {
    navigate(`/course/${courseId}`);
  };

  const handleCreateVersion = (courseId: string) => {
    navigate(`/create-course?versionFrom=${courseId}`);
  };

  const handlePublishDraft = async (courseId: string) => {
    const result = await publishCourseVersion(courseId, user.uid);
    toast({
      title: result.success ? 'Version published' : 'Publish failed',
      description: result.message,
      variant: result.success ? 'default' : 'destructive',
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold">Instructor Dashboard</h1>
          <p className="text-muted-foreground">Welcome, {profile?.display_name}</p>
          <p className="text-xs text-muted-foreground">Workspace: {activeAdmin?.name || 'No workspace selected'}</p>
        </motion.div>
        <Button onClick={() => navigate('/create-course')} className="gap-2 bg-primary text-primary-foreground">
          <Plus className="h-4 w-4" /> Create Course
        </Button>
      </div>

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

      {/* Tabs for Courses and Students */}
      <div className="mt-8">
        <Tabs defaultValue="courses" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="courses">My Courses</TabsTrigger>
            <TabsTrigger value="students">Student Monitor</TabsTrigger>
          </TabsList>

          {/* Courses Tab */}
          <TabsContent value="courses">
            {(myCourses?.length || 0) === 0 ? (
              <div className="mt-6 rounded-xl border border-border bg-card p-12 text-center">
                <p className="text-muted-foreground">No courses yet. Create your first course!</p>
                <Button className="mt-4" onClick={() => navigate('/create-course')}>Create Course</Button>
              </div>
            ) : (
              <div className="mt-6 overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Course</th>
                      <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Students</th>
                      <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Rating</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {myCourses?.map(course => (
                      <tr key={course.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img src={course.thumbnail} alt="" className="h-10 w-16 rounded object-cover" />
                            <div>
                              <span className="block font-medium line-clamp-1">{course.title}</span>
                              <span className="text-xs text-muted-foreground">{course.category}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">{(course.enrollmentCount ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-3 hidden md:table-cell">⭐ {course.rating}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${course.isLiveVersion ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                            {(course.isLiveVersion ? 'Live' : 'Draft')} v{course.versionNumber || 1}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="View course"
                              onClick={() => navigate(`/course/${course.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              title="Edit course"
                              onClick={() => handleEditCourse(course.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {course.isLiveVersion ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Create new version"
                                onClick={() => handleCreateVersion(course.id)}
                              >
                                New Version
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Publish draft version"
                                onClick={() => handlePublishDraft(course.id)}
                              >
                                Publish
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-destructive"
                              title="Delete course"
                              onClick={() => setDeleteConfirm(course.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* Students Monitor Tab */}
          <TabsContent value="students">
            <div className="mt-6">
              {(enrolledStudents?.length || 0) === 0 ? (
                <div className="rounded-xl border border-border bg-card p-12 text-center">
                  <p className="text-muted-foreground">No students enrolled yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-semibold">Enrolled Students ({enrolledStudents?.length || 0})</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {enrolledStudents?.map((enrollment, idx) => {
                      const course = myCourses?.find(c => c?.id === enrollment?.courseId);
                      return (
                        <div key={idx} className="rounded-lg border border-border bg-card p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold">Student {enrollment.studentId.slice(0, 6)}</p>
                              <p className="text-sm text-muted-foreground">{course?.title}</p>
                              <div className="mt-2 flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">{enrollment.progress}% Complete</span>
                              </div>
                              <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                                <div 
                                  className="h-full rounded-full bg-primary transition-all"
                                  style={{ width: `${enrollment.progress}%` }}
                                />
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              enrollment.progress === 100 
                                ? 'bg-success/10 text-success' 
                                : enrollment.progress > 50 
                                ? 'bg-primary/10 text-primary'
                                : 'bg-warning/10 text-warning'
                            }`}>
                              {enrollment.progress === 100 ? '✓ Completed' : 'In Progress'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Deleting a live version can impact learners enrolled in that version.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteConfirm && handleDeleteCourse(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InstructorDashboard;
