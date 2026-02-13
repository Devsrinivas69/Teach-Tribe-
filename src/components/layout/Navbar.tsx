import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bell, Moon, Sun, Menu, X, GraduationCap, LogOut, User, LayoutDashboard, BookOpen } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCourseStore } from '@/stores/courseStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { profile, role, isAuthenticated, logout } = useAuth();
  const { darkMode, toggleDarkMode, courses } = useCourseStore();
  const navigate = useNavigate();

  const searchResults = searchQuery.length > 1
    ? courses.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5)
    : [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/courses?search=${encodeURIComponent(searchQuery)}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const getDashboardLink = () => {
    if (role === 'admin') return '/dashboard/admin';
    if (role === 'instructor') return '/dashboard/instructor';
    return '/dashboard/student';
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <GraduationCap className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold text-gradient">Academia</span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          <Link to="/" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Home</Link>
          <Link to="/courses" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Courses</Link>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(!searchOpen)}>
              <Search className="h-5 w-5" />
            </Button>
            {searchOpen && (
              <div className="absolute right-0 top-12 w-80 rounded-lg border border-border bg-card p-3 shadow-lg">
                <form onSubmit={handleSearch}>
                  <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search courses..." className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                </form>
                {searchResults.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {searchResults.map(c => (
                      <button key={c.id} onClick={() => { navigate(`/course/${c.id}`); setSearchOpen(false); setSearchQuery(''); }}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent">
                        <img src={c.thumbnail} alt="" className="h-8 w-12 rounded object-cover" />
                        <span className="truncate">{c.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {isAuthenticated && profile ? (
            <>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full">
                    <img src={profile.avatar_url || ''} alt={profile.display_name} className="h-8 w-8 rounded-full object-cover ring-2 ring-primary/20" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{profile.display_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{role}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate(getDashboardLink())}>
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" /> Profile
                  </DropdownMenuItem>
                  {role === 'student' && (
                    <DropdownMenuItem onClick={() => navigate('/dashboard/student')}>
                      <BookOpen className="mr-2 h-4 w-4" /> My Learning
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Log in</Button>
              <Button size="sm" onClick={() => navigate('/signup')} className="bg-primary text-primary-foreground hover:bg-primary/90">Sign up</Button>
            </div>
          )}

          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-background p-4 md:hidden">
          <div className="flex flex-col gap-3">
            <Link to="/" onClick={() => setMobileOpen(false)} className="text-sm font-medium">Home</Link>
            <Link to="/courses" onClick={() => setMobileOpen(false)} className="text-sm font-medium">Courses</Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
