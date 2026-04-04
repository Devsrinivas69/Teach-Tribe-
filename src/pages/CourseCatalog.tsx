import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, Grid3X3, List, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CourseCard, StarRating } from '@/components/shared/CourseCard';
import { useCourseStore } from '@/stores/courseStore';
import { categories } from '@/data/mockData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';

const CourseCatalog = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { courses } = useCourseStore();
  const { isAuthenticated, role, activeAdminId } = useAuth();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [levels, setLevels] = useState<string[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState('popular');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 12;

  const toggleLevel = (level: string) => setLevels(prev => prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]);

  const filtered = useMemo(() => {
    let result = courses.filter(
      c => c.isPublished && (c.isLiveVersion ?? true) && (c.versionStatus ? c.versionStatus === 'live' : true)
    );
    if (isAuthenticated && role !== 'master_admin' && activeAdminId) {
      result = result.filter(c => !c.adminId || c.adminId === activeAdminId);
    }
    if (search) result = result.filter(c => c.title.toLowerCase().includes(search.toLowerCase()) || c.shortDescription.toLowerCase().includes(search.toLowerCase()));
    if (category && category !== 'all') result = result.filter(c => c.category === category);
    if (levels.length) result = result.filter(c => levels.includes(c.level));
    if (minRating) result = result.filter(c => c.rating >= minRating);

    switch (sort) {
      case 'newest': result.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); break;
      case 'popular': result.sort((a, b) => b.enrollmentCount - a.enrollmentCount); break;
      case 'rating': result.sort((a, b) => b.rating - a.rating); break;
    }
    return result;
  }, [courses, search, category, levels, minRating, sort]);

  const paginated = filtered.slice(0, page * perPage);

  const clearFilters = () => { setCategory(''); setLevels([]); setMinRating(0); setSearch(''); };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Explore Courses</h1>
        <p className="text-muted-foreground">{filtered.length} courses available</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Filters - Desktop */}
        <aside className={`${showFilters ? 'fixed inset-0 z-40 bg-background p-6 overflow-auto' : 'hidden'} w-full shrink-0 md:relative md:block md:w-64`}>
          <div className="flex items-center justify-between md:hidden mb-4">
            <h2 className="text-lg font-bold">Filters</h2>
            <Button variant="ghost" size="icon" onClick={() => setShowFilters(false)}><X className="h-5 w-5" /></Button>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="mb-2 font-semibold text-sm">Category</h3>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-sm">Level</h3>
              {['Beginner', 'Intermediate', 'Advanced'].map(l => (
                <label key={l} className="flex items-center gap-2 mb-2 cursor-pointer">
                  <Checkbox checked={levels.includes(l)} onCheckedChange={() => toggleLevel(l)} />
                  <span className="text-sm">{l}</span>
                </label>
              ))}
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-sm">Rating</h3>
              {[4, 3, 2].map(r => (
                <button key={r} onClick={() => setMinRating(minRating === r ? 0 : r)}
                  className={`mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm ${minRating === r ? 'bg-accent' : 'hover:bg-accent/50'}`}>
                  <StarRating rating={r} size={14} /> <span>& up</span>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => setShowFilters(false)}>Apply</Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={clearFilters}>Clear</Button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses..."
                className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <Button variant="outline" size="icon" className="md:hidden" onClick={() => setShowFilters(true)}>
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
              </SelectContent>
            </Select>
            <div className="hidden items-center gap-1 md:flex">
              <Button variant={view === 'grid' ? 'default' : 'ghost'} size="icon" onClick={() => setView('grid')}><Grid3X3 className="h-4 w-4" /></Button>
              <Button variant={view === 'list' ? 'default' : 'ghost'} size="icon" onClick={() => setView('list')}><List className="h-4 w-4" /></Button>
            </div>
          </div>

          {paginated.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-lg font-medium">No courses found</p>
              <p className="text-muted-foreground">Try adjusting your filters</p>
              <Button className="mt-4" onClick={clearFilters}>Clear Filters</Button>
            </div>
          ) : (
            <>
              <div className={view === 'grid' ? 'grid gap-6 sm:grid-cols-2 xl:grid-cols-3' : 'space-y-4'}>
                {paginated.map((course, i) => (
                  <motion.div key={course.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                    <CourseCard course={course} onClick={() => navigate(`/course/${course.id}`)} />
                  </motion.div>
                ))}
              </div>
              {paginated.length < filtered.length && (
                <div className="mt-8 text-center">
                  <Button variant="outline" onClick={() => setPage(p => p + 1)}>Load More</Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseCatalog;
