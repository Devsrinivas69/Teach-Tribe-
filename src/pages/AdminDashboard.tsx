import { motion } from 'framer-motion';
import { Users, BookOpen, DollarSign, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useCourseStore } from '@/stores/courseStore';
import { users } from '@/data/mockData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { courses, enrollments } = useCourseStore();

  if (!user || user.role !== 'admin') { navigate('/'); return null; }

  const totalUsers = users.length;
  const totalRevenue = courses.reduce((a, c) => a + c.price * c.enrollmentCount, 0);

  const stats = [
    { label: 'Total Users', value: totalUsers, icon: Users, color: 'text-primary' },
    { label: 'Total Courses', value: courses.length, icon: BookOpen, color: 'text-success' },
    { label: 'Revenue', value: `₹${(totalRevenue / 100).toLocaleString()}`, icon: DollarSign, color: 'text-warning' },
    { label: 'Enrollments', value: enrollments.length, icon: BarChart3, color: 'text-secondary' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and management</p>
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
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">User</th>
                  <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Role</th>
                  <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <img src={u.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                        <span className="font-medium">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        u.role === 'admin' ? 'bg-destructive/10 text-destructive' : u.role === 'instructor' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'
                      }`}>{u.role}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{u.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="courses">
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Course</th>
                  <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Instructor</th>
                  <th className="px-4 py-3 text-left font-medium">Students</th>
                  <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Rating</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {courses.map(c => (
                  <tr key={c.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/course/${c.id}`)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <img src={c.thumbnail} alt="" className="h-8 w-12 rounded object-cover" />
                        <span className="font-medium line-clamp-1">{c.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{c.instructorName}</td>
                    <td className="px-4 py-3">{c.enrollmentCount.toLocaleString()}</td>
                    <td className="px-4 py-3 hidden md:table-cell">⭐ {c.rating}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">Published</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
