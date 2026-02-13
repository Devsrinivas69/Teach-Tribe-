
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('student', 'instructor', 'admin');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'student',
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Courses table
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  short_description TEXT DEFAULT '',
  description TEXT DEFAULT '',
  instructor_id UUID NOT NULL REFERENCES auth.users(id),
  thumbnail TEXT DEFAULT '',
  price NUMERIC(10,2) DEFAULT 0,
  category TEXT DEFAULT '',
  level TEXT DEFAULT 'Beginner' CHECK (level IN ('Beginner', 'Intermediate', 'Advanced')),
  language TEXT DEFAULT 'English',
  curriculum JSONB DEFAULT '[]',
  enrollment_count INT DEFAULT 0,
  rating NUMERIC(3,1) DEFAULT 0,
  review_count INT DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  what_you_learn TEXT[] DEFAULT '{}',
  requirements TEXT[] DEFAULT '{}',
  total_duration TEXT DEFAULT '0h',
  total_lessons INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enrollments table
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  progress INT DEFAULT 0,
  completed_lessons TEXT[] DEFAULT '{}',
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(student_id, course_id)
);

-- Reviews table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_avatar TEXT DEFAULT '',
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Security definer function: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Security definer function: get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Trigger to auto-create profile and default student role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://ui-avatars.com/api/?name=' || COALESCE(NEW.raw_user_meta_data->>'display_name', 'User') || '&background=6366f1&color=fff')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS Policies: profiles
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- RLS Policies: user_roles
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies: courses
CREATE POLICY "Anyone can view published courses" ON public.courses FOR SELECT USING (is_published = true);
CREATE POLICY "Instructors can view own courses" ON public.courses FOR SELECT USING (auth.uid() = instructor_id);
CREATE POLICY "Admins can view all courses" ON public.courses FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Instructors can create courses" ON public.courses FOR INSERT WITH CHECK (auth.uid() = instructor_id AND public.has_role(auth.uid(), 'instructor'));
CREATE POLICY "Instructors can update own courses" ON public.courses FOR UPDATE USING (auth.uid() = instructor_id);
CREATE POLICY "Admins can update any course" ON public.courses FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Instructors can delete own courses" ON public.courses FOR DELETE USING (auth.uid() = instructor_id);
CREATE POLICY "Admins can delete any course" ON public.courses FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies: enrollments
CREATE POLICY "Students can view own enrollments" ON public.enrollments FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Admins can view all enrollments" ON public.enrollments FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Students can enroll" ON public.enrollments FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can unenroll" ON public.enrollments FOR DELETE USING (auth.uid() = student_id);

-- RLS Policies: reviews
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Students can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can update own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = student_id);
CREATE POLICY "Students can delete own reviews" ON public.reviews FOR DELETE USING (auth.uid() = student_id);
CREATE POLICY "Admins can delete any review" ON public.reviews FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
