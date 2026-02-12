import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, DollarSign, BookOpen, Star, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useCourseStore } from '@/stores/courseStore';

const InstructorDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { getInstructorCourses, enrollments } = useCourseStore();

  if (!user) { navigate('/login'); return null; }

  const myCourses = getInstructorCourses(user.id);
  const totalStudents = myCourses.reduce((a, c) => a + c.enrollmentCount, 0);
  const totalRevenue = myCourses.reduce((a, c) => a + c.price * c.enrollmentCount, 0);
  const avgRating = myCourses.length ? (myCourses.reduce((a, c) => a + c.rating, 0) / myCourses.length).toFixed(1) : '0';

  const stats = [
    { label: 'Total Students', value: totalStudents.toLocaleString(), icon: Users, color: 'text-primary' },
    { label: 'Total Revenue', value: `₹${(totalRevenue / 100).toLocaleString()}`, icon: DollarSign, color: 'text-success' },
    { label: 'Courses', value: myCourses.length, icon: BookOpen, color: 'text-warning' },
    { label: 'Avg Rating', value: avgRating, icon: Star, color: 'text-secondary' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold">Instructor Dashboard</h1>
          <p className="text-muted-foreground">Welcome, {user.name}</p>
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

      <div className="mt-8">
        <h2 className="mb-4 text-xl font-bold">My Courses</h2>
        {myCourses.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">No courses yet. Create your first course!</p>
            <Button className="mt-4" onClick={() => navigate('/create-course')}>Create Course</Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Course</th>
                  <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Students</th>
                  <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Rating</th>
                  <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Revenue</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {myCourses.map(course => (
                  <tr key={course.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={course.thumbnail} alt="" className="h-10 w-16 rounded object-cover" />
                        <span className="font-medium line-clamp-1">{course.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">{course.enrollmentCount.toLocaleString()}</td>
                    <td className="px-4 py-3 hidden md:table-cell">⭐ {course.rating}</td>
                    <td className="px-4 py-3 hidden md:table-cell">₹{((course.price * course.enrollmentCount) / 100).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${course.isPublished ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                        {course.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/course/${course.id}`)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstructorDashboard;
