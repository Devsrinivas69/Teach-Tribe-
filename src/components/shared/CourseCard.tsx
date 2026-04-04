import { Star } from 'lucide-react';

interface Course {
  thumbnail: string;
  title: string;
  category: string;
  price: number;
  instructorAvatar: string;
  instructorName: string;
  rating: number;
  reviewCount: number;
  totalDuration: string;
}

export const StarRating = ({ rating, size = 16 }: { rating: number; size?: number }) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`h-${size === 16 ? 4 : 5} w-${size === 16 ? 4 : 5} ${i < Math.floor(rating) ? 'fill-warning text-warning' : 'text-border'}`} style={{ width: size, height: size }} />
    ))}
  </div>
);

export const CourseCard = ({ course, onClick }: { course: Course; onClick: () => void }) => (
  <div onClick={onClick} className="group cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 card-shadow hover:card-shadow-hover">
    <div className="relative overflow-hidden">
      <img src={course.thumbnail} alt={course.title} className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
      <span className="absolute left-3 top-3 rounded-full bg-primary/90 px-2.5 py-0.5 text-xs font-medium text-primary-foreground">{course.category}</span>
      <span className="absolute right-3 top-3 rounded-full bg-success px-2.5 py-0.5 text-xs font-medium text-success-foreground">Free</span>
    </div>
    <div className="p-4">
      <h3 className="mb-1 line-clamp-2 font-semibold leading-tight text-card-foreground">{course.title}</h3>
      <p className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <img src={course.instructorAvatar} alt="" className="h-5 w-5 rounded-full object-cover" />
        {course.instructorName}
      </p>
      <div className="mb-2 flex items-center gap-1.5">
        <span className="text-sm font-bold text-warning">{course.rating ?? 0}</span>
        <StarRating rating={course.rating ?? 0} />
        <span className="text-xs text-muted-foreground">({(course.reviewCount ?? 0).toLocaleString()})</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-foreground">Free</span>
        <span className="text-xs text-muted-foreground">{course.totalDuration}</span>
      </div>
    </div>
  </div>
);
