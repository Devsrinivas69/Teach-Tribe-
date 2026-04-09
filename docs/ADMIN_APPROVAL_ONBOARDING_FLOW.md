# Admin Approval Onboarding Flow

## Goal
Allow a new admin to request access without self-registering as admin. A master admin reviews requests, approves them, and the system automatically:
1. Creates/updates the admin user account.
2. Creates the requested admin workspace.
3. Assigns the user as admin in that workspace.
4. Emails login credentials to the applicant.

## Implemented Components

### Frontend
- Signup page includes a dedicated **Apply As Admin** section:
  - Applicant full name
  - Applicant email
  - Preferred workspace name
- Submission endpoint:
  - `POST /api/auth/admin-access/apply`

### Master Admin Dashboard
- Added **Admin Access Applications** panel:
  - View pending requests
  - Approve request
  - Reject request (optional reason)
- Approval endpoint:
  - `POST /api/auth/admin-access/approve`
- Rejection endpoint:
  - `POST /api/auth/admin-access/reject`
- List pending endpoint:
  - `GET /api/auth/admin-access/requests?status=pending`

### Backend API
Implemented in `server/routes/auth.js`:
- Validates applicant input.
- Stores request in Firestore collection: `admin_access_requests`.
- Emails master admin notification.
- Verifies master admin via Firebase ID token for review actions.
- On approval:
  - Creates or updates Firebase Auth user with generated strong temporary password.
  - Creates Firestore profile.
  - Sets role to `admin` in `user_roles`.
  - Creates requested workspace in `admin_units`.
  - Creates admin membership in `user_admin_memberships`.
  - Updates request status to `approved`.
  - Writes audit log entry.
  - Sends credential email to applicant.
- On rejection:
  - Updates request status to `rejected` with reviewer metadata.
  - Writes audit log entry.
  - Sends rejection email (if SMTP is configured).

## Firestore Data Created By Approval

### `admin_access_requests/{requestId}`
- `name`
- `email`
- `workspaceName`
- `status` (`pending`, `approved`, `rejected`)
- `requestedAt`
- `reviewedAt`
- `reviewedByUid`
- `reviewedByEmail`
- `reviewNote`
- `provisionedUserId`
- `provisionedAdminId`

### `profiles/{uid}`
- `id`
- `display_name`
- `email`
- `avatar_url`
- `bio`
- `created_at`
- `updated_at`

### `user_roles/{uid}`
- `user_id`
- `role` = `admin`
- `created_at`
- `updated_at`

### `admin_units/{adminId}`
- `name`
- `status` = `active`
- `createdBy`
- `createdAt`
- `source` = `admin_access_approval`

### `user_admin_memberships/{uid_adminId}`
- `userId`
- `adminId`
- `roleUnderAdmin` = `admin`
- `isPrimary` = `true`
- `createdAt`

## Required Environment Variables

### API / Server
- `FIREBASE_SERVICE_ACCOUNT_JSON` or `FIREBASE_SERVICE_ACCOUNT_PATH`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `ADMIN_APPLICATION_FROM_EMAIL` (optional, fallback: `SMTP_USER`)
- `MASTER_ADMIN_EMAIL` (optional, default: `admintechtribe@gmail.com`)
- `FRONTEND_URL` (recommended for email links)

### Frontend
- `VITE_AUTH_API_URL`
  - Example local: `http://localhost:3001/api/auth`
  - Example production: `https://<your-domain>/api/auth`

## End-to-End Working Steps

1. Applicant opens signup page.
2. Applicant fills **Apply As Admin** form with:
   - name
   - email
   - preferred workspace name
3. Frontend calls `POST /api/auth/admin-access/apply`.
4. Backend stores request in `admin_access_requests` as `pending`.
5. Backend sends notification email to master admin (`admintechtribe@gmail.com` by default).
6. Master admin opens Master Admin Dashboard.
7. Dashboard loads pending requests from `GET /api/auth/admin-access/requests?status=pending` using master admin ID token.
8. Master admin clicks **Approve**.
9. Backend:
   - verifies master admin token/email
   - creates/updates auth user
   - generates temporary password
   - creates workspace with requested name
   - assigns admin role and membership
   - updates request to `approved`
   - sends credentials email to applicant
10. Applicant receives credentials email and logs in.
11. Applicant lands in admin workflow with their own workspace provisioned.

## Security Notes
- Admin self-registration is blocked on normal signup flow.
- Approval/rejection endpoints are protected by Firebase ID token verification and master-admin email check.
- Password is generated server-side only and emailed directly to applicant.
- All provisioning writes are executed server-side using Firebase Admin SDK.
- Audit log entries are created for approval/rejection actions.
