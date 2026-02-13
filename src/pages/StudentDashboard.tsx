import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Award, Clock, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useCourseStore } from '@/stores/courseStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { courses, getStudentEnrollments } = useCourseStore();

  if (!user) { navigate('/login'); return null; }

  const enrollments = getStudentEnrollments(user.id);
  const enrolledCourses = enrollments.map(e => ({ ...e, course: courses.find(c => c.id === e.courseId)! })).filter(e => e.course);
  const inProgress = enrolledCourses.filter(e => e.progress > 0 && e.progress < 100);
  const completed = enrolledCourses.filter(e => e.progress === 100);
  const totalHours = enrolledCourses.reduce((a, e) => a + parseInt(e.course.totalDuration) || 0, 0);

  const stats = [
    { label: 'Enrolled', value: enrollments.length, icon: BookOpen, color: 'text-primary' },
    { label: 'Completed', value: completed.length, icon: Award, color: 'text-success' },
    { label: 'Hours Learned', value: totalHours, icon: Clock, color: 'text-warning' },
    { label: 'Certificates', value: completed.length, icon: Trophy, color: 'text-secondary' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Welcome back, {profile?.display_name}! 👋</h1>
        <p className="text-muted-foreground">Continue your learning journey</p>
      </motion.div>

      {/* Stats */}
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

      {/* Continue Learning */}
      {inProgress.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-bold">Continue Learning</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {inProgress.map(e => (
              <div key={e.id} className="w-72 shrink-0 rounded-xl border border-border bg-card overflow-hidden card-shadow">
                <img src={e.course.thumbnail} alt="" className="h-36 w-full object-cover" />
                <div className="p-4">
                  <h3 className="mb-2 font-semibold text-sm line-clamp-2">{e.course.title}</h3>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress</span><span>{e.progress}%</span>
                  </div>
                  <Progress value={e.progress} className="h-2 mb-3" />
                  <Button size="sm" className="w-full" onClick={() => navigate(`/learn/${e.courseId}`)}>Continue</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Courses */}
      <div className="mt-8">
        <h2 className="mb-4 text-xl font-bold">My Courses</h2>
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All ({enrolledCourses.length})</TabsTrigger>
            <TabsTrigger value="progress">In Progress ({inProgress.length})</TabsTrigger>
            <TabsTrigger value="done">Completed ({completed.length})</TabsTrigger>
          </TabsList>
          {['all', 'progress', 'done'].map(tab => (
            <TabsContent key={tab} value={tab}>
              {(tab === 'all' ? enrolledCourses : tab === 'progress' ? inProgress : completed).length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground">No courses here yet.</p>
                  <Button className="mt-3" onClick={() => navigate('/courses')}>Browse Courses</Button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {(tab === 'all' ? enrolledCourses : tab === 'progress' ? inProgress : completed).map(e => (
                    <div key={e.id} className="cursor-pointer rounded-xl border border-border bg-card overflow-hidden transition-all hover:card-shadow-hover"
                      onClick={() => navigate(`/learn/${e.courseId}`)}>
                      <img src={e.course.thumbnail} alt="" className="h-36 w-full object-cover" />
                      <div className="p-4">
                        <h3 className="mb-1 font-semibold text-sm line-clamp-2">{e.course.title}</h3>
                        <p className="text-xs text-muted-foreground mb-2">{e.course.instructorName}</p>
                        <Progress value={e.progress} className="h-1.5" />
                        <p className="mt-1 text-xs text-muted-foreground text-right">{e.progress}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Recommended */}
      <div className="mt-8">
        <h2 className="mb-4 text-xl font-bold">Recommended for You</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.filter(c => !enrollments.find(e => e.courseId === c.id)).slice(0, 3).map(c => (
            <div key={c.id} className="cursor-pointer rounded-xl border border-border bg-card overflow-hidden transition-all hover:card-shadow-hover"
              onClick={() => navigate(`/course/${c.id}`)}>
              <img src={c.thumbnail} alt="" className="h-36 w-full object-cover" />
              <div className="p-4">
                <h3 className="mb-1 font-semibold text-sm line-clamp-2">{c.title}</h3>
                <p className="text-xs text-muted-foreground">{c.instructorName} · {c.rating} ⭐</p>
                <p className="mt-1 font-bold text-sm">{c.price === 0 ? 'Free' : `₹${c.price.toLocaleString()}`}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
