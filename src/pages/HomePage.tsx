import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Users, BookOpen, Award, TrendingUp, Code, BarChart3, Palette, Briefcase, Megaphone, Smartphone, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CourseCard, StarRating } from '@/components/shared/CourseCard';
import { useCourseStore } from '@/stores/courseStore';
import { testimonials, categories } from '@/data/mockData';
import { useState, useEffect, useRef } from 'react';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

const categoryIcons: Record<string, any> = {
  'Web Development': Code, 'Data Science': BarChart3, 'Design': Palette, 'Business': Briefcase,
  'Marketing': Megaphone, 'Mobile Development': Smartphone, 'DevOps': Shield, 'Cybersecurity': Shield,
};

const AnimatedCounter = ({ target, label, icon: Icon }: { target: number; label: string; icon: any }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting && !started) setStarted(true); }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [started, target]);

  return (
    <div ref={ref} className="text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        <Icon className="h-7 w-7 text-primary" />
      </div>
      <div className="text-3xl font-bold text-foreground">{(count ?? 0).toLocaleString()}+</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
};

const HomePage = () => {
  const navigate = useNavigate();
  const { courses } = useCourseStore();
  const { isAuthenticated, role, activeAdminId } = useAuth();
  const visibleCourses = courses.filter(c => {
    const isLive = c.isPublished && (c.isLiveVersion ?? true) && (c.versionStatus ? c.versionStatus === 'live' : true);
    if (!isLive) return false;
    if (!isAuthenticated) return true;
    if (role === 'master_admin') return true;
    if (!activeAdminId) return true;
    return !c.adminId || c.adminId === activeAdminId;
  });
  const featured = visibleCourses.slice(0, 6);

  // Real-time stats from Firestore
  const [stats, setStats] = useState({ students: 0, courses: 0, instructors: 0, successRate: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Count students
        const studentsSnap = await getCountFromServer(
          query(collection(db, 'user_roles'), where('role', '==', 'student'))
        );
        const studentCount = studentsSnap.data().count;

        // Count courses
        const coursesSnap = await getCountFromServer(collection(db, 'courses'));
        const courseCount = coursesSnap.data().count;

        // Count instructors
        const instructorsSnap = await getCountFromServer(
          query(collection(db, 'user_roles'), where('role', '==', 'instructor'))
        );
        const instructorCount = instructorsSnap.data().count;

        // Count enrollments for success rate
        const totalEnrollmentsSnap = await getCountFromServer(collection(db, 'enrollments'));
        const totalEnrollments = totalEnrollmentsSnap.data().count;
        let rate = 0;
        if (totalEnrollments > 0) {
          const completedSnap = await getCountFromServer(
            query(collection(db, 'enrollments'), where('progress', '==', 100))
          );
          rate = Math.round((completedSnap.data().count / totalEnrollments) * 100);
        }

        setStats({
          students: studentCount || 0,
          courses: courseCount || courses.length,
          instructors: instructorCount || 0,
          successRate: rate || 0,
        });
      } catch (err) {
        // Fallback to local data if Firestore is unavailable
        console.warn('Firestore stats unavailable, using local data:', err);
        const uniqueInstructors = new Set(visibleCourses.map(c => c.instructor)).size;
        setStats({
          students: 0,
          courses: visibleCourses.length,
          instructors: uniqueInstructors,
          successRate: 0,
        });
      }
    };

    fetchStats();
  }, [courses, visibleCourses]);

  return (
    <div>
      {/* Hero */}
      <section className="hero-gradient relative overflow-hidden py-24 md:py-32">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Ccircle%20cx%3D%2220%22%20cy%3D%2220%22%20r%3D%221%22%20fill%3D%22rgba(255%2C255%2C255%2C0.1)%22%2F%3E%3C%2Fsvg%3E')] opacity-50" />
        <div className="container relative mx-auto px-4 text-center">
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
            className="mx-auto max-w-4xl text-4xl font-extrabold leading-tight text-primary-foreground md:text-6xl">
            Learn Anything, <br />Anytime, <span className="text-warning">Anywhere</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-primary-foreground/80">
            Join millions of learners and gain new skills from expert instructors around the world.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }}
            className="mx-auto mt-8 flex max-w-xl flex-col items-center gap-3 sm:flex-row">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input placeholder="What do you want to learn?" className="w-full rounded-xl border-0 bg-background py-3 pl-10 pr-4 text-foreground shadow-lg outline-none"
                onKeyDown={e => { if (e.key === 'Enter') navigate(`/courses?search=${(e.target as HTMLInputElement).value}`); }} />
            </div>
            <Button size="lg" onClick={() => navigate('/courses')} className="w-full shrink-0 bg-foreground text-background hover:bg-foreground/90 sm:w-auto">
              Browse Courses
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border bg-card py-16">
        <div className="container mx-auto grid grid-cols-2 gap-8 px-4 md:grid-cols-4">
          <AnimatedCounter target={stats.students} label="Active Students" icon={Users} />
          <AnimatedCounter target={stats.courses} label="Expert Courses" icon={BookOpen} />
          <AnimatedCounter target={stats.instructors} label="Instructors" icon={Award} />
          <AnimatedCounter target={stats.successRate} label="Success Rate %" icon={TrendingUp} />
        </div>
      </section>

      {/* Featured Courses */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold">Featured Courses</h2>
            <p className="mt-2 text-muted-foreground">Explore our most popular courses</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((course, i) => (
              <motion.div key={course.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <CourseCard course={course} onClick={() => navigate(`/course/${course.id}`)} />
              </motion.div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button variant="outline" size="lg" onClick={() => navigate('/courses')}>View All Courses</Button>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-8 text-center text-3xl font-bold">Browse by Category</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {categories.map(cat => {
              const Icon = categoryIcons[cat] || Code;
              const count = visibleCourses.filter(c => c.category === cat).length;
              return (
                <motion.div key={cat} whileHover={{ y: -4 }}
                  onClick={() => navigate(`/courses?category=${cat}`)}
                  className="cursor-pointer rounded-xl border border-border bg-card p-6 text-center transition-all hover:border-primary/30 hover:card-shadow-hover">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">{cat}</h3>
                  <p className="text-sm text-muted-foreground">{count} courses</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-8 text-center text-3xl font-bold">What Our Students Say</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                className="rounded-xl border border-border bg-card p-6 card-shadow">
                <StarRating rating={t.rating} />
                <p className="mt-4 text-sm text-muted-foreground">"{t.comment}"</p>
                <div className="mt-4 flex items-center gap-3">
                  <img src={t.avatar} alt={t.name} className="h-10 w-10 rounded-full object-cover" />
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="hero-gradient py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-primary-foreground">Start Learning Today</h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/80">Join thousands of students already learning on Teach-Tribe. Your journey starts here.</p>
          <Button size="lg" className="mt-6 bg-background text-foreground hover:bg-background/90" onClick={() => navigate('/signup')}>
            Get Started for Free
          </Button>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
