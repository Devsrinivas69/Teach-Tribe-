import { useState } from 'react';
import { Search, Loader2, Youtube, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';

interface YouTubeResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
}

interface YouTubeVideoSearchProps {
  open: boolean;
  onClose: () => void;
  onSelect: (videoId: string, title: string) => void;
}

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY as string;

const YouTubeVideoSearch = ({ open, onClose, onSelect }: YouTubeVideoSearchProps) => {
  const { role } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<YouTubeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  // Only instructors and admins may use this component
  if (role !== 'instructor' && role !== 'admin') return null;

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    if (!API_KEY) {
      setError('YouTube API key is not configured. Add VITE_YOUTUBE_API_KEY to your .env file.');
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);

    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&videoEmbeddable=true&maxResults=12&key=${API_KEY}`;
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message || `API error ${res.status}`);
      }
      const data = await res.json();
      const items: YouTubeResult[] = (data.items || []).map((item: any) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
      }));
      setResults(items);
      if (items.length === 0) setError('No embeddable videos found. Try a different search term.');
    } catch (err: any) {
      setError(err.message || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (result: YouTubeResult) => {
    setSelected(result.videoId);
    onSelect(result.videoId, result.title);
  };

  const handleClose = () => {
    setQuery('');
    setResults([]);
    setError('');
    setSelected(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-500" />
            Search YouTube Videos
          </DialogTitle>
          <DialogDescription>
            Only embeddable videos are shown. Click "Use This Video" to add it to your lesson.
          </DialogDescription>
        </DialogHeader>

        {/* Search bar */}
        <div className="flex gap-2 pt-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. React hooks tutorial, Python data science..."
              className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>
          <Button onClick={handleSearch} disabled={loading || !query.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
          </Button>
        </div>

        {/* Error */}
        {error && (
          <p className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p>
        )}

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Searching embeddable videos...</span>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-3">
              {results.map(result => {
                const isSelected = selected === result.videoId;
                return (
                  <div
                    key={result.videoId}
                    className={`rounded-lg border overflow-hidden flex flex-col transition-all ${
                      isSelected ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="relative">
                      <img
                        src={result.thumbnail}
                        alt={result.title}
                        className="w-full object-cover"
                        style={{ aspectRatio: '16/9' }}
                      />
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                          <CheckCircle2 className="h-8 w-8 text-primary" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col flex-1 p-2 gap-2">
                      <p className="text-xs font-medium line-clamp-2 leading-snug">{result.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{result.channelTitle}</p>
                      <Button
                        size="sm"
                        variant={isSelected ? 'default' : 'outline'}
                        className="mt-auto h-7 text-xs"
                        onClick={() => handleSelect(result)}
                      >
                        {isSelected ? 'Selected' : 'Use This Video'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && results.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Youtube className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">Search for a topic to find embeddable videos</p>
              <p className="text-xs mt-1 opacity-70">Only videos that allow embedding will appear</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default YouTubeVideoSearch;
