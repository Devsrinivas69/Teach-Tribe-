import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useCourseStore } from '@/stores/courseStore';
import { evaluateQuizQuestion } from '@/lib/quizEvaluator';
import type { QuizAttemptSummary, QuizQuestionResult } from '@/types';

const CourseQuizPage = () => {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const { user, role, activeAdminId } = useAuth();
  const {
    courses,
    getEnrollment,
    loadEnrollmentsFromFirestore,
    saveQuizAttempt,
    getLatestQuizResult,
  } = useCourseStore();

  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [currentEvaluation, setCurrentEvaluation] = useState<QuizQuestionResult | null>(null);
  const [results, setResults] = useState<QuizQuestionResult[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const visibleCourses = useMemo(
    () => courses.filter((c) => !activeAdminId || !c.adminId || c.adminId === activeAdminId),
    [courses, activeAdminId]
  );

  const course = visibleCourses.find((c) => c.id === courseId);
  const enrollment = user && courseId ? getEnrollment(user.uid, courseId) : undefined;
  const latestResult = user && courseId ? getLatestQuizResult(user.uid, courseId) : null;

  useEffect(() => {
    const run = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }
      await loadEnrollmentsFromFirestore(user.uid);
      setLoading(false);
    };
    run();
  }, [user?.uid, loadEnrollmentsFromFirestore]);

  if (!user || role !== 'student') {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-muted border-t-primary animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <p className="text-muted-foreground">Course not found.</p>
        <Button className="mt-4" onClick={() => navigate('/dashboard/student')}>Back to Dashboard</Button>
      </div>
    );
  }

  const quiz = course.quiz;

  if (!quiz?.enabled || quiz.questions.length === 0) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <p className="text-muted-foreground">Quiz is not available for this course yet.</p>
        <Button className="mt-4" onClick={() => navigate(`/learn/${course.id}`)}>Back to Learning</Button>
      </div>
    );
  }

  if (!enrollment || enrollment.progress < 100) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <p className="text-muted-foreground">Complete all course lessons to unlock the quiz.</p>
        <Button className="mt-4" onClick={() => navigate(`/learn/${course.id}`)}>Continue Learning</Button>
      </div>
    );
  }

  const question = quiz.questions[currentIndex];
  const attemptNumber = (enrollment.quizAttempts?.length || 0) + 1;
  const maxScore = quiz.questions.reduce((sum, q) => sum + q.marks, 0);

  const handleSubmitCurrent = () => {
    if (!question) return;
    if (!currentAnswer.trim()) return;

    const evaluation = evaluateQuizQuestion(question, currentAnswer);
    setCurrentEvaluation(evaluation);
  };

  const handleNext = async () => {
    if (!currentEvaluation) return;

    const nextResults = [...results, currentEvaluation];
    setResults(nextResults);
    setCurrentEvaluation(null);
    setCurrentAnswer('');

    const isLastQuestion = currentIndex >= quiz.questions.length - 1;
    if (!isLastQuestion) {
      setCurrentIndex((idx) => idx + 1);
      return;
    }

    const totalScore = nextResults.reduce((sum, item) => sum + item.score, 0);
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const passed = percentage >= quiz.passPercentage;

    const summary: QuizAttemptSummary = {
      totalScore,
      maxScore,
      percentage,
      passed,
      attemptedAt: new Date().toISOString(),
      attemptNumber,
      results: nextResults,
    };

    setSubmitting(true);
    await saveQuizAttempt(user.uid, course.id, summary);
    setSubmitting(false);
  };

  const latestAttempt = getLatestQuizResult(user.uid, course.id) || latestResult;
  const reachedAttemptLimit = (enrollment.quizAttempts?.length || 0) >= quiz.maxAttempts;
  const quizFinished = results.length === quiz.questions.length;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 rounded-xl border border-border bg-card p-5 card-shadow">
        <h1 className="text-2xl font-bold">Final Quiz</h1>
        <p className="text-sm text-muted-foreground">{course.title}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Pass mark: {quiz.passPercentage}% · Max attempts: {quiz.maxAttempts}
        </p>
      </div>

      {latestAttempt && (
        <div className="mb-6 rounded-xl border border-border bg-muted/40 p-4 text-sm">
          <p>
            Last attempt: <strong>{latestAttempt.percentage}%</strong> ({latestAttempt.passed ? 'Passed' : 'Failed'})
          </p>
          <p className="text-xs text-muted-foreground">Attempt #{latestAttempt.attemptNumber}</p>
        </div>
      )}

      {!quizFinished && reachedAttemptLimit ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <p className="font-semibold text-destructive">Maximum attempts reached.</p>
          <p className="text-sm text-muted-foreground mt-1">Contact your instructor to unlock additional attempts.</p>
        </div>
      ) : null}

      {!quizFinished && !reachedAttemptLimit && (
        <div className="rounded-xl border border-border bg-card p-5 card-shadow">
          <div className="mb-4">
            <p className="text-sm font-medium">Question {currentIndex + 1} of {quiz.questions.length}</p>
            <Progress className="mt-2 h-2" value={((currentIndex + 1) / quiz.questions.length) * 100} />
          </div>

          <h2 className="text-lg font-semibold">{question.prompt}</h2>

          {question.type === 'mcq' ? (
            <div className="mt-4 space-y-2">
              {(question.options || []).map((option, idx) => (
                <label key={idx} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2">
                  <input
                    type="radio"
                    name={`q-${question.id}`}
                    checked={currentAnswer === String(idx)}
                    onChange={() => setCurrentAnswer(String(idx))}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          ) : (
            <textarea
              value={currentAnswer}
              onChange={(event) => setCurrentAnswer(event.target.value)}
              placeholder="Type your answer..."
              rows={5}
              className="mt-4 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          )}

          {currentEvaluation ? (
            <div className={`mt-4 rounded-lg border p-3 text-sm ${currentEvaluation.isCorrect ? 'border-success/30 bg-success/10' : 'border-warning/30 bg-warning/10'}`}>
              <div className="flex items-center gap-2">
                {currentEvaluation.isCorrect ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertCircle className="h-4 w-4 text-warning" />}
                <p className="font-medium">{currentEvaluation.isCorrect ? 'Valid answer' : 'Needs improvement'}</p>
              </div>
              <p className="mt-1 text-muted-foreground">{currentEvaluation.reason}</p>
              <p className="mt-1 text-xs text-muted-foreground">Score: {currentEvaluation.score}/{currentEvaluation.maxScore}</p>
            </div>
          ) : null}

          <div className="mt-5 flex justify-end gap-2">
            {!currentEvaluation ? (
              <Button onClick={handleSubmitCurrent} disabled={!currentAnswer.trim()}>
                Validate & Continue
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={submitting}>
                {currentIndex < quiz.questions.length - 1 ? 'Next Question' : (submitting ? 'Saving...' : 'Finish Quiz')}
              </Button>
            )}
          </div>
        </div>
      )}

      {quizFinished && (
        <div className="rounded-xl border border-border bg-card p-6 text-center card-shadow">
          <h2 className="text-2xl font-bold">Quiz Completed</h2>
          {latestAttempt?.passed ? (
            <div className="mt-4">
              <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
              <p className="mt-2 text-lg font-semibold text-success">Passed ({latestAttempt.percentage}%)</p>
            </div>
          ) : (
            <div className="mt-4">
              <XCircle className="mx-auto h-10 w-10 text-destructive" />
              <p className="mt-2 text-lg font-semibold text-destructive">Failed ({latestAttempt?.percentage || 0}%)</p>
            </div>
          )}

          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" onClick={() => navigate(`/learn/${course.id}`)}>Back to Course</Button>
            <Button onClick={() => navigate('/dashboard/student')}>Go to Dashboard</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseQuizPage;
