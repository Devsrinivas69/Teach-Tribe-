import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Clock, Users, BookOpen, Globe, ChevronDown, ChevronRight, Play, Lock, Award, CheckCircle2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/shared/CourseCard';
import { useCourseStore } from '@/stores/courseStore';
import { useAuthStore } from '@/stores/authStore';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { courses, isEnrolled, enrollInCourse, getEnrollment, addReview } = useCourseStore();
  const { user, isAuthenticated } = useAuthStore();
  const { toast } = useToast();
  const course = courses.find(c => c.id === id);
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  if (!course) return <div className="flex min-h-[60vh] items-center justify-center"><p>Course not found</p></div>;

  const enrolled = user ? isEnrolled(user.id, course.id) : false;
  const enrollment = user ? getEnrollment(user.id, course.id) : undefined;

  const toggleSection = (id: string) => setOpenSections(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const handleEnroll = () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    enrollInCourse(user!.id, course.id);
    toast({ title: 'Enrolled!', description: `You have been enrolled in ${course.title}` });
  };

  const handleReview = () => {
    if (!reviewText.trim()) return;
    addReview({
      id: `r-${Date.now()}`, courseId: course.id, studentId: user!.id,
      studentName: user!.name, studentAvatar: user!.avatar,
      rating: reviewRating, comment: reviewText, createdAt: new Date().toISOString(),
    });
    setReviewText('');
    toast({ title: 'Review submitted!' });
  };

  const totalLessons = course.curriculum.reduce((a, s) => a + s.lessons.length, 0);

  return (
    <div>
      {/* Hero */}
      <section className="hero-gradient py-12">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <p className="mb-2 text-sm text-primary-foreground/70">
                <span className="cursor-pointer hover:underline" onClick={() => navigate('/')}>Home</span> / <span className="cursor-pointer hover:underline" onClick={() => navigate('/courses')}>Courses</span> / {course.category}
              </p>
              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="text-3xl font-bold text-primary-foreground md:text-4xl">{course.title}</motion.h1>
              <p className="mt-3 text-lg text-primary-foreground/80">{course.shortDescription}</p>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-primary-foreground/80">
                <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-warning text-warning" /> {course.rating} ({course.reviewCount} reviews)</span>
                <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {course.enrollmentCount.toLocaleString()} students</span>
                <span className="flex items-center gap-1"><Globe className="h-4 w-4" /> {course.language}</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-primary-foreground/80">
                <img src={course.instructorAvatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                <span>Created by <strong>{course.instructorName}</strong></span>
              </div>
              <p className="mt-2 text-xs text-primary-foreground/60">Last updated {course.updatedAt}</p>
            </div>
            <div className="lg:hidden">
              <img src={course.thumbnail} alt={course.title} className="w-full rounded-xl" />
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview">
              <TabsList className="mb-6 w-full justify-start">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
                <TabsTrigger value="instructor">Instructor</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="mb-6 rounded-xl border border-border bg-accent/50 p-6">
                  <h3 className="mb-3 font-bold text-lg">What you'll learn</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {course.whatYouLearn.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mb-6">
                  <h3 className="mb-2 font-bold text-lg">Requirements</h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {course.requirements.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-2 font-bold text-lg">Description</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{course.description}</p>
                </div>
              </TabsContent>

              <TabsContent value="curriculum">
                <div className="space-y-3">
                  {course.curriculum.map(section => (
                    <div key={section.id} className="rounded-xl border border-border overflow-hidden">
                      <button onClick={() => toggleSection(section.id)}
                        className="flex w-full items-center justify-between bg-muted/50 px-4 py-3 text-left font-medium">
                        <div className="flex items-center gap-2">
                          {openSections.includes(section.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          {section.title}
                        </div>
                        <span className="text-xs text-muted-foreground">{section.lessons.length} lessons</span>
                      </button>
                      {openSections.includes(section.id) && (
                        <div className="divide-y divide-border">
                          {section.lessons.map(lesson => (
                            <div key={lesson.id} className="flex items-center justify-between px-4 py-2.5">
                              <div className="flex items-center gap-2 text-sm">
                                {lesson.isFree ? <Play className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                                <span>{lesson.title}</span>
                                {lesson.isFree && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">Preview</span>}
                              </div>
                              <span className="text-xs text-muted-foreground">{lesson.duration}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="reviews">
                <div className="mb-6 flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-5xl font-bold">{course.rating}</div>
                    <StarRating rating={course.rating} size={18} />
                    <p className="text-sm text-muted-foreground">{course.reviewCount} reviews</p>
                  </div>
                  <div className="flex-1 space-y-1">
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = course.reviews.filter(r => r.rating === star).length;
                      const pct = course.reviews.length ? (count / course.reviews.length) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-2 text-sm">
                          <span className="w-3">{star}</span>
                          <Star className="h-3 w-3 fill-warning text-warning" />
                          <div className="h-2 flex-1 rounded-full bg-muted">
                            <div className="h-2 rounded-full bg-warning" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-8 text-xs text-muted-foreground">{Math.round(pct)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {enrolled && (
                  <div className="mb-6 rounded-xl border border-border p-4">
                    <h4 className="mb-2 font-semibold">Write a Review</h4>
                    <div className="mb-2 flex gap-1">
                      {[1, 2, 3, 4, 5].map(s => (
                        <button key={s} onClick={() => setReviewRating(s)}>
                          <Star className={`h-6 w-6 ${s <= reviewRating ? 'fill-warning text-warning' : 'text-border'}`} />
                        </button>
                      ))}
                    </div>
                    <textarea value={reviewText} onChange={e => setReviewText(e.target.value)}
                      placeholder="Share your experience..." className="mb-2 w-full rounded-lg border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring" rows={3} />
                    <Button size="sm" onClick={handleReview}>Submit Review</Button>
                  </div>
                )}

                <div className="space-y-4">
                  {course.reviews.map(review => (
                    <div key={review.id} className="rounded-xl border border-border p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <img src={review.studentAvatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                        <div>
                          <p className="text-sm font-medium">{review.studentName}</p>
                          <StarRating rating={review.rating} size={12} />
                        </div>
                        <span className="ml-auto text-xs text-muted-foreground">{review.createdAt}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{review.comment}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="instructor">
                <div className="flex items-start gap-4">
                  <img src={course.instructorAvatar} alt={course.instructorName} className="h-20 w-20 rounded-full object-cover" />
                  <div>
                    <h3 className="text-lg font-bold">{course.instructorName}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {courses.find(c => c.instructor === course.instructor) && `${courses.filter(c => c.instructor === course.instructor).length} Courses · ${courses.filter(c => c.instructor === course.instructor).reduce((a, c) => a + c.enrollmentCount, 0).toLocaleString()} Students`}
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-20 rounded-xl border border-border bg-card p-6 card-shadow">
              <img src={course.thumbnail} alt="" className="mb-4 w-full rounded-lg" />
              <div className="mb-4 text-3xl font-bold">{course.price === 0 ? 'Free' : `₹${course.price.toLocaleString()}`}</div>
              {enrolled ? (
                <Button className="w-full" size="lg" onClick={() => navigate(`/learn/${course.id}`)}>
                  {enrollment?.progress === 100 ? 'View Certificate' : enrollment?.progress ? 'Continue Learning' : 'Go to Course'}
                </Button>
              ) : (
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" size="lg" onClick={handleEnroll}>
                  Enroll Now
                </Button>
              )}
              <div className="mt-6 space-y-3 text-sm">
                <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /> {course.totalDuration} of content</div>
                <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-muted-foreground" /> {totalLessons} lessons</div>
                <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-muted-foreground" /> {course.language}</div>
                <div className="flex items-center gap-2"><Award className="h-4 w-4 text-muted-foreground" /> Certificate of completion</div>
              </div>
              <Button variant="outline" size="sm" className="mt-4 w-full gap-2"><Share2 className="h-4 w-4" /> Share</Button>
            </div>
          </div>

          {/* Mobile sticky CTA */}
          <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background p-3 lg:hidden">
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold">{course.price === 0 ? 'Free' : `₹${course.price.toLocaleString()}`}</span>
              {enrolled ? (
                <Button onClick={() => navigate(`/learn/${course.id}`)}>Continue Learning</Button>
              ) : (
                <Button className="bg-primary text-primary-foreground" onClick={handleEnroll}>Enroll Now</Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
