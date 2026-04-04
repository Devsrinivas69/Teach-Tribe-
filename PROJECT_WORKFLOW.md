# Teach-Tribe Project Workflow

## 1. Application Startup Workflow

1. `src/main.tsx` mounts the React app.
2. `src/App.tsx` initializes providers in this order:
   - `QueryClientProvider`
   - `TooltipProvider`
   - `BrowserRouter`
   - `AuthProvider`
   - `ErrorBoundary`
3. Global layout loads:
   - `Navbar`
   - route content
   - `Footer`

## 2. Authentication and Role Workflow

1. `AuthProvider` in `src/hooks/useAuth.tsx` listens to Firebase auth state.
2. On login/signup, user profile and role are loaded from Firestore.
3. Role and workspace membership are resolved using:
   - `profiles`
   - `user_roles`
   - `admin_units`
   - `user_admin_memberships`
4. Route access is enforced by `src/components/ProtectedRoute.tsx`.
5. Dashboard redirection logic is centralized in `src/pages/Index.tsx`.

## 3. Routing and Page Workflow

1. Public routes:
   - `/`
   - `/courses`
   - `/course/:id`
   - `/login`
   - `/signup`
2. Protected routes include learning, quiz, dashboards, profile, and workspace switch.
3. Role-based routes:
   - student: `/dashboard/student`, `/quiz/:courseId`
   - instructor: `/dashboard/instructor`, `/create-course`
   - admin: `/dashboard/admin`
   - master admin: `/dashboard/master-admin`

## 4. Course and Enrollment Workflow

1. Central state is managed by `src/stores/courseStore.ts` (Zustand).
2. Courses and enrollments are loaded from Firestore with local fallback data.
3. Student flow:
   - Browse catalog
   - Open course detail
   - Enroll (`enrollInCourse`)
   - Learn lessons (`completeLesson`)
   - Attempt quiz (`saveQuizAttempt`)
4. Instructor flow:
   - Create draft course
   - Publish version (`publishCourseVersion`)
   - Manage live/draft versions

## 5. Learning and Quiz Workflow

1. `LearningPage` loads course curriculum and enrollment progress.
2. Lesson video playback is handled by `YouTubeEmbed` and utility parsers in `src/lib/youtubeUtils.ts`.
3. Quiz workflow (`CourseQuizPage`):
   - Render questions
   - Evaluate answers via `src/lib/quizEvaluator.ts`
   - Save attempt summary to enrollment record

## 6. Admin and Master Admin Workflow

1. Admin dashboard handles workspace-scoped course/user monitoring.
2. Master admin dashboard handles:
   - create admin workspace
   - assign users to workspace
   - create managed users
   - run default admin migration
3. Sensitive actions are audit-logged to `admin_audit_logs`.

## 7. Video Suggestion Workflow (Backend Service)

1. Server entry: `server/api.js`.
2. Route module: `server/routes/videoSuggestions.js`.
3. Processing pipeline:
   - Analyze course text (`server/services/keywordExtractor.js`)
   - Query YouTube API (`server/services/youtubeSearch.js`)
   - Return ranked embeddable suggestions
4. Review operations include save, approve, and reject suggestion endpoints.

## 8. Data and Integration Workflow

1. Primary integration: Firebase Auth + Firestore.
2. Secondary integration: YouTube Data API.
3. Optional integration path in server routes references Supabase client for suggestion persistence.

## 9. Error Handling Workflow

1. UI crashes are caught by `ErrorBoundary`.
2. Async operations use `try/catch` with toast feedback.
3. Backend uses Express error middleware and request validation.

## 10. Build and Test Workflow

1. Development: `npm run dev`
2. Production build: `npm run build`
3. Tests: `npm run test`

---

This file was generated to provide an end-to-end workflow map of the Teach-Tribe project and is intended to be shipped with archive exports.