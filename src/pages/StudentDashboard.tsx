import { useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Award, Clock, Trophy, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useCourseStore } from '@/stores/courseStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import SkillGraph from '@/components/shared/SkillGraph';
import type { Course } from '@/types';

interface EnrolledCourse {
  id: string;
  courseId: string;
  progress: number;
  completedLessons: string[];
  enrolledAt: string;
  completedAt: string | null;
  course: Course;
  lessonsCompleted: number;
  totalLessons: number;
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, role, loading, activeAdminId, activeAdmin } = useAuth();
  const { courses, getStudentEnrollments, loadCoursesFromFirestore, loadEnrollmentsFromFirestore, getLatestQuizResult } = useCourseStore();
  const [selectedCertificate, setSelectedCertificate] = useState<EnrolledCourse | null>(null);
  const [generatingCertificate, setGeneratingCertificate] = useState(false);
  const [selectedSkillCourseId, setSelectedSkillCourseId] = useState('');

  useEffect(() => {
    // Refresh catalog and this student's enrollments on dashboard load.
    // This keeps enrolled courses stable across sessions/devices.
    loadCoursesFromFirestore();
    if (user?.uid) {
      loadEnrollmentsFromFirestore(user.uid);
    }
  }, [user?.uid, loadCoursesFromFirestore, loadEnrollmentsFromFirestore]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 rounded-full border-4 border-muted border-t-primary animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || role !== 'student') {
    return <Navigate to="/login" replace />;
  }

  const enrollments = getStudentEnrollments(user.uid);
  const workspaceCourses = courses.filter(c => !activeAdminId || !c.adminId || c.adminId === activeAdminId);

  const enrolledCourses: EnrolledCourse[] = enrollments.map(e => {
    const course = workspaceCourses.find(c => c.id === e.courseId)!;
    const totalLessons = course?.curriculum?.reduce((acc, s) => acc + s.lessons.length, 0) || 0;
    return {
      ...e,
      course,
      lessonsCompleted: e.completedLessons.length,
      totalLessons,
    };
  }).filter(e => e.course);
  
  const inProgress = enrolledCourses.filter(e => e.progress > 0 && e.progress < 100);
  const completed = enrolledCourses.filter(e => e.progress === 100);
  const skillGraphCourses = inProgress.length > 0 ? inProgress : enrolledCourses;

  useEffect(() => {
    if (!selectedSkillCourseId && skillGraphCourses.length > 0) {
      setSelectedSkillCourseId(skillGraphCourses[0].courseId);
    }
  }, [selectedSkillCourseId, skillGraphCourses]);

  useEffect(() => {
    if (selectedSkillCourseId && !skillGraphCourses.some((course) => course.courseId === selectedSkillCourseId)) {
      setSelectedSkillCourseId(skillGraphCourses[0]?.courseId || '');
    }
  }, [selectedSkillCourseId, skillGraphCourses]);

  const selectedSkillCourse = skillGraphCourses.find((course) => course.courseId === selectedSkillCourseId) || skillGraphCourses[0];
  const totalHours = enrolledCourses.reduce((a, e) => {
    const parsed = parseInt(e.course.totalDuration, 10);
    return a + (Number.isNaN(parsed) ? 0 : parsed);
  }, 0);

  const stats = [
    { label: 'Enrolled', value: enrollments.length, icon: BookOpen, color: 'text-primary' },
    { label: 'Completed', value: completed.length, icon: Award, color: 'text-success' },
    { label: 'Hours Learned', value: totalHours, icon: Clock, color: 'text-warning' },
    { label: 'Certificates', value: completed.length, icon: Trophy, color: 'text-secondary' },
  ];

  const handleDownloadCertificate = async (course: any) => {
    setGeneratingCertificate(true);
    try {
      // Create certificate data
      const certificateData = {
        studentName: profile?.display_name || 'Student',
        courseName: course.course.title,
        issuedDate: new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        certificateId: `CERT-${user.uid.substring(0, 8).toUpperCase()}-${course.courseId.substring(0, 8).toUpperCase()}`,
        instructorName: course.course.instructorName || 'Teach-Tribe',
      };

      const escapeHtml = (value: string) =>
        value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\"/g, '&quot;')
          .replace(/'/g, '&#39;');

      // Create HTML certificate template
      const htmlContent = `
        <html>
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Certificate ${certificateData.certificateId}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background:
                  radial-gradient(circle at 10% 20%, #f0f6ff 0%, transparent 40%),
                  radial-gradient(circle at 90% 80%, #fff5df 0%, transparent 40%),
                  #eef2f7;
                min-height: 100vh;
                padding: 24px;
              }
              .certificate {
                width: 1120px;
                min-height: 760px;
                margin: 0 auto;
                background: linear-gradient(160deg, #0f172a 0%, #111827 30%, #1e293b 100%);
                border-radius: 24px;
                border: 1px solid #334155;
                box-shadow: 0 30px 80px rgba(15, 23, 42, 0.35);
                color: #f8fafc;
                padding: 36px;
                position: relative;
                overflow: hidden;
              }
              .certificate::before,
              .certificate::after {
                content: '';
                position: absolute;
                border-radius: 999px;
                filter: blur(2px);
                opacity: 0.3;
                pointer-events: none;
              }
              .certificate::before {
                width: 360px;
                height: 360px;
                background: #38bdf8;
                top: -160px;
                right: -120px;
              }
              .certificate::after {
                width: 320px;
                height: 320px;
                background: #f59e0b;
                bottom: -160px;
                left: -120px;
              }
              .frame {
                position: relative;
                z-index: 2;
                border: 2px solid rgba(251, 191, 36, 0.45);
                border-radius: 18px;
                min-height: 688px;
                padding: 48px 56px;
                background: linear-gradient(180deg, rgba(15, 23, 42, 0.45), rgba(30, 41, 59, 0.2));
                display: flex;
                flex-direction: column;
                justify-content: space-between;
              }
              .top-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                color: #cbd5e1;
                font-size: 13px;
                letter-spacing: 0.14em;
                text-transform: uppercase;
              }
              .brand {
                font-size: 16px;
                font-weight: 700;
                color: #e2e8f0;
                letter-spacing: 0.08em;
              }
              .content {
                text-align: center;
                margin: 24px 0;
              }
              .title {
                font-family: Georgia, 'Times New Roman', serif;
                font-size: 56px;
                letter-spacing: 0.06em;
                margin-bottom: 10px;
                color: #fef3c7;
              }
              .subtitle {
                color: #cbd5e1;
                font-size: 18px;
                letter-spacing: 0.03em;
                margin-bottom: 32px;
              }
              .recipient {
                font-family: Georgia, 'Times New Roman', serif;
                font-size: 50px;
                font-weight: 700;
                color: #ffffff;
                margin: 18px auto 14px;
                max-width: 900px;
                line-height: 1.1;
              }
              .line {
                width: 340px;
                height: 2px;
                margin: 0 auto 24px;
                background: linear-gradient(90deg, transparent, #fbbf24, transparent);
              }
              .course-label {
                color: #94a3b8;
                text-transform: uppercase;
                letter-spacing: 0.16em;
                font-size: 12px;
                margin-bottom: 12px;
              }
              .course-name {
                font-size: 34px;
                font-weight: 700;
                color: #e2e8f0;
                max-width: 900px;
                margin: 0 auto;
                line-height: 1.25;
              }
              .meta {
                margin-top: 34px;
                display: flex;
                justify-content: center;
                gap: 28px;
                flex-wrap: wrap;
              }
              .meta-card {
                min-width: 220px;
                border: 1px solid rgba(148, 163, 184, 0.35);
                border-radius: 12px;
                padding: 14px 16px;
                background: rgba(15, 23, 42, 0.38);
              }
              .meta-label {
                text-transform: uppercase;
                letter-spacing: 0.14em;
                font-size: 11px;
                color: #94a3b8;
                margin-bottom: 7px;
              }
              .meta-value {
                color: #f8fafc;
                font-weight: 600;
                font-size: 15px;
              }
              .bottom-row {
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                gap: 16px;
              }
              .signatures {
                display: flex;
                gap: 26px;
              }
              .sig-block {
                width: 240px;
              }
              .sig-line {
                border-top: 1px solid rgba(248, 250, 252, 0.8);
                margin-bottom: 9px;
              }
              .sig-name {
                color: #e2e8f0;
                font-weight: 600;
                font-size: 14px;
              }
              .sig-role {
                color: #94a3b8;
                font-size: 12px;
                margin-top: 3px;
                letter-spacing: 0.04em;
              }
              .seal {
                width: 112px;
                height: 112px;
                border-radius: 50%;
                border: 2px solid #fbbf24;
                background: radial-gradient(circle at 30% 25%, #fef3c7, #f59e0b 65%, #b45309 100%);
                color: #111827;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
                font-weight: 700;
                box-shadow: 0 8px 26px rgba(245, 158, 11, 0.35);
              }
              .seal small {
                font-size: 10px;
                letter-spacing: 0.12em;
                text-transform: uppercase;
              }
              .seal span {
                font-size: 12px;
                letter-spacing: 0.06em;
                margin-top: 4px;
              }
              .verify {
                margin-top: 10px;
                font-size: 12px;
                color: #94a3b8;
                letter-spacing: 0.03em;
              }
              @media print {
                body { padding: 0; background: #ffffff; }
                .certificate { box-shadow: none; border-radius: 0; }
              }
            </style>
          </head>
          <body>
            <div class="certificate">
              <div class="frame">
                <div class="top-row">
                  <div class="brand">TEACH TRIBE ACADEMY</div>
                  <div>Official Certificate</div>
                </div>

                <div class="content">
                  <div class="title">Certificate of Completion</div>
                  <div class="subtitle">This certifies that</div>
                  <div class="recipient">${escapeHtml(certificateData.studentName)}</div>
                  <div class="line"></div>
                  <div class="course-label">Has successfully completed</div>
                  <div class="course-name">${escapeHtml(certificateData.courseName)}</div>

                  <div class="meta">
                    <div class="meta-card">
                      <div class="meta-label">Date Issued</div>
                      <div class="meta-value">${escapeHtml(certificateData.issuedDate)}</div>
                    </div>
                    <div class="meta-card">
                      <div class="meta-label">Certificate ID</div>
                      <div class="meta-value">${escapeHtml(certificateData.certificateId)}</div>
                    </div>
                    <div class="meta-card">
                      <div class="meta-label">Instructor</div>
                      <div class="meta-value">${escapeHtml(certificateData.instructorName)}</div>
                    </div>
                  </div>
                </div>

                <div class="bottom-row">
                  <div class="signatures">
                    <div class="sig-block">
                      <div class="sig-line"></div>
                      <div class="sig-name">Academic Director</div>
                      <div class="sig-role">Teach Tribe Academy</div>
                    </div>
                    <div class="sig-block">
                      <div class="sig-line"></div>
                      <div class="sig-name">${escapeHtml(certificateData.instructorName)}</div>
                      <div class="sig-role">Course Instructor</div>
                    </div>
                  </div>

                  <div>
                    <div class="seal">
                      <small>Verified</small>
                      <span>Authentic</span>
                    </div>
                    <div class="verify">verify: teach-tribe.com/verify/${escapeHtml(certificateData.certificateId)}</div>
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      // Generate PDF using html2canvas and jsPDF
      const element = document.createElement('div');
      element.innerHTML = htmlContent;
      
      // Download as HTML (since we don't have jsPDF in this version)
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Certificate_${certificateData.certificateId}.html`;
      a.click();
      URL.revokeObjectURL(url);

      setSelectedCertificate(course);
    } catch (error) {
      console.error('Error generating certificate:', error);
    } finally {
      setGeneratingCertificate(false);
    }
  };

  return (
    <>
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Welcome back, {profile?.display_name}! 👋</h1>
        <p className="text-muted-foreground">Continue your learning journey</p>
        <p className="text-xs text-muted-foreground">Workspace: {activeAdmin?.name || 'No workspace selected'}</p>
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

      {/* Skill Graph */}
      {enrolledCourses.length > 0 && selectedSkillCourse && (
        <div className="mt-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Skill Graph</h2>
              <p className="text-sm text-muted-foreground">Visual map of mastered, weak, and blocked concepts.</p>
            </div>
            {skillGraphCourses.length > 1 && (
              <select
                value={selectedSkillCourseId}
                onChange={(event) => setSelectedSkillCourseId(event.target.value)}
                className="max-w-xs rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {skillGraphCourses.map((entry) => (
                  <option key={entry.courseId} value={entry.courseId}>
                    {entry.course.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          <SkillGraph
            course={selectedSkillCourse.course}
            completedLessons={selectedSkillCourse.completedLessons}
            progress={selectedSkillCourse.progress}
            onContinue={() => navigate(`/learn/${selectedSkillCourse.courseId}`)}
          />
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
                        <Progress value={e.progress} className="h-1.5 mb-1" />
                        <p className="text-xs text-muted-foreground text-right mb-3">{e.progress}% • {e.lessonsCompleted}/{e.totalLessons} lessons</p>
                        
                        {e.progress === 100 && (() => {
                          const quizEnabled = !!e.course.quiz?.enabled && (e.course.quiz?.questions.length || 0) > 0;
                          const latestQuizResult = getLatestQuizResult(user.uid, e.courseId);
                          const canDownloadCertificate = !quizEnabled || !!latestQuizResult?.passed;

                          if (!canDownloadCertificate) {
                            return (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  navigate(`/quiz/${e.courseId}`);
                                }}
                              >
                                Take Final Quiz
                              </Button>
                            );
                          }

                          return (
                          <Button 
                            size="sm" 
                            variant="success"
                            className="w-full"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              handleDownloadCertificate(e);
                            }}
                            disabled={generatingCertificate}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            {generatingCertificate ? 'Generating...' : 'Certificate'}
                          </Button>
                          );
                        })()}
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
          {workspaceCourses
            .filter(c => c.isPublished && (c.isLiveVersion ?? true) && (c.versionStatus ? c.versionStatus === 'live' : true))
            .filter(c => !enrollments.find(e => e.courseId === c.id))
            .slice(0, 3)
            .map(c => (
            <div key={c.id} className="cursor-pointer rounded-xl border border-border bg-card overflow-hidden transition-all hover:card-shadow-hover"
              onClick={() => navigate(`/course/${c.id}`)}>
              <img src={c.thumbnail} alt="" className="h-36 w-full object-cover" />
              <div className="p-4">
                <h3 className="mb-1 font-semibold text-sm line-clamp-2">{c.title}</h3>
                <p className="text-xs text-muted-foreground">{c.instructorName} · {c.rating} ⭐</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Certificate Generated Dialog */}
    <Dialog open={!!selectedCertificate} onOpenChange={(open) => !open && setSelectedCertificate(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            🎉 Congratulations!
          </DialogTitle>
          <DialogDescription>
            You have successfully completed <strong>{selectedCertificate?.course.title}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-success bg-success/10 p-4">
            <p className="text-sm text-success font-semibold">✓ Certificate Generated</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your certificate has been generated and is ready for download. You can print it or share it with others.
            </p>
          </div>
          <div className="text-sm space-y-2">
            <p><strong>Student:</strong> {profile?.display_name}</p>
            <p><strong>Course:</strong> {selectedCertificate?.course.title}</p>
            <p><strong>Completed:</strong> {new Date().toLocaleDateString()}</p>
            <p><strong>Course Level:</strong> {selectedCertificate?.course.level || 'Intermediate'}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setSelectedCertificate(null)}>Close</Button>
          <Button 
            onClick={() => handleDownloadCertificate(selectedCertificate)}
            disabled={generatingCertificate}
          >
            <Download className="h-4 w-4 mr-2" />
            {generatingCertificate ? 'Generating...' : 'Download Certificate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default StudentDashboard;
