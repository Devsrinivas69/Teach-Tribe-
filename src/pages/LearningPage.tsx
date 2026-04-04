import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronRight, Play, CheckCircle2, Lock, ChevronLeft, ChevronRight as Next, PanelLeftClose, PanelLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCourseStore } from '@/stores/courseStore';
import { useAuth } from '@/hooks/useAuth';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { getEmbedUrl } from '@/lib/youtubeUtils';

const LearningPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { courses, getEnrollment, completeLesson, loadEnrollmentsFromFirestore, getLatestQuizResult } = useCourseStore();
  const { user, role, activeAdminId } = useAuth();
  const { toast } = useToast();

  const [enrollmentChecked, setEnrollmentChecked] = useState(false);

  const visibleCourses = courses.filter(c => {
    if (role === 'master_admin') return true;
    if (!activeAdminId) return true;
    return !c.adminId || c.adminId === activeAdminId;
  });

  const course = visibleCourses?.find(c => c?.id === courseId);
  const enrollment = user && course ? getEnrollment(user?.uid, course?.id) : undefined;

  const allLessons = useMemo(() => {
    return course?.curriculum?.flatMap(s => s?.lessons) || [];
  }, [course]);

  const [currentLessonId, setCurrentLessonId] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [notes, setNotes] = useState<{ id: string; text: string }[]>([]);
  const [noteText, setNoteText] = useState('');
  const [isVideoLoading, setIsVideoLoading] = useState(true);

  // Load enrollments from Firestore on mount so direct navigation works
  useEffect(() => {
    if (user?.uid) {
      loadEnrollmentsFromFirestore(user.uid).finally(() => setEnrollmentChecked(true));
    }
  }, [user?.uid]);

  // Initialize current lesson when allLessons is first populated
  useEffect(() => {
    if (!currentLessonId && allLessons.length > 0) {
      setCurrentLessonId(allLessons[0]?.id || '');
    }
  }, [allLessons, currentLessonId]);

  // Initialize open sections only once — remove openSections from deps to prevent re-open loop
  useEffect(() => {
    if (course?.curriculum && course.curriculum.length > 0 && openSections.length === 0) {
      setOpenSections(course.curriculum.map(s => s?.id || ''));
    }
  }, [course]); // intentionally omit openSections to avoid forcing re-open when user collapses sections

  // Reset loading state when lesson changes
  useEffect(() => {
    setIsVideoLoading(true);
  }, [currentLessonId]);

  // Redirect only after we've confirmed enrollment status from Firestore
  useEffect(() => {
    if (enrollmentChecked && !enrollment) {
      navigate(`/course/${courseId}`);
    }
  }, [enrollmentChecked, enrollment, courseId, navigate]);

  if (!course || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Course not found. <Button variant="link" onClick={() => navigate('/courses')}>Browse courses</Button></p>
      </div>
    );
  }

  if (!enrollmentChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-muted border-t-primary animate-spin" />
      </div>
    );
  }

  if (!enrollment) return null;

  const currentLesson = allLessons.find(l => l.id === currentLessonId) || allLessons[0];
  const currentIndex = allLessons.findIndex(l => l.id === currentLessonId);

  const toggleSection = (id: string) => setOpenSections(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const handleComplete = async () => {
    await completeLesson(user.uid, course.id, currentLessonId);
    toast({ title: 'Lesson completed!' });
    const updated = useCourseStore.getState().getEnrollment(user.uid, course.id);
    if (updated?.progress === 100) {
      toast({ title: 'Congratulations!', description: 'You completed the course! Certificate generated.' });
    }
  };

  const goToLesson = (direction: 'prev' | 'next') => {
    const idx = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (idx >= 0 && idx < allLessons.length) setCurrentLessonId(allLessons[idx].id);
  };

  const addNote = () => {
    if (!noteText.trim()) return;
    setNotes(prev => [...prev, { id: Date.now().toString(), text: noteText }]);
    setNoteText('');
  };

  const isCompleted = (lessonId: string) => enrollment.completedLessons.includes(lessonId);
  const embedUrl = getEmbedUrl(currentLesson?.videoUrl);
  const latestQuizResult = getLatestQuizResult(user.uid, course.id);

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="w-80 shrink-0 overflow-y-auto border-r border-border bg-card">
          <div className="border-b border-border p-4">
            <h2 className="font-bold text-sm line-clamp-2">{course.title}</h2>
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Progress</span><span>{enrollment.progress}%</span>
              </div>
              <Progress value={enrollment.progress} className="h-2" />
            </div>
          </div>
          <div className="p-2">
            {course.curriculum.map(section => (
              <div key={section.id}>
                <button onClick={() => toggleSection(section.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-accent/50">
                  {openSections.includes(section.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  <span className="line-clamp-1">{section.title}</span>
                </button>
                {openSections.includes(section.id) && section.lessons.map(lesson => (
                  <button key={lesson.id} onClick={() => setCurrentLessonId(lesson.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 pl-8 text-left text-xs transition-colors ${
                      lesson.id === currentLessonId ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent/50'
                    }`}>
                    {isCompleted(lesson.id) ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" /> : <Play className="h-3.5 w-3.5 shrink-0" />}
                    <span className="line-clamp-1 flex-1">{lesson.title}</span>
                    <span className="text-[10px] text-muted-foreground">{lesson.duration}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </Button>
          <span className="text-sm font-medium">{currentLesson?.title}</span>
        </div>

        {/* Video */}
        <div className="w-full bg-foreground/5 px-4 py-4">
          <div className="relative w-full overflow-hidden rounded-lg bg-black" style={{ aspectRatio: '16 / 9', maxHeight: 'calc(100vh - 200px)' }}>
            {embedUrl ? (
              <>
                {isVideoLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="space-y-3">
                      <div className="h-2 w-24 rounded-full bg-white/20 animate-pulse"></div>
                      <p className="text-sm text-white/70">Loading video...</p>
                    </div>
                  </div>
                )}
                <iframe
                  key={`video-${currentLesson?.id}`}
                  src={embedUrl}
                  title={currentLesson?.title || 'Video Player'}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen={true}
                  referrerPolicy="strict-origin-when-cross-origin"
                  loading="eager"
                  className="h-full w-full"
                  onLoad={() => setIsVideoLoading(false)}
                />
              </>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-muted">
                <AlertCircle className="h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Video not available for this lesson</p>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={currentIndex === 0} onClick={() => goToLesson('prev')}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Previous
            </Button>
            <Button variant="outline" size="sm" disabled={currentIndex === allLessons.length - 1} onClick={() => goToLesson('next')}>
              Next <Next className="ml-1 h-4 w-4" />
            </Button>
          </div>
          {isCompleted(currentLessonId) ? (
            <Button variant="outline" size="sm" disabled className="gap-1"><CheckCircle2 className="h-4 w-4 text-success" /> Completed</Button>
          ) : (
            <Button size="sm" onClick={handleComplete} className="bg-primary text-primary-foreground">Mark as Complete</Button>
          )}
        </div>

        {enrollment.progress === 100 && course.quiz?.enabled && (
          <div className="border-b border-border px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div>
                <p className="text-sm font-semibold">Final Quiz Unlocked</p>
                <p className="text-xs text-muted-foreground">
                  {latestQuizResult
                    ? `Latest result: ${latestQuizResult.percentage}% (${latestQuizResult.passed ? 'Passed' : 'Not passed'})`
                    : `Pass mark: ${course.quiz.passPercentage}%`}
                </p>
              </div>
              <Button size="sm" onClick={() => navigate(`/quiz/${course.id}`)}>
                {latestQuizResult ? 'Retake Quiz' : 'Start Quiz'}
              </Button>
            </div>
          </div>
        )}

        {/* Lesson content / Notes */}
        <div className="flex-1 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-bold">{currentLesson?.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{currentLesson?.description}</p>
          </div>
          <div className="border-t border-border pt-4">
            <h4 className="mb-2 font-semibold">Notes</h4>
            <div className="flex gap-2 mb-4">
              <input value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a note..."
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              <Button size="sm" onClick={addNote}>Save</Button>
            </div>
            <div className="space-y-2">
              {notes.map(note => (
                <div key={note.id} className="rounded-lg bg-muted p-3 text-sm">{note.text}</div>
              ))}
              {notes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet. Add your first note above.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearningPage;
