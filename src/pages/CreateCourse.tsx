import { useEffect, useState } from 'react';
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Trash2, GripVertical, ChevronRight, Youtube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCourseStore } from '@/stores/courseStore';
import { categories } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import type { Course, QuizQuestion } from '@/types';
import YouTubeVideoSearch from '@/components/YouTubeVideoSearch';

const steps = ['Basic Info', 'Curriculum', 'Course Details', 'Quiz Setup', 'Review & Publish'];

const makeDefaultQuestion = (): QuizQuestion => ({
  id: `qq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  type: 'text',
  prompt: '',
  modelAnswer: '',
  acceptedAnswers: [],
  requiredKeywords: [],
  marks: 1,
});

const sanitizeQuizQuestions = (questions: QuizQuestion[]) =>
  questions
    .filter((q) => q.prompt.trim().length > 0)
    .map((q) => {
      if (q.type === 'mcq') {
        const options = (q.options || ['', '', '', '']).map((option) => option.trim());
        const nonEmptyOptions = options.filter(Boolean);
        if (nonEmptyOptions.length < 2) return null;

        const correctIndex = q.correctOptionIndex ?? 0;
        if (correctIndex < 0 || correctIndex >= options.length || !options[correctIndex]) return null;

        return {
          ...q,
          options,
          correctOptionIndex: correctIndex,
          marks: Math.max(1, q.marks || 1),
          acceptedAnswers: [],
          requiredKeywords: [],
          modelAnswer: undefined,
        };
      }

      return {
        ...q,
        acceptedAnswers: q.acceptedAnswers?.filter(Boolean) || [],
        requiredKeywords: q.requiredKeywords?.filter(Boolean) || [],
        modelAnswer: (q.modelAnswer || '').trim(),
        marks: Math.max(1, q.marks || 1),
        options: undefined,
        correctOptionIndex: undefined,
      };
    })
    .filter((q): q is QuizQuestion => !!q);

const CreateCourse = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, role, activeAdminId } = useAuth();
  const { addCourse, courses } = useCourseStore();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const versionFromId = searchParams.get('versionFrom');
  const sourceCourse = versionFromId ? courses.find((course) => course.id === versionFromId) : null;
  const [prefilled, setPrefilled] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [shortDesc, setShortDesc] = useState('');
  const [description, setDescription] = useState('');
  const [whatYouLearn, setWhatYouLearn] = useState(['']);
  const [requirements, setRequirements] = useState(['']);
  const [sections, setSections] = useState<{ title: string; lessons: { title: string; videoUrl: string; duration: string }[] }[]>([
    { title: 'Section 1', lessons: [{ title: '', videoUrl: '', duration: '' }] },
  ]);
  const [quizEnabled, setQuizEnabled] = useState(true);
  const [quizPassPercentage, setQuizPassPercentage] = useState(70);
  const [quizMaxAttempts, setQuizMaxAttempts] = useState(3);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([makeDefaultQuestion()]);
  const [suggestedQuestions, setSuggestedQuestions] = useState<QuizQuestion[]>([]);
  const [searchTarget, setSearchTarget] = useState<{ si: number; li: number } | null>(null);

  useEffect(() => {
    if (!sourceCourse || prefilled) return;

    setTitle(sourceCourse.title);
    setCategory(sourceCourse.category);
    setLevel(sourceCourse.level);
    setShortDesc(sourceCourse.shortDescription);
    setDescription(sourceCourse.description);
    setWhatYouLearn(sourceCourse.whatYouLearn.length ? sourceCourse.whatYouLearn : ['']);
    setRequirements(sourceCourse.requirements.length ? sourceCourse.requirements : ['']);
    setQuizEnabled(!!sourceCourse.quiz?.enabled);
    setQuizPassPercentage(sourceCourse.quiz?.passPercentage || 70);
    setQuizMaxAttempts(sourceCourse.quiz?.maxAttempts || 3);
    setQuizQuestions(sourceCourse.quiz?.questions?.length ? sourceCourse.quiz.questions : [makeDefaultQuestion()]);
    setSections(
      sourceCourse.curriculum.map((section, si) => ({
        title: section.title,
        lessons: section.lessons.map((lesson, li) => ({
          title: lesson.title,
          videoUrl: lesson.videoUrl,
          duration: lesson.duration || `${10 + li}:00`,
        })),
      }))
    );
    setPrefilled(true);
  }, [sourceCourse, prefilled]);

  if (!user || role === 'student') return <Navigate to="/" replace />;
  if (!activeAdminId) return <Navigate to="/dashboard/instructor" replace />;

  const addSection = () => setSections([...sections, { title: `Section ${sections.length + 1}`, lessons: [{ title: '', videoUrl: '', duration: '' }] }]);
  const addLesson = (si: number) => {
    const updated = [...sections];
    updated[si].lessons.push({ title: '', videoUrl: '', duration: '' });
    setSections(updated);
  };
  const removeSection = (si: number) => setSections(sections.filter((_, i) => i !== si));
  const removeLesson = (si: number, li: number) => {
    const updated = [...sections];
    updated[si].lessons = updated[si].lessons.filter((_, i) => i !== li);
    setSections(updated);
  };
  const updateSection = (si: number, title: string) => {
    const updated = [...sections];
    updated[si].title = title;
    setSections(updated);
  };
  const updateLesson = (si: number, li: number, field: string, value: string) => {
    const updated = [...sections];
    (updated[si].lessons[li] as any)[field] = value;
    setSections(updated);
  };

  const updateQuestion = (questionId: string, updater: (question: QuizQuestion) => QuizQuestion) => {
    setQuizQuestions((current) => current.map((question) => (question.id === questionId ? updater(question) : question)));
  };

  const addQuestion = (question?: QuizQuestion) => {
    setQuizQuestions((current) => [...current, question || makeDefaultQuestion()]);
  };

  const removeQuestion = (questionId: string) => {
    setQuizQuestions((current) => current.filter((question) => question.id !== questionId));
  };

  const generateQuestionSuggestions = () => {
    const learningGoals = whatYouLearn.map((item) => item.trim()).filter(Boolean);
    const lessonTitles = sections.flatMap((section) => section.lessons.map((lesson) => lesson.title.trim()).filter(Boolean));
    const candidates = [...learningGoals, ...lessonTitles].slice(0, 6);

    const generated = candidates.map((topic, index) => ({
      id: `suggested-${Date.now()}-${index}`,
      type: 'text' as const,
      prompt: `Explain the key idea of "${topic}" and how it is applied in practice.`,
      modelAnswer: `${topic} should be explained with definition, practical use, and one example.`,
      acceptedAnswers: [topic],
      requiredKeywords: topic
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 3)
        .slice(0, 4),
      marks: 1,
    }));

    setSuggestedQuestions(generated);
    toast({
      title: 'Question suggestions ready',
      description: `Generated ${generated.length} suggestions from course outcomes and lesson titles.`,
    });
  };

  const handlePublish = async (isDraft: boolean) => {
    const sanitizedQuizQuestions = sanitizeQuizQuestions(quizQuestions);

    if (quizEnabled && sanitizedQuizQuestions.length === 0) {
      toast({
        title: 'Quiz validation failed',
        description: 'Add at least one valid quiz question before publishing.',
        variant: 'destructive',
      });
      setStep(3);
      return;
    }

    const courseId = `c-${Date.now()}`;
    const versionGroupId = sourceCourse ? (sourceCourse.versionGroupId || sourceCourse.id) : courseId;
    const latestVersionNumber = courses
      .filter((course) => (course.versionGroupId || course.id) === versionGroupId)
      .reduce((max, course) => Math.max(max, course.versionNumber || 1), 0);
    const versionNumber = sourceCourse ? latestVersionNumber + 1 : 1;

    const activeLiveVersion = sourceCourse
      ? courses.find(
          (course) =>
            (course.versionGroupId || course.id) === versionGroupId &&
            (course.isLiveVersion ?? true) &&
            (course.versionStatus ? course.versionStatus === 'live' : true)
        )
      : null;

    const newCourse: Course = {
      id: courseId,
      adminId: activeAdminId,
      versionGroupId,
      versionNumber,
      versionStatus: isDraft ? 'draft' : 'live',
      isLiveVersion: !isDraft,
      previousVersionId: !isDraft ? (activeLiveVersion?.id || sourceCourse?.id) : undefined,
      title,
      shortDescription: shortDesc,
      description,
      instructor: user.uid, instructorName: profile?.display_name || '', instructorAvatar: profile?.avatar_url || '',
      thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&h=400&fit=crop',
      price: 0, category, level, language: 'English',
      curriculum: sections.map((s, si) => ({
        id: `sec-${si}`, title: s.title,
        lessons: s.lessons.map((l, li) => ({
          id: `les-${si}-${li}`, title: l.title, videoUrl: l.videoUrl || 'https://www.youtube.com/embed/dQw4w9WgXcQ',
          duration: l.duration || '10:00', description: '', isFree: li === 0, resources: [],
        })),
      })),
      enrollmentCount: 0, rating: 0, reviewCount: 0, reviews: [], isPublished: !isDraft,
      whatYouLearn: whatYouLearn.filter(Boolean), requirements: requirements.filter(Boolean),
      quiz: {
        enabled: quizEnabled,
        passPercentage: Math.min(100, Math.max(40, quizPassPercentage)),
        maxAttempts: Math.min(10, Math.max(1, quizMaxAttempts)),
        questions: quizEnabled ? sanitizedQuizQuestions : [],
      },
      totalDuration: '0 hours', totalLessons: sections.reduce((a, s) => a + s.lessons.length, 0),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    await addCourse(newCourse);
    toast({
      title: isDraft ? 'Version saved as draft!' : 'Version published as live!',
      description: sourceCourse ? `Created version v${versionNumber} for ${sourceCourse.title}.` : undefined,
    });
    navigate('/dashboard/instructor');
  };

  const handleVideoSelect = (videoId: string, videoTitle: string) => {
    if (!searchTarget) return;
    const { si, li } = searchTarget;
    updateLesson(si, li, 'videoUrl', videoId);
    // Auto-fill lesson title if it's still empty
    const updated = [...sections];
    if (!updated[si].lessons[li].title) {
      updateLesson(si, li, 'title', videoTitle);
    }
    setSearchTarget(null);
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">{sourceCourse ? 'Create New Course Version' : 'Create New Course'}</h1>
      {sourceCourse && (
        <p className="mb-6 text-sm text-muted-foreground">
          Base course: {sourceCourse.title} (v{sourceCourse.versionNumber || 1})
        </p>
      )}

      {/* Step Indicator */}
      <div className="mb-8 flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button onClick={() => setStep(i)} className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>{i + 1}</button>
            <span className={`hidden text-sm sm:inline ${i <= step ? 'font-medium' : 'text-muted-foreground'}`}>{s}</span>
            {i < steps.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
        {step === 0 && (
          <>
            <div>
              <label className="text-sm font-medium">Course Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Complete React Developer Course"
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-sm font-medium">Category *</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring">
                <option value="">Select category</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Level</label>
              <div className="mt-2 flex gap-3">
                {(['Beginner', 'Intermediate', 'Advanced'] as const).map(l => (
                  <button key={l} type="button" onClick={() => setLevel(l)}
                    className={`rounded-lg border px-4 py-2 text-sm transition-all ${level === l ? 'border-primary bg-primary/5 font-medium' : 'border-border hover:border-primary/30'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Short Description</label>
              <textarea value={shortDesc} onChange={e => setShortDesc(e.target.value.slice(0, 120))} maxLength={120}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" rows={2} placeholder="Brief overview (120 chars max)" />
              <p className="text-xs text-muted-foreground text-right">{shortDesc.length}/120</p>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            {sections.map((section, si) => (
              <div key={si} className="rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <input value={section.title} onChange={e => updateSection(si, e.target.value)}
                    className="flex-1 font-medium bg-transparent outline-none" placeholder="Section title" />
                  {sections.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeSection(si)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  )}
                </div>
                {section.lessons.map((lesson, li) => (
                  <div key={li} className="ml-6 mb-2 flex gap-2">
                    <input value={lesson.title} onChange={e => updateLesson(si, li, 'title', e.target.value)} placeholder="Lesson title"
                      className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none" />
                    <input value={lesson.videoUrl} onChange={e => updateLesson(si, li, 'videoUrl', e.target.value)} placeholder="Video ID or URL"
                      className="w-32 rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none hidden sm:block" />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      title="Search YouTube for an embeddable video"
                      className="hidden sm:flex shrink-0 h-8 w-8 text-red-500 border-red-200 hover:bg-red-50 hover:border-red-400"
                      onClick={() => setSearchTarget({ si, li })}
                    >
                      <Youtube className="h-4 w-4" />
                    </Button>
                    <input value={lesson.duration} onChange={e => updateLesson(si, li, 'duration', e.target.value)} placeholder="Duration"
                      className="w-20 rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none" />
                    {section.lessons.length > 1 && (
                      <Button variant="ghost" size="icon" className="shrink-0" onClick={() => removeLesson(si, li)}><Trash2 className="h-3 w-3" /></Button>
                    )}
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="ml-6 mt-1 gap-1" onClick={() => addLesson(si)}>
                  <Plus className="h-3 w-3" /> Add Lesson
                </Button>
              </div>
            ))}
            <Button variant="outline" className="gap-2" onClick={addSection}><Plus className="h-4 w-4" /> Add Section</Button>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <label className="text-sm font-medium">Full Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" rows={4} />
            </div>
            <div>
              <label className="text-sm font-medium">What Students Will Learn</label>
              {whatYouLearn.map((item, i) => (
                <div key={i} className="mt-1 flex gap-2">
                  <input value={item} onChange={e => { const u = [...whatYouLearn]; u[i] = e.target.value; setWhatYouLearn(u); }}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none" placeholder="Learning outcome" />
                  {whatYouLearn.length > 1 && <Button variant="ghost" size="icon" onClick={() => setWhatYouLearn(whatYouLearn.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3" /></Button>}
                </div>
              ))}
              <Button variant="ghost" size="sm" className="mt-1 gap-1" onClick={() => setWhatYouLearn([...whatYouLearn, ''])}><Plus className="h-3 w-3" /> Add</Button>
            </div>
            <div>
              <label className="text-sm font-medium">Requirements</label>
              {requirements.map((item, i) => (
                <div key={i} className="mt-1 flex gap-2">
                  <input value={item} onChange={e => { const u = [...requirements]; u[i] = e.target.value; setRequirements(u); }}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none" placeholder="Requirement" />
                </div>
              ))}
              <Button variant="ghost" size="sm" className="mt-1 gap-1" onClick={() => setRequirements([...requirements, ''])}><Plus className="h-3 w-3" /> Add</Button>
            </div>
          </>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">Final Course Quiz</h3>
                  <p className="text-xs text-muted-foreground">Students take this after completing all lessons.</p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={quizEnabled} onChange={(e) => setQuizEnabled(e.target.checked)} />
                  Enable Quiz
                </label>
              </div>

              {quizEnabled && (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">Pass Percentage</label>
                      <input
                        type="number"
                        min={40}
                        max={100}
                        value={quizPassPercentage}
                        onChange={(e) => setQuizPassPercentage(Number(e.target.value || 70))}
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Max Attempts</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={quizMaxAttempts}
                        onChange={(e) => setQuizMaxAttempts(Number(e.target.value || 3))}
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">AI Assist: Suggest Questions From Course + Videos</p>
                      <Button size="sm" variant="outline" onClick={generateQuestionSuggestions}>Suggest Questions</Button>
                    </div>

                    {suggestedQuestions.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {suggestedQuestions.map((suggested) => (
                          <div key={suggested.id} className="rounded-md border border-border bg-card p-3">
                            <p className="text-sm font-medium">{suggested.prompt}</p>
                            <p className="text-xs text-muted-foreground mt-1">Expected: {suggested.modelAnswer}</p>
                            <Button size="sm" className="mt-2" onClick={() => addQuestion({ ...suggested, id: `qq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` })}>
                              Add This Question
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {quizQuestions.map((question, idx) => (
                      <div key={question.id} className="rounded-lg border border-border p-3">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-sm font-semibold">Question {idx + 1}</p>
                          {quizQuestions.length > 1 && (
                            <Button variant="ghost" size="icon" onClick={() => removeQuestion(question.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="sm:col-span-2">
                            <label className="text-sm font-medium">Prompt</label>
                            <textarea
                              value={question.prompt}
                              onChange={(e) => updateQuestion(question.id, (current) => ({ ...current, prompt: e.target.value }))}
                              rows={2}
                              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Type</label>
                            <select
                              value={question.type}
                              onChange={(e) => updateQuestion(question.id, (current) => ({ ...current, type: e.target.value as 'mcq' | 'text' }))}
                              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                              <option value="text">Text</option>
                              <option value="mcq">MCQ</option>
                            </select>
                          </div>
                        </div>

                        <div className="mt-3">
                          <label className="text-sm font-medium">Marks</label>
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={question.marks}
                            onChange={(e) => updateQuestion(question.id, (current) => ({ ...current, marks: Number(e.target.value || 1) }))}
                            className="mt-1 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm"
                          />
                        </div>

                        {question.type === 'mcq' ? (
                          <div className="mt-3 space-y-2">
                            {(question.options || ['', '', '', '']).map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  checked={(question.correctOptionIndex ?? 0) === optionIndex}
                                  onChange={() => updateQuestion(question.id, (current) => ({ ...current, correctOptionIndex: optionIndex }))}
                                />
                                <input
                                  value={option}
                                  onChange={(e) => updateQuestion(question.id, (current) => {
                                    const nextOptions = [...(current.options || ['', '', '', ''])];
                                    nextOptions[optionIndex] = e.target.value;
                                    return { ...current, options: nextOptions };
                                  })}
                                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                  placeholder={`Option ${optionIndex + 1}`}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-3 space-y-2">
                            <div>
                              <label className="text-sm font-medium">Model Answer</label>
                              <textarea
                                value={question.modelAnswer || ''}
                                onChange={(e) => updateQuestion(question.id, (current) => ({ ...current, modelAnswer: e.target.value }))}
                                rows={2}
                                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Accepted Related Answers (comma separated)</label>
                              <input
                                value={(question.acceptedAnswers || []).join(', ')}
                                onChange={(e) => updateQuestion(question.id, (current) => ({
                                  ...current,
                                  acceptedAnswers: e.target.value.split(',').map((item) => item.trim()).filter(Boolean),
                                }))}
                                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Required Keywords (comma separated)</label>
                              <input
                                value={(question.requiredKeywords || []).join(', ')}
                                onChange={(e) => updateQuestion(question.id, (current) => ({
                                  ...current,
                                  requiredKeywords: e.target.value.split(',').map((item) => item.trim()).filter(Boolean),
                                }))}
                                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button variant="outline" onClick={() => addQuestion()} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Question
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/50 p-6">
              <h3 className="text-lg font-bold mb-4">Course Preview</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Title:</strong> {title || 'Untitled'}</p>
                <p><strong>Category:</strong> {category || 'Not set'}</p>
                <p><strong>Level:</strong> {level}</p>
                <p><strong>Description:</strong> {shortDesc || 'No description'}</p>
                <p><strong>Sections:</strong> {sections.length}</p>
                <p><strong>Total Lessons:</strong> {sections.reduce((a, s) => a + s.lessons.length, 0)}</p>
                <p><strong>Quiz:</strong> {quizEnabled ? `${quizQuestions.filter((q) => q.prompt.trim()).length} question(s), pass ${quizPassPercentage}%` : 'Disabled'}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => handlePublish(true)}>Save as Draft</Button>
              <Button className="flex-1 bg-primary text-primary-foreground" onClick={() => handlePublish(false)}>Publish Course</Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Navigation */}
      {step < 4 && (
        <div className="mt-6 flex justify-between">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep(s => s - 1)}>Back</Button>
          <Button onClick={() => setStep(s => s + 1)} className="bg-primary text-primary-foreground">Next</Button>
        </div>
      )}

      <YouTubeVideoSearch
        open={!!searchTarget}
        onClose={() => setSearchTarget(null)}
        onSelect={handleVideoSelect}
      />
    </div>
  );
};

export default CreateCourse;
