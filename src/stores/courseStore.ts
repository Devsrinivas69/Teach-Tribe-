import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Course, Enrollment, Review } from '@/types';
import { courses as mockCourses, enrollments as mockEnrollments } from '@/data/mockData';

interface CourseState {
  courses: Course[];
  enrollments: Enrollment[];
  darkMode: boolean;
  toggleDarkMode: () => void;
  enrollInCourse: (studentId: string, courseId: string) => void;
  isEnrolled: (studentId: string, courseId: string) => boolean;
  getEnrollment: (studentId: string, courseId: string) => Enrollment | undefined;
  completeLesson: (studentId: string, courseId: string, lessonId: string) => void;
  addReview: (review: Review) => void;
  addCourse: (course: Course) => void;
  getStudentEnrollments: (studentId: string) => Enrollment[];
  getInstructorCourses: (instructorId: string) => Course[];
}

export const useCourseStore = create<CourseState>()(
  persist(
    (set, get) => ({
      courses: mockCourses,
      enrollments: mockEnrollments,
      darkMode: false,
      toggleDarkMode: () => {
        set(s => {
          const next = !s.darkMode;
          document.documentElement.classList.toggle('dark', next);
          return { darkMode: next };
        });
      },
      enrollInCourse: (studentId, courseId) => {
        const { enrollments, courses } = get();
        if (enrollments.find(e => e.studentId === studentId && e.courseId === courseId)) return;
        const newEnrollment: Enrollment = {
          id: `e-${Date.now()}`, studentId, courseId, progress: 0,
          completedLessons: [], enrolledAt: new Date().toISOString(), completedAt: null,
        };
        const updatedCourses = courses.map(c => c.id === courseId ? { ...c, enrollmentCount: c.enrollmentCount + 1 } : c);
        set({ enrollments: [...enrollments, newEnrollment], courses: updatedCourses });
      },
      isEnrolled: (studentId, courseId) => get().enrollments.some(e => e.studentId === studentId && e.courseId === courseId),
      getEnrollment: (studentId, courseId) => get().enrollments.find(e => e.studentId === studentId && e.courseId === courseId),
      completeLesson: (studentId, courseId, lessonId) => {
        set(state => {
          const enrollments = state.enrollments.map(e => {
            if (e.studentId !== studentId || e.courseId !== courseId) return e;
            if (e.completedLessons.includes(lessonId)) return e;
            const completed = [...e.completedLessons, lessonId];
            const course = state.courses.find(c => c.id === courseId);
            const total = course?.curriculum.reduce((acc, s) => acc + s.lessons.length, 0) || 1;
            const progress = Math.round((completed.length / total) * 100);
            return { ...e, completedLessons: completed, progress, completedAt: progress === 100 ? new Date().toISOString() : null };
          });
          return { enrollments };
        });
      },
      addReview: (review) => {
        set(state => {
          const courses = state.courses.map(c => {
            if (c.id !== review.courseId) return c;
            const reviews = [...c.reviews, review];
            const avgRating = reviews.reduce((a, r) => a + r.rating, 0) / reviews.length;
            return { ...c, reviews, rating: Math.round(avgRating * 10) / 10, reviewCount: c.reviewCount + 1 };
          });
          return { courses };
        });
      },
      addCourse: (course) => set(s => ({ courses: [...s.courses, course] })),
      getStudentEnrollments: (studentId) => get().enrollments.filter(e => e.studentId === studentId),
      getInstructorCourses: (instructorId) => get().courses.filter(c => c.instructor === instructorId),
    }),
    { name: 'academia-courses' }
  )
);
