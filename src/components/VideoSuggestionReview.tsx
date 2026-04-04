/**
 * Video Suggestion Review Component
 * Admin interface for reviewing and approving YouTube video suggestions
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Play, Eye, ThumbsUp } from 'lucide-react';
import { useVideoSuggestions } from '@/hooks/useVideoSuggestions';
import { useCourseStore } from '@/stores/courseStore';
import type { VideoSuggestion, CourseContent } from '@/types/videoSuggestions';

interface VideoSuggestionReviewProps {
  courseId?: string;
}

export const VideoSuggestionReview: React.FC<VideoSuggestionReviewProps> = ({ courseId: initialCourseId }) => {
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId || '');
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [analyzingStep, setAnalyzingStep] = useState<'idle' | 'analyzing' | 'completed'>('idle');
  const [autoApproveThreshold, setAutoApproveThreshold] = useState(75);

  const { courses } = useCourseStore();
  const { loading, error, suggestions, analysis, analyzeCourse, saveSuggestions, approveSuggestion, rejectSuggestion } = useVideoSuggestions();

  const currentCourse = courses.find(c => c.id === selectedCourseId);

  const handleAnalyzeCourse = async () => {
    if (!selectedCourseId || !currentCourse) {
      alert('Please select a course');
      return;
    }

    setAnalyzingStep('analyzing');
    try {
      const courseContent: CourseContent = {
        id: currentCourse.id,
        title: currentCourse.title,
        description: currentCourse.description || '',
        topics: [],
        what_you_learn: currentCourse.whatYouLearn || []
      };
      await analyzeCourse(selectedCourseId, courseContent);
      setAnalyzingStep('completed');
    } catch (err) {
      console.error('Analysis failed:', err);
      setAnalyzingStep('idle');
    }
  };

  const handleSaveSuggestions = async () => {
    if (!selectedCourseId || !analysis?.suggestions) {
      alert('No suggestions to save');
      return;
    }

    const suggestionsToSave = Array.from(selectedSuggestions).length > 0
      ? analysis.suggestions.filter(s => selectedSuggestions.has(s.id))
      : analysis.suggestions;

    await saveSuggestions(selectedCourseId, suggestionsToSave);
  };

  const handleApprove = async (videoId: string) => {
    await approveSuggestion(videoId, selectedCourseId);
  };

  const handleReject = async (videoId: string) => {
    const reason = prompt('Reason for rejection (optional):');
    await rejectSuggestion(videoId, reason || 'No reason provided');
  };

  const toggleSuggestionSelection = (videoId: string) => {
    const newSelected = new Set(selectedSuggestions);
    if (newSelected.has(videoId)) {
      newSelected.delete(videoId);
    } else {
      newSelected.add(videoId);
    }
    setSelectedSuggestions(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedSuggestions.size === suggestions.length) {
      setSelectedSuggestions(new Set());
    } else {
      setSelectedSuggestions(new Set(suggestions.map(s => s.id)));
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Video Suggestion Review</h1>
        <p className="text-gray-600">Analyze course content and approve YouTube videos for embedding</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Step 1: Select Course</CardTitle>
          <CardDescription>Choose a course to analyze</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Course</label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a course..." />
                </SelectTrigger>
                <SelectContent>
                  {courses.map(course => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleAnalyzeCourse}
              disabled={loading || !selectedCourseId}
              className="gap-2"
            >
              {loading && analyzingStep === 'analyzing' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Analyze Course'
              )}
            </Button>
          </div>

          {currentCourse && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
              <p><strong>Title:</strong> {currentCourse.title}</p>
              <p><strong>Description:</strong> {currentCourse.description?.substring(0, 100)}...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
            <CardDescription>Extracted keywords and search queries</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Keywords Found:</h4>
              <div className="flex flex-wrap gap-2">
                {analysis.keywords.map(keyword => (
                  <Badge key={keyword} variant="secondary">{keyword}</Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Search Queries:</h4>
              <ul className="space-y-1 text-sm">
                {analysis.searchQueries.map((query, idx) => (
                  <li key={idx} className="text-gray-700">• {query}</li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-sm text-gray-600">
                <strong>Found {analysis.totalFound} relevant videos</strong>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {suggestions.length > 0 && (
        <Tabs defaultValue="to-review" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="to-review">To Review ({suggestions.length})</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="batch">Batch Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="to-review" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {suggestions.map(video => (
                <VideoSuggestionCard
                  key={video.id}
                  video={video}
                  isSelected={selectedSuggestions.has(video.id)}
                  onToggleSelect={() => toggleSuggestionSelection(video.id)}
                  onApprove={() => handleApprove(video.id)}
                  onReject={() => handleReject(video.id)}
                  loading={loading}
                  autoApproveThreshold={autoApproveThreshold}
                />
              ))}
            </div>

            {suggestions.length > 0 && (
              <Button
                onClick={handleSaveSuggestions}
                disabled={loading}
                className="w-full gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  `Save ${selectedSuggestions.size > 0 ? selectedSuggestions.size : suggestions.length} Suggestions`
                )}
              </Button>
            )}
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <SuggestionAnalytics suggestions={suggestions} />
          </TabsContent>

          <TabsContent value="batch" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Batch Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Auto-Approve Threshold (Engagement Score %)</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={autoApproveThreshold}
                    onChange={e => setAutoApproveThreshold(parseInt(e.target.value))}
                    className="w-full mt-2"
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    Videos with engagement score ≥ {autoApproveThreshold}% will be highlighted for bulk approval
                  </p>
                </div>

                <div>
                  <Button variant="outline" className="w-full" onClick={toggleSelectAll}>
                    {selectedSuggestions.size === suggestions.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>

                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-sm">
                    <strong>{selectedSuggestions.size}</strong> suggestions selected
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

interface VideoSuggestionCardProps {
  video: VideoSuggestion;
  isSelected: boolean;
  onToggleSelect: () => void;
  onApprove: () => void;
  onReject: () => void;
  loading: boolean;
  autoApproveThreshold: number;
}

const VideoSuggestionCard: React.FC<VideoSuggestionCardProps> = ({
  video,
  isSelected,
  onToggleSelect,
  onApprove,
  onReject,
  loading,
  autoApproveThreshold
}) => {
  const isHighEngagement = video.engagementScore >= autoApproveThreshold;
  const viewCountFormatted = new Intl.NumberFormat().format(video.viewCount);

  return (
    <Card className={`overflow-hidden ${isSelected ? 'ring-2 ring-blue-500' : ''} ${isHighEngagement ? 'border-green-200 bg-green-50' : ''}`}>
      <div className="flex gap-4 p-4">
        <div className="flex-shrink-0">
          <div
            className="w-32 h-24 bg-gray-300 rounded-lg overflow-hidden cursor-pointer"
            onClick={onToggleSelect}
          >
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="w-full h-full object-cover hover:opacity-75 transition"
            />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold line-clamp-2">{video.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{video.channelTitle}</p>

              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">{video.duration}</Badge>
                <Badge
                  variant={isHighEngagement ? 'default' : 'secondary'}
                  className={isHighEngagement ? 'bg-green-600' : ''}
                >
                  {video.engagementScore?.toFixed(1)}% engagement
                </Badge>
              </div>

              <div className="flex gap-4 text-sm text-gray-500 mt-2">
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {viewCountFormatted}
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsUp className="w-4 h-4" />
                  {video.likeCount}
                </span>
              </div>
            </div>

            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              className="w-5 h-5 mt-1"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(video.watchUrl, '_blank')}
            className="gap-1"
          >
            <Play className="w-4 h-4" />
            Watch
          </Button>

          <Button
            size="sm"
            onClick={onApprove}
            disabled={loading}
            className="gap-1 bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="w-4 h-4" />
            Approve
          </Button>

          <Button
            size="sm"
            variant="destructive"
            onClick={onReject}
            disabled={loading}
            className="gap-1"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </Button>
        </div>
      </div>
    </Card>
  );
};

const SuggestionAnalytics: React.FC<{ suggestions: VideoSuggestion[] }> = ({ suggestions }) => {
  const avgEngagement = suggestions.reduce((sum, s) => sum + (s.engagementScore || 0), 0) / suggestions.length;
  const avgViews = suggestions.reduce((sum, s) => sum + (s.viewCount || 0), 0) / suggestions.length;
  const mostEngaging = suggestions.sort((a, b) => b.engagementScore - a.engagementScore)[0];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Avg. Engagement</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{avgEngagement.toFixed(1)}%</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Total Videos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{suggestions.length}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Avg. Views</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{(avgViews / 1000).toFixed(0)}K</p>
        </CardContent>
      </Card>

      {mostEngaging && (
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Top Recommended Video</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{mostEngaging.title}</p>
            <p className="text-sm text-gray-600 mt-1">{mostEngaging.channelTitle}</p>
            <p className="text-sm mt-2">
              Engagement Score: <strong>{mostEngaging.engagementScore?.toFixed(1)}%</strong>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VideoSuggestionReview;
