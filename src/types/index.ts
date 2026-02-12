export type UserRole = 'student' | 'instructor' | 'admin';

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
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: 'enrollment' | 'completion' | 'review' | 'update';
  isRead: boolean;
  createdAt: string;
}
