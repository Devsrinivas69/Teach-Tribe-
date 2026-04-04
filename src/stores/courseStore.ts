import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  increment,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Course, Enrollment, QuizAttemptSummary, Review } from '@/types';
import { courses as mockCourses, enrollments as mockEnrollments } from '@/data/mockData';

const makeEnrollmentDocId = (studentId: string, courseId: string) => `${studentId}_${courseId}`;

const uniqueLessons = (lessonIds: string[]) => Array.from(new Set(lessonIds));

const mergeQuizAttempts = (attempts: QuizAttemptSummary[]) => {
  const byKey = new Map<string, QuizAttemptSummary>();

  for (const attempt of attempts) {
    const key = `${attempt.attemptNumber}_${attempt.attemptedAt}`;
    byKey.set(key, attempt);
  }

  return Array.from(byKey.values()).sort((a, b) => a.attemptNumber - b.attemptNumber);
};

const pickPrimaryEnrollment = (items: Enrollment[]): Enrollment | undefined => {
  if (items.length === 0) return undefined;

  return [...items].sort((a, b) => {
    const completedDiff = (b.completedLessons?.length || 0) - (a.completedLessons?.length || 0);
    if (completedDiff !== 0) return completedDiff;

    const progressDiff = (b.progress || 0) - (a.progress || 0);
    if (progressDiff !== 0) return progressDiff;

    return (b.enrolledAt || '').localeCompare(a.enrolledAt || '');
  })[0];
};

const mergeEnrollmentsByCourse = (items: Enrollment[]): Enrollment[] => {
  const byCourse = new Map<string, Enrollment>();

  for (const item of items) {
    const key = `${item.studentId}__${item.courseId}`;
    const normalized: Enrollment = {
      ...item,
      completedLessons: uniqueLessons(item.completedLessons || []),
    };

    const existing = byCourse.get(key);
    if (!existing) {
      byCourse.set(key, normalized);
      continue;
    }

    const mergedCompletedLessons = uniqueLessons([
      ...(existing.completedLessons || []),
      ...(normalized.completedLessons || []),
    ]);

    const primary = pickPrimaryEnrollment([existing, normalized]) || normalized;

    byCourse.set(key, {
      ...primary,
      id: primary.id || makeEnrollmentDocId(primary.studentId, primary.courseId),
      completedLessons: mergedCompletedLessons,
      progress: Math.max(existing.progress || 0, normalized.progress || 0),
      completedAt: existing.completedAt || normalized.completedAt || null,
      enrolledAt: (existing.enrolledAt || '') <= (normalized.enrolledAt || '') ? existing.enrolledAt : normalized.enrolledAt,
      quizAttempts: mergeQuizAttempts([...(existing.quizAttempts || []), ...(normalized.quizAttempts || [])]),
      latestQuizResult: normalized.latestQuizResult || existing.latestQuizResult || null,
    });
  }

  return Array.from(byCourse.values());
};

interface CourseState {
  courses: Course[];
  enrollments: Enrollment[];
  darkMode: boolean;
  firestoreLoaded: boolean;
  toggleDarkMode: () => void;
  loadCoursesFromFirestore: () => Promise<void>;
  loadEnrollmentsFromFirestore: (studentId: string) => Promise<void>;
  enrollInCourse: (studentId: string, courseId: string) => Promise<void>;
  isEnrolled: (studentId: string, courseId: string) => boolean;
  getEnrollment: (studentId: string, courseId: string) => Enrollment | undefined;
  completeLesson: (studentId: string, courseId: string, lessonId: string) => Promise<void>;
  addReview: (review: Review) => Promise<void>;
  saveQuizAttempt: (studentId: string, courseId: string, attempt: QuizAttemptSummary) => Promise<void>;
  getLatestQuizResult: (studentId: string, courseId: string) => QuizAttemptSummary | null;
  addCourse: (course: Course) => Promise<void>;
  publishCourseVersion: (courseId: string, instructorId: string) => Promise<{ success: boolean; message: string }>;
  deleteCourse: (courseId: string) => Promise<void>;
  getStudentEnrollments: (studentId: string) => Enrollment[];
  getInstructorCourses: (instructorId: string, adminId?: string | null) => Course[];
}

export const useCourseStore = create<CourseState>()(
  persist(
    (set, get) => ({
      courses: mockCourses,
      enrollments: mockEnrollments,
      darkMode: false,
      firestoreLoaded: false,

      


      toggleDarkMode: () => {
        set(s => {
          const next = !s.darkMode;
          document.documentElement.classList.toggle('dark', next);
          return { darkMode: next };
        });
      },

      loadCoursesFromFirestore: async () => {
        try {
          const normalizeVersion = (course: Course): Course => ({
            ...course,
            versionGroupId: course.versionGroupId || course.id,
            versionNumber: course.versionNumber || 1,
            versionStatus: course.versionStatus || (course.isPublished ? 'live' : 'draft'),
            isLiveVersion: course.isLiveVersion ?? (course.isPublished ? true : false),
          });

          const snapshot = await getDocs(collection(db, 'courses'));
          if (!snapshot.empty) {
            // Build a lookup of fresh curriculum from mockData so video IDs are always current
            const mockById: Record<string, Course> = Object.fromEntries(
              mockCourses.map(c => [c.id, c])
            );
            const firestoreCourses = snapshot.docs.map(d => {
              const data = d.data() as Course;
              const mock = mockById[d.id];
              return normalizeVersion({
                ...data,
                id: d.id,
                // Always use the fresh curriculum from mockData (fixes stale/broken video IDs)
                curriculum: mock?.curriculum ?? data.curriculum,
                totalLessons: mock?.totalLessons ?? data.totalLessons,
              });
            });

            // Keep any default/mock courses that are missing in Firestore so legacy catalog stays intact.
            const firestoreById: Record<string, Course> = Object.fromEntries(
              firestoreCourses.map(c => [c.id, c])
            );
            const restoredDefaults = mockCourses.map((mockCourse) =>
              firestoreById[mockCourse.id]
                ? normalizeVersion({ ...mockCourse, ...firestoreById[mockCourse.id], curriculum: mockCourse.curriculum, totalLessons: mockCourse.totalLessons })
                : normalizeVersion(mockCourse)
            );
            const firestoreOnly = firestoreCourses.filter(c => !mockById[c.id]).map(normalizeVersion);

            set({ courses: [...restoredDefaults, ...firestoreOnly], firestoreLoaded: true });
          } else {
            // No Firestore courses yet – use fresh mockData
            set({ courses: mockCourses.map((course) => ({
              ...course,
              versionGroupId: course.versionGroupId || course.id,
              versionNumber: course.versionNumber || 1,
              versionStatus: course.versionStatus || (course.isPublished ? 'live' : 'draft'),
              isLiveVersion: course.isLiveVersion ?? (course.isPublished ? true : false),
            })), firestoreLoaded: false });
          }
        } catch (err) {
          console.warn('Firestore courses not available, using local data:', err);
          set({ courses: mockCourses.map((course) => ({
            ...course,
            versionGroupId: course.versionGroupId || course.id,
            versionNumber: course.versionNumber || 1,
            versionStatus: course.versionStatus || (course.isPublished ? 'live' : 'draft'),
            isLiveVersion: course.isLiveVersion ?? (course.isPublished ? true : false),
          })) });
        }
      },

      loadEnrollmentsFromFirestore: async (studentId: string) => {
        try {
          const q = query(
            collection(db, 'enrollments'),
            where('studentId', '==', studentId)
          );
          const snapshot = await getDocs(q);
          const firestoreEnrollments = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data(),
          })) as Enrollment[];

          // Always replace with canonical Firestore result for this student.
          // This avoids stale mock/local enrollments after returning to the app.
          set({ enrollments: mergeEnrollmentsByCourse(firestoreEnrollments) });
        } catch (err) {
          console.warn('Firestore enrollments not available, using local data:', err);
        }
      },

      enrollInCourse: async (studentId, courseId) => {
        const { enrollments, courses } = get();
        if (enrollments.find(e => e.studentId === studentId && e.courseId === courseId)) return;

        const enrollmentDocId = makeEnrollmentDocId(studentId, courseId);

        // Guard against duplicate enrollment docs created in older app versions.
        try {
          const existingQuery = query(
            collection(db, 'enrollments'),
            where('studentId', '==', studentId),
            where('courseId', '==', courseId)
          );
          const existingSnapshot = await getDocs(existingQuery);
          if (!existingSnapshot.empty) {
            const existingEnrollments = existingSnapshot.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            })) as Enrollment[];

            set({ enrollments: mergeEnrollmentsByCourse([...enrollments, ...existingEnrollments]) });
            return;
          }
        } catch (err) {
          console.warn('Firestore enrollment pre-check failed:', err);
        }

        const newEnrollment: Enrollment = {
          id: enrollmentDocId,
          studentId,
          courseId,
          progress: 0,
          completedLessons: [],
          enrolledAt: new Date().toISOString(),
          completedAt: null,
        };

        const updatedCourses = courses.map(c =>
          c.id === courseId ? { ...c, enrollmentCount: c.enrollmentCount + 1 } : c
        );
        set({ enrollments: mergeEnrollmentsByCourse([...enrollments, newEnrollment]), courses: updatedCourses });

        // Sync to Firestore — use setDoc so Firestore doc ID matches local enrollment ID
        try {
          await setDoc(doc(db, 'enrollments', enrollmentDocId), newEnrollment);
          const courseRef = doc(db, 'courses', courseId);
          await updateDoc(courseRef, { enrollmentCount: increment(1) });
        } catch (err) {
          console.warn('Firestore enrollment sync failed:', err);
        }
      },

      isEnrolled: (studentId, courseId) =>
        mergeEnrollmentsByCourse(get().enrollments).some(e => e.studentId === studentId && e.courseId === courseId),

      getEnrollment: (studentId, courseId) =>
        pickPrimaryEnrollment(
          mergeEnrollmentsByCourse(get().enrollments).filter(e => e.studentId === studentId && e.courseId === courseId)
        ),

      completeLesson: async (studentId, courseId, lessonId) => {
        let updatedEnrollment: Enrollment | undefined;

        set(state => {
          const matching = state.enrollments.filter(e => e.studentId === studentId && e.courseId === courseId);
          const primary = pickPrimaryEnrollment(matching);
          if (!primary) return { enrollments: state.enrollments };

          const course = state.courses.find(c => c.id === courseId);
          const total = course?.curriculum.reduce((acc, s) => acc + s.lessons.length, 0) || 1;

          const completed = uniqueLessons([...(primary.completedLessons || []), lessonId]);
          const progress = Math.round((completed.length / total) * 100);

          updatedEnrollment = {
            ...primary,
            id: makeEnrollmentDocId(studentId, courseId),
            completedLessons: completed,
            progress,
            completedAt: progress === 100 ? new Date().toISOString() : null,
          };

          const others = state.enrollments.filter(e => !(e.studentId === studentId && e.courseId === courseId));
          return { enrollments: mergeEnrollmentsByCourse([...others, updatedEnrollment]) };
        });

        // Sync to Firestore
        if (updatedEnrollment) {
          try {
            const q = query(
              collection(db, 'enrollments'),
              where('studentId', '==', studentId),
              where('courseId', '==', courseId)
            );
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
              await Promise.all(snapshot.docs.map((docSnap) =>
                updateDoc(docSnap.ref, {
                  completedLessons: updatedEnrollment!.completedLessons,
                  progress: updatedEnrollment!.progress,
                  completedAt: updatedEnrollment!.completedAt,
                })
              ));
            }

            // Write canonical enrollment document ID to prevent future duplicates.
            await setDoc(doc(db, 'enrollments', makeEnrollmentDocId(studentId, courseId)), updatedEnrollment, { merge: true });
          } catch (err) {
            console.warn('Firestore lesson completion sync failed:', err);
          }
        }
      },

      addReview: async (review) => {
        set(state => {
          const courses = state.courses.map(c => {
            if (c.id !== review.courseId) return c;
            const reviews = [...c.reviews, review];
            const avgRating = reviews.reduce((a, r) => a + r.rating, 0) / reviews.length;
            return { ...c, reviews, rating: Math.round(avgRating * 10) / 10, reviewCount: c.reviewCount + 1 };
          });
          return { courses };
        });

        // Sync to Firestore
        try {
          await addDoc(collection(db, 'reviews'), review);
        } catch (err) {
          console.warn('Firestore review sync failed:', err);
        }
      },

      saveQuizAttempt: async (studentId, courseId, attempt) => {
        const existingHistory = pickPrimaryEnrollment(
          mergeEnrollmentsByCourse(get().enrollments).filter(e => e.studentId === studentId && e.courseId === courseId)
        )?.quizAttempts || [];
        const mergedHistory = mergeQuizAttempts([...existingHistory, attempt]);

        set((state) => {
          const enrollments = state.enrollments.map((enrollment) => {
            if (enrollment.studentId !== studentId || enrollment.courseId !== courseId) return enrollment;

            return {
              ...enrollment,
              quizAttempts: mergedHistory,
              latestQuizResult: attempt,
            };
          });

          return { enrollments };
        });

        try {
          const q = query(
            collection(db, 'enrollments'),
            where('studentId', '==', studentId),
            where('courseId', '==', courseId)
          );
          const snapshot = await getDocs(q);

          if (!snapshot.empty) {
            await Promise.all(snapshot.docs.map(async (docSnap) => {
              const current = docSnap.data() as Enrollment;
              const existing = current.quizAttempts || [];
              await updateDoc(docSnap.ref, {
                quizAttempts: mergeQuizAttempts([...existing, attempt]),
                latestQuizResult: attempt,
              });
            }));
          }

          await setDoc(doc(db, 'enrollments', makeEnrollmentDocId(studentId, courseId)), {
            studentId,
            courseId,
            quizAttempts: mergedHistory,
            latestQuizResult: attempt,
          }, { merge: true });
        } catch (err) {
          console.warn('Firestore quiz attempt sync failed:', err);
        }
      },

      getLatestQuizResult: (studentId, courseId) => {
        const enrollment = pickPrimaryEnrollment(
          mergeEnrollmentsByCourse(get().enrollments).filter(e => e.studentId === studentId && e.courseId === courseId)
        );
        return enrollment?.latestQuizResult || null;
      },

      addCourse: async (course) => {
        const normalizedCourse: Course = {
          ...course,
          versionGroupId: course.versionGroupId || course.id,
          versionNumber: course.versionNumber || 1,
          versionStatus: course.versionStatus || (course.isPublished ? 'live' : 'draft'),
          isLiveVersion: course.isLiveVersion ?? (course.isPublished ? true : false),
        };

        set((s) => {
          if (!normalizedCourse.isLiveVersion) {
            return { courses: [...s.courses, normalizedCourse] };
          }

          const nextCourses = s.courses.map((existing) => {
            const sameGroup = (existing.versionGroupId || existing.id) === normalizedCourse.versionGroupId;
            const shouldDemote = existing.id !== normalizedCourse.id && (sameGroup || existing.id === normalizedCourse.previousVersionId);
            if (!shouldDemote) return existing;
            return {
              ...existing,
              isLiveVersion: false,
              versionStatus: 'draft',
              isPublished: false,
              updatedAt: new Date().toISOString(),
            };
          });

          return { courses: [...nextCourses, normalizedCourse] };
        });

        // Sync to Firestore
        try {
          await setDoc(doc(db, 'courses', normalizedCourse.id), normalizedCourse);

          if (normalizedCourse.isLiveVersion && normalizedCourse.previousVersionId) {
            const previousDocRef = doc(db, 'courses', normalizedCourse.previousVersionId);
            await updateDoc(previousDocRef, {
              isLiveVersion: false,
              versionStatus: 'draft',
              isPublished: false,
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.warn('Firestore course sync failed:', err);
        }
      },

      publishCourseVersion: async (courseId, instructorId) => {
        const course = get().courses.find((c) => c.id === courseId);
        if (!course) {
          return { success: false, message: 'Course version not found.' };
        }

        if (course.instructor !== instructorId) {
          return { success: false, message: 'You can only publish your own course drafts.' };
        }

        const groupId = course.versionGroupId || course.id;
        const now = new Date().toISOString();

        set((state) => ({
          courses: state.courses.map((item) => {
            const sameGroup = (item.versionGroupId || item.id) === groupId;
            if (!sameGroup) return item;

            if (item.id === courseId) {
              return {
                ...item,
                isLiveVersion: true,
                versionStatus: 'live',
                isPublished: true,
                updatedAt: now,
              };
            }

            if (item.isLiveVersion) {
              return {
                ...item,
                isLiveVersion: false,
                versionStatus: 'draft',
                isPublished: false,
                updatedAt: now,
              };
            }

            return item;
          }),
        }));

        try {
          const sameGroupCourses = get().courses.filter((item) => (item.versionGroupId || item.id) === groupId);
          await Promise.all(sameGroupCourses.map(async (item) => {
            if (item.id === courseId) {
              await updateDoc(doc(db, 'courses', item.id), {
                isLiveVersion: true,
                versionStatus: 'live',
                isPublished: true,
                updatedAt: now,
              });
              return;
            }

            if (item.isLiveVersion) {
              await updateDoc(doc(db, 'courses', item.id), {
                isLiveVersion: false,
                versionStatus: 'draft',
                isPublished: false,
                updatedAt: now,
              });
            }
          }));

          return { success: true, message: 'Draft published as live version.' };
        } catch (err) {
          console.warn('Firestore publish version sync failed:', err);
          return { success: false, message: 'Draft state changed locally, but failed to sync publish to Firestore.' };
        }
      },

      deleteCourse: async (courseId) => {
        set(s => ({ courses: s.courses.filter(c => c.id !== courseId) }));
        try {
          await deleteDoc(doc(db, 'courses', courseId));
        } catch (err) {
          console.warn('Firestore course deletion failed:', err);
        }
      },

      getStudentEnrollments: (studentId) =>
        mergeEnrollmentsByCourse(get().enrollments.filter(e => e.studentId === studentId)),

      getInstructorCourses: (instructorId, adminId) =>
        get().courses.filter(c => c.instructor === instructorId && (!adminId ? true : c.adminId === adminId)),
    }),
    {
      name: 'academia-courses',
      // Only persist UI preferences – never cache courses/enrollments in localStorage
      // because stale cached data would override fresh mockData and break video IDs
      partialize: (state) => ({ darkMode: state.darkMode }),
    }
  )
);
