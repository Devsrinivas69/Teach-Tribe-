/**
 * useVideoSuggestions Hook
 * Manages video suggestion analysis and approval workflow
 */

import { useState, useCallback, useMemo } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { auth } from '@/lib/firebase';
import type { CourseContent, VideoSuggestion } from '@/types/videoSuggestions';

interface AnalysisResult {
  keywords: string[];
  searchQueries: string[];
  suggestions: VideoSuggestion[];
  totalFound: number;
}

interface UseVideoSuggestionsReturn {
  loading: boolean;
  error: string | null;
  suggestions: VideoSuggestion[];
  analysis: AnalysisResult | null;
  analyzeCourse: (courseId: string, course: CourseContent) => Promise<void>;
  saveSuggestions: (courseId: string, suggestions: VideoSuggestion[]) => Promise<void>;
  approveSuggestion: (suggestionId: string, courseId: string) => Promise<void>;
  rejectSuggestion: (suggestionId: string, reason: string) => Promise<void>;
  fetchSuggestions: (courseId: string, status?: string) => Promise<void>;
}

const getAuthToken = async (): Promise<string> => {
  try {
    const user = auth.currentUser;
    if (!user) return '';
    return await user.getIdToken();
  } catch {
    return '';
  }
};

export const useVideoSuggestions = (): UseVideoSuggestionsReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<VideoSuggestion[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const API_BASE_URL = useMemo(
    () => import.meta.env.VITE_VIDEO_API_URL || 'http://localhost:3001/api/videos',
    []
  );

  const analyzeCourse = useCallback(
    async (courseId: string, course: CourseContent) => {
      setLoading(true);
      setError(null);

      try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/analyze-and-suggest`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
            'x-user-role': 'admin'
          },
          body: JSON.stringify({ courseId, course })
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }

        const data = await response.json();

        setAnalysis({
          keywords: data.analysis.keywords,
          searchQueries: data.analysis.searchQueries,
          suggestions: data.suggestions,
          totalFound: data.totalFound
        });

        setSuggestions(data.suggestions);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to analyze course';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [API_BASE_URL]
  );

  const saveSuggestions = useCallback(
    async (courseId: string, suggestionsToSave: VideoSuggestion[]) => {
      setLoading(true);
      setError(null);

      try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/save-suggestions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
            'x-user-role': 'admin'
          },
          body: JSON.stringify({ courseId, suggestions: suggestionsToSave })
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.failed > 0) {
          setError(`Failed to save ${data.failed} suggestions`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save suggestions';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [API_BASE_URL]
  );

  const approveSuggestion = useCallback(
    async (suggestionId: string, courseId: string) => {
      setLoading(true);
      setError(null);

      try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/approve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
            'x-user-role': 'admin'
          },
          body: JSON.stringify({ suggestionId, courseId })
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to approve video';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [API_BASE_URL]
  );

  const rejectSuggestion = useCallback(
    async (suggestionId: string, reason: string) => {
      setLoading(true);
      setError(null);

      try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/reject`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
            'x-user-role': 'admin'
          },
          body: JSON.stringify({ suggestionId, reason })
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to reject video';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [API_BASE_URL]
  );

  const fetchSuggestions = useCallback(
    async (courseId: string, status = 'pending') => {
      setLoading(true);
      setError(null);

      try {
        const q = query(
          collection(db, 'video_suggestions'),
          where('course_id', '==', courseId),
          where('status', '==', status),
          orderBy('engagement_score', 'desc')
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as VideoSuggestion[];
        setSuggestions(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch suggestions';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    error,
    suggestions,
    analysis,
    analyzeCourse,
    saveSuggestions,
    approveSuggestion,
    rejectSuggestion,
    fetchSuggestions
  };
};
