# TeachTribe Project (Short README)

TeachTribe is an online learning platform.
It helps students learn through courses, videos, and guided lessons, while giving instructors and admins tools to manage content.

## What this project does

- Lets users sign up, log in, and access role-based dashboards.
- Shows a course catalog and course detail pages.
- Supports learning pages where students can watch and follow lessons.
- Includes admin and instructor workflows for course and video management.
- Uses a YouTube video suggestion system to recommend useful videos for course topics.

## Main parts of the project

- Frontend app: built with React and TypeScript for the user interface.
- Backend API: handles video suggestion logic and integrations.
- Database layer: uses Supabase for data storage and permissions.
- Shared UI components: reusable building blocks for consistent design.

## Video suggestion feature (simple overview)

- Course content is analyzed to find key topics.
- The system searches YouTube for relevant educational videos.
- Suggestions are scored and shown for review.
- Admins can approve or reject suggestions.
- Approved videos can be shown in the learning experience.

## Who this is for

- Students: browse courses and learn with videos.
- Instructors: create or manage course-related content.
- Admins: review video suggestions and manage platform content.

## Current project status

This repository includes both core e-learning features and an integrated video suggestion workflow.
It is organized for local development and further feature expansion.

## Where to look next

- `README.md` for the main project details.
- `docs/START_HERE.md` for onboarding.
- `docs/PROJECT_SUMMARY.md` for a delivery overview.
