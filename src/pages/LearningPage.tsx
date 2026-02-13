import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Play, CheckCircle2, Lock, ChevronLeft, ChevronRight as Next, PanelLeftClose, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCourseStore } from '@/stores/courseStore';
import { useAuth } from '@/hooks/useAuth';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

const LearningPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { courses, getEnrollment, completeLesson } = useCourseStore();
  const { user } = useAuth();
  const { toast } = useToast();

  const course = courses.find(c => c.id === courseId);
  const enrollment = user && course ? getEnrollment(user.id, course.id) : undefined;

  const allLessons = useMemo(() => course?.curriculum.flatMap(s => s.lessons) || [], [course]);
  const [currentLessonId, setCurrentLessonId] = useState(allLessons[0]?.id || '');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openSections, setOpenSections] = useState<string[]>(course?.curriculum.map(s => s.id) || []);
  const [notes, setNotes] = useState<{ id: string; text: string }[]>([]);
  const [noteText, setNoteText] = useState('');

  if (!course || !user) return <div className="flex min-h-screen items-center justify-center"><p>Course not found. <Button variant="link" onClick={() => navigate('/courses')}>Browse courses</Button></p></div>;
  if (!enrollment) { navigate(`/course/${courseId}`); return null; }

  const currentLesson = allLessons.find(l => l.id === currentLessonId) || allLessons[0];
  const currentIndex = allLessons.findIndex(l => l.id === currentLessonId);

  const toggleSection = (id: string) => setOpenSections(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const handleComplete = () => {
    completeLesson(user.id, course.id, currentLessonId);
    toast({ title: 'Lesson completed!' });
    const updated = useCourseStore.getState().getEnrollment(user.id, course.id);
    if (updated?.progress === 100) {
      toast({ title: '🎉 Congratulations!', description: 'You completed the course! Certificate generated.' });
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
        <div className="relative bg-foreground/5">
          <div className="aspect-video w-full">
            <iframe src={currentLesson?.videoUrl} className="h-full w-full" allow="autoplay; fullscreen" allowFullScreen title={currentLesson?.title} />
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
