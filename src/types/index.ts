export type UserRole = 'student' | 'instructor' | 'admin' | 'master_admin';
export type AdminStatus = 'active' | 'upcoming';

export interface AdminUnit {
  id: string;
  name: string;
  status: AdminStatus;
  createdBy?: string;
  createdAt?: string;
}

export interface UserAdminMembership {
  id: string;
  userId: string;
  adminId: string;
  roleUnderAdmin: 'student' | 'instructor' | 'admin';
  isPrimary: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  avatar: string;
  bio: string;
  enrolledCourses: string[];
  createdCourses: string[];
  createdAt: string;
}

export interface Lesson {
  id: string;
  title: string;
  videoUrl: string;
  duration: string;
  description: string;
  isFree: boolean;
  resources: { name: string; url: string }[];
}

export interface Section {
  id: string;
  title: string;
  lessons: Lesson[];
}

export type QuizQuestionType = 'mcq' | 'text';

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  prompt: string;
  options?: string[];
  correctOptionIndex?: number;
  modelAnswer?: string;
  acceptedAnswers?: string[];
  requiredKeywords?: string[];
  marks: number;
}

export interface CourseQuiz {
  enabled: boolean;
  passPercentage: number;
  maxAttempts: number;
  questions: QuizQuestion[];
}

export interface QuizQuestionResult {
  questionId: string;
  answer: string;
  isCorrect: boolean;
  score: number;
  maxScore: number;
  reason: string;
}

export interface QuizAttemptSummary {
  totalScore: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  attemptedAt: string;
  attemptNumber: number;
  results: QuizQuestionResult[];
}

export interface Review {
  id: string;
  courseId: string;
  studentId: string;
  studentName: string;
  studentAvatar: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Course {
  id: string;
  adminId?: string;
  versionGroupId?: string;
  versionNumber?: number;
  versionStatus?: 'draft' | 'live';
  isLiveVersion?: boolean;
  previousVersionId?: string;
  title: string;
  shortDescription: string;
  description: string;
  instructor: string;
  instructorName: string;
  instructorAvatar: string;
  thumbnail: string;
  price: number;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  language: string;
  curriculum: Section[];
  enrollmentCount: number;
  rating: number;
  reviewCount: number;
  reviews: Review[];
  isPublished: boolean;
  whatYouLearn: string[];
  requirements: string[];
  quiz?: CourseQuiz;
  totalDuration: string;
  totalLessons: number;
  createdAt: string;
  updatedAt: string;
}

export interface SafeCourse {
  id: string;
  adminId?: string;
  versionGroupId?: string;
  versionNumber?: number;
  versionStatus?: 'draft' | 'live';
  isLiveVersion?: boolean;
  previousVersionId?: string;
  title: string;
  shortDescription: string;
  description: string;
  instructor: string;
  instructorName: string;
  instructorAvatar: string;
  thumbnail: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  language: string;
  curriculum: Section[];
  enrollmentCount: number;
  rating: number;
  reviewCount: number;
  reviews: Review[];
  isPublished: boolean;
  whatYouLearn: string[];
  requirements: string[];
  quiz?: CourseQuiz;
  totalDuration: string;
  totalLessons: number;
  createdAt: string;
  updatedAt: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  progress: number;
  completedLessons: string[];
  enrolledAt: string;
  completedAt: string | null;
  quizAttempts?: QuizAttemptSummary[];
  latestQuizResult?: QuizAttemptSummary | null;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: 'enrollment' | 'completion' | 'review' | 'update';
  isRead: boolean;
  createdAt: string;
}
