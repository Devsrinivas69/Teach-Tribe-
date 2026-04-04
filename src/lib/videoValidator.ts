/**
 * Video Validation & Sanitization Utility
 * Ensures all course videos have valid YouTube IDs
 * Validates and converts all URLs to nocookie embed format
 */

import { Course } from '@/types';
import { getEmbedUrl, isValidYoutubeUrl, extractVideoId } from './youtubeUtils';

interface VideoValidationReport {
  courseId: string;
  courseName: string;
  isValid: boolean;
  issues: string[];
  videoCount: number;
  validVideoCount: number;
}

/**
 * Validate all videos in a course
 * @param course - Course object to validate
 * @returns Validation report with issues and statistics
 */
export const validateCourseVideos = (course: Course): VideoValidationReport => {
  const issues: string[] = [];
  let validVideoCount = 0;
  let videoCount = 0;

  course.curriculum.forEach((section) => {
    section.lessons.forEach((lesson) => {
      videoCount++;
      
      if (!lesson.videoUrl) {
        issues.push(`Section "${section.title}", Lesson "${lesson.title}": No video URL provided`);
      } else if (!isValidYoutubeUrl(lesson.videoUrl)) {
        issues.push(`Section "${section.title}", Lesson "${lesson.title}": Invalid video URL format`);
      } else {
        const videoId = extractVideoId(lesson.videoUrl);
        if (!videoId || videoId.length !== 11) {
          issues.push(`Section "${section.title}", Lesson "${lesson.title}": Invalid video ID`);
        } else {
          validVideoCount++;
        }
      }
    });
  });

  return {
    courseId: course.id,
    courseName: course.title,
    isValid: validVideoCount === videoCount,
    issues,
    videoCount,
    validVideoCount,
  };
};

/**
 * Validate all courses in the dataset
 * @param courses - Array of courses to validate
 * @returns Array of validation reports
 */
export const validateAllCourses = (courses: Course[]): VideoValidationReport[] => {
  return courses.map(validateCourseVideos);
};

/**
 * Get sanitized video URL safe for embedding
 * Automatically converts any YouTube format to nocookie embed format
 * @param videoUrl - Raw video URL or ID
 * @param fallbackId - Safe fallback ID if URL is invalid
 * @returns Sanitized embed URL ready for iframe src
 */
export const getSafeVideoUrl = (
  videoUrl: string | undefined | null,
  fallbackId: string = '9bZkp7q19f0'
): string => {
  if (!videoUrl) {
    return `https://www.youtube-nocookie.com/embed/${fallbackId}`;
  }

  const embedUrl = getEmbedUrl(videoUrl);
  if (!embedUrl) {
    console.warn(`[Video Sanitization] Failed for: ${videoUrl}, using fallback`);
    return `https://www.youtube-nocookie.com/embed/${fallbackId}`;
  }

  return embedUrl;
};

/**
 * Sanitize an entire course's video URLs
 * @param course - Course to sanitize
 * @returns Course with all video URLs converted to nocookie format
 */
export const sanitizeCourseVideos = (course: Course): Course => {
  return {
    ...course,
    curriculum: course.curriculum.map((section) => ({
      ...section,
      lessons: section.lessons.map((lesson) => ({
        ...lesson,
        videoUrl: getEmbedUrl(lesson.videoUrl) || lesson.videoUrl,
      })),
    })),
  };
};

/**
 * Get a summary of all video validation issues
 * @param courses - Courses to check
 * @returns Summary string with issue count and details
 */
export const getVideoValidationSummary = (courses: Course[]): string => {
  const reports = validateAllCourses(courses);
  const totalIssues = reports.reduce((sum, r) => sum + r.issues.length, 0);
  const validCourses = reports.filter((r) => r.isValid).length;

  let summary = `Video Validation Summary:\n`;
  summary += `✓ Valid Courses: ${validCourses}/${reports.length}\n`;
  summary += `✗ Issues Found: ${totalIssues}\n`;

  const problematicCourses = reports.filter((r) => !r.isValid);
  if (problematicCourses.length > 0) {
    summary += `\nProblematic Courses:\n`;
    problematicCourses.forEach((report) => {
      summary += `\n${report.courseName}:\n`;
      report.issues.forEach((issue) => {
        summary += `  - ${issue}\n`;
      });
    });
  }

  return summary;
};
