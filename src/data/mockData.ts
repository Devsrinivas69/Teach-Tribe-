import type { User, Course, Review, Enrollment } from '@/types';

const avatars = [
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
];

const thumbnails = [
  'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1580894894513-541e068a3e2b?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&h=400&fit=crop',
];

export const users: User[] = [
  { id: 'u1', name: 'John Smith', email: 'john@academia.com', password: 'password123', role: 'instructor', avatar: avatars[0], bio: 'Full-stack developer with 10+ years of experience. Passionate about teaching web development.', enrolledCourses: [], createdCourses: ['c1','c2','c6'], createdAt: '2023-01-15' },
  { id: 'u2', name: 'Sarah Johnson', email: 'sarah@academia.com', password: 'password123', role: 'instructor', avatar: avatars[1], bio: 'Data scientist and AI researcher. Published author and conference speaker.', enrolledCourses: [], createdCourses: ['c3','c7','c11'], createdAt: '2023-02-20' },
  { id: 'u3', name: 'Mike Davis', email: 'mike@academia.com', password: 'password123', role: 'instructor', avatar: avatars[2], bio: 'UX/UI designer with a passion for creating beautiful and intuitive interfaces.', enrolledCourses: [], createdCourses: ['c4','c8','c12'], createdAt: '2023-03-10' },
  { id: 'u4', name: 'Emily Chen', email: 'emily@academia.com', password: 'password123', role: 'instructor', avatar: avatars[3], bio: 'Business strategist and marketing expert with Fortune 500 experience.', enrolledCourses: [], createdCourses: ['c5','c9','c13'], createdAt: '2023-04-05' },
  { id: 'u5', name: 'Alex Kumar', email: 'alex@academia.com', password: 'password123', role: 'instructor', avatar: avatars[4], bio: 'Mobile app developer specializing in React Native and Flutter.', enrolledCourses: [], createdCourses: ['c10','c14','c15'], createdAt: '2023-05-12' },
  { id: 's1', name: 'Student User', email: 'student@test.com', password: 'password123', role: 'student', avatar: avatars[1], bio: 'Eager learner!', enrolledCourses: ['c1','c3'], createdCourses: [], createdAt: '2024-01-01' },
  { id: 'a1', name: 'Admin User', email: 'admin@test.com', password: 'password123', role: 'admin', avatar: avatars[0], bio: 'Platform administrator', enrolledCourses: [], createdCourses: [], createdAt: '2023-01-01' },
];

const makeCurriculum = (courseId: string, sections: { title: string; lessons: { title: string; dur: string; videoUrl: string }[] }[]) =>
  sections.map((s, si) => ({
    id: `${courseId}-sec-${si}`,
    title: s.title,
    lessons: s.lessons.map((l, li) => ({
      id: `${courseId}-les-${si}-${li}`,
      title: l.title,
      videoUrl: l.videoUrl,
      duration: l.dur,
      description: `Learn about ${l.title.toLowerCase()} in this comprehensive lesson.`,
      isFree: li === 0,
      resources: [],
    })),
  }));

export const categories = ['Web Development', 'Data Science', 'Design', 'Business', 'Marketing', 'Mobile Development', 'DevOps', 'Cybersecurity'];

export const courses: Course[] = [
  {
    id: 'c1', title: 'Complete React Developer Course', shortDescription: 'Master React 18 with hooks, context, Redux and build real projects',
    description: 'This comprehensive React course will take you from beginner to advanced. You will learn everything from JSX, components, state management with hooks and context API, to advanced patterns like render props and higher-order components. Build multiple real-world projects including a full e-commerce application.',
    instructor: 'u1', instructorName: 'John Smith', instructorAvatar: avatars[0],
    thumbnail: thumbnails[0], price: 0, category: 'Web Development', level: 'Intermediate', language: 'English',
    curriculum: makeCurriculum('c1', [
      { title: 'Getting Started', lessons: [
        { title: 'Introduction to React', dur: '12:30', videoUrl: 'SqcY0GlETPk' },
        { title: 'Setting Up Environment', dur: '8:45', videoUrl: 'w7ejDZ8SWv8' },
        { title: 'Your First Component', dur: '15:20', videoUrl: 'Tn6-PIqc4UM' }
      ] },
      { title: 'React Fundamentals', lessons: [
        { title: 'JSX Deep Dive', dur: '18:00', videoUrl: '_ZTT9kw3PIE' },
        { title: 'Props and State', dur: '22:15', videoUrl: 'IYvD9oBCuJI' },
        { title: 'Event Handling', dur: '14:50', videoUrl: '0XSDAup85SA' }
      ] },
      { title: 'Advanced Concepts', lessons: [
        { title: 'Hooks In Depth', dur: '25:00', videoUrl: 'TNhaISOUy6Q' },
        { title: 'Context API', dur: '20:30', videoUrl: '5LrDIWkK_Bc' },
        { title: 'Performance Optimization', dur: '19:45', videoUrl: '4UZrsTqkcW4' }
      ] },
    ]),
    enrollmentCount: 15420, rating: 4.8, reviewCount: 3241, reviews: [], isPublished: true,
    whatYouLearn: ['Build powerful React applications from scratch', 'Master React Hooks and Context API', 'Understand component lifecycle and optimization', 'Deploy React apps to production'],
    requirements: ['Basic JavaScript knowledge', 'HTML/CSS fundamentals', 'A computer with internet access'],
    totalDuration: '42 hours', totalLessons: 9, createdAt: '2023-06-15', updatedAt: '2024-11-20',
  },
  {
    id: 'c2', title: 'Node.js & Express Masterclass', shortDescription: 'Build scalable backend applications with Node.js and Express',
    description: 'Learn server-side JavaScript with Node.js and Express. Build REST APIs, handle authentication, work with databases, and deploy to the cloud.',
    instructor: 'u1', instructorName: 'John Smith', instructorAvatar: avatars[0],
    thumbnail: thumbnails[7], price: 0, category: 'Web Development', level: 'Intermediate', language: 'English',
    curriculum: makeCurriculum('c2', [
      { title: 'Node.js Basics', lessons: [
        { title: 'What is Node.js?', dur: '10:00', videoUrl: 'TlB_eWDSMt4' },
        { title: 'Modules and NPM', dur: '14:30', videoUrl: 'Oe421EPjeBE' }
      ] },
      { title: 'Express Framework', lessons: [
        { title: 'Setting Up Express', dur: '12:00', videoUrl: 'L72fhGm1tfE' },
        { title: 'Routing & Middleware', dur: '18:00', videoUrl: 'lY6icfhap2o' },
        { title: 'REST API Design', dur: '22:00', videoUrl: 'pKd0Rpw7O48' }
      ] },
    ]),
    enrollmentCount: 8930, rating: 4.7, reviewCount: 1820, reviews: [], isPublished: true,
    whatYouLearn: ['Build REST APIs with Express', 'Handle authentication with JWT', 'Work with MongoDB and PostgreSQL', 'Deploy Node.js apps'],
    requirements: ['JavaScript fundamentals', 'Basic understanding of HTTP'],
    totalDuration: '36 hours', totalLessons: 5, createdAt: '2023-08-10', updatedAt: '2024-10-15',
  },
  {
    id: 'c3', title: 'Python for Data Science & AI', shortDescription: 'Learn Python, Data Analysis, and Machine Learning fundamentals',
    description: 'Master Python programming for data science. Learn NumPy, Pandas, Matplotlib, Scikit-learn, and TensorFlow through hands-on projects.',
    instructor: 'u2', instructorName: 'Sarah Johnson', instructorAvatar: avatars[1],
    thumbnail: thumbnails[1], price: 0, category: 'Data Science', level: 'Beginner', language: 'English',
    curriculum: makeCurriculum('c3', [
      { title: 'Python Basics', lessons: [
        { title: 'Python Setup', dur: '8:00', videoUrl: 'kqtD5dpn9C8' },
        { title: 'Variables & Data Types', dur: '16:00', videoUrl: 'cQT33yu9pY8' },
        { title: 'Control Flow', dur: '14:00', videoUrl: 'Zp5MuPOtsSY' }
      ] },
      { title: 'Data Analysis', lessons: [
        { title: 'NumPy Fundamentals', dur: '20:00', videoUrl: 'QUT1VHiLmmI' },
        { title: 'Pandas DataFrames', dur: '25:00', videoUrl: 'vmEHCJofslg' }
      ] },
      { title: 'Machine Learning', lessons: [
        { title: 'Introduction to ML', dur: '18:00', videoUrl: 'i_LwzRVP7bg' },
        { title: 'Linear Regression', dur: '22:00', videoUrl: 'nk2CQITm_eo' }
      ] },
    ]),
    enrollmentCount: 22150, rating: 4.9, reviewCount: 5430, reviews: [], isPublished: true,
    whatYouLearn: ['Python programming from scratch', 'Data analysis with Pandas', 'Machine learning with Scikit-learn', 'Deep learning basics with TensorFlow'],
    requirements: ['No prior programming experience needed', 'Basic math knowledge'],
    totalDuration: '56 hours', totalLessons: 7, createdAt: '2023-05-20', updatedAt: '2024-12-01',
  },
  {
    id: 'c4', title: 'UI/UX Design Masterclass', shortDescription: 'Learn user interface and experience design from scratch to professional',
    description: 'Complete UI/UX design course covering user research, wireframing, prototyping, visual design, and usability testing with Figma.',
    instructor: 'u3', instructorName: 'Mike Davis', instructorAvatar: avatars[2],
    thumbnail: thumbnails[2], price: 0, category: 'Design', level: 'Beginner', language: 'English',
    curriculum: makeCurriculum('c4', [
      { title: 'Design Fundamentals', lessons: [
        { title: 'Design Thinking', dur: '15:00', videoUrl: '68w2VwalD5w' },
        { title: 'Color Theory', dur: '12:00', videoUrl: 'WONZVnlam6U' }
      ] },
      { title: 'Figma Mastery', lessons: [
        { title: 'Figma Interface', dur: '18:00', videoUrl: 'c9Wg6Cb_YlU' },
        { title: 'Components & Variants', dur: '22:00', videoUrl: 'FJDVKeh7RJI' }
      ] },
    ]),
    enrollmentCount: 11200, rating: 4.6, reviewCount: 2100, reviews: [], isPublished: true,
    whatYouLearn: ['Design thinking methodology', 'Wireframing and prototyping', 'Visual design principles', 'Figma professional workflows'],
    requirements: ['No design experience needed', 'A laptop or desktop computer'],
    totalDuration: '28 hours', totalLessons: 4, createdAt: '2023-07-01', updatedAt: '2024-09-20',
  },
  {
    id: 'c5', title: 'Digital Marketing Complete Guide', shortDescription: 'Master SEO, social media, email marketing, and paid advertising',
    description: 'Comprehensive digital marketing course covering all major channels. Learn to create marketing strategies that drive real results.',
    instructor: 'u4', instructorName: 'Emily Chen', instructorAvatar: avatars[3],
    thumbnail: thumbnails[5], price: 0, category: 'Marketing', level: 'Beginner', language: 'English',
    curriculum: makeCurriculum('c5', [
      { title: 'Marketing Fundamentals', lessons: [
        { title: 'Digital Marketing Overview', dur: '10:00', videoUrl: 'xBIVlM435Zg' },
        { title: 'Building a Strategy', dur: '16:00', videoUrl: 'qp0HIF3SfI4' }
      ] },
      { title: 'SEO & Content', lessons: [
        { title: 'SEO Basics', dur: '20:00', videoUrl: '2JYT5f2isg4' },
        { title: 'Content Marketing', dur: '18:00', videoUrl: 'rrkrvAUbU9Y' }
      ] },
    ]),
    enrollmentCount: 9800, rating: 4.5, reviewCount: 1650, reviews: [], isPublished: true,
    whatYouLearn: ['SEO fundamentals and advanced techniques', 'Social media marketing', 'Email marketing automation', 'Google Ads and Facebook Ads'],
    requirements: ['Basic computer skills', 'Interest in marketing'],
    totalDuration: '32 hours', totalLessons: 4, createdAt: '2023-09-15', updatedAt: '2024-11-10',
  },
  {
    id: 'c6', title: 'TypeScript from Zero to Hero', shortDescription: 'Learn TypeScript to write better, safer JavaScript code',
    description: 'Master TypeScript and take your JavaScript skills to the next level with type safety, generics, decorators and more.',
    instructor: 'u1', instructorName: 'John Smith', instructorAvatar: avatars[0],
    thumbnail: thumbnails[3], price: 0, category: 'Web Development', level: 'Intermediate', language: 'English',
    curriculum: makeCurriculum('c6', [
      { title: 'TypeScript Basics', lessons: [
        { title: 'Why TypeScript?', dur: '8:00', videoUrl: 'ahCwqrYpIuM' },
        { title: 'Types & Interfaces', dur: '20:00', videoUrl: 'BwuLxPH8IDs' }
      ] },
      { title: 'Advanced TypeScript', lessons: [
        { title: 'Generics', dur: '25:00', videoUrl: 'gp5H0Vw39yw' },
        { title: 'Decorators', dur: '18:00', videoUrl: 'gieEQFIfgYc' }
      ] },
    ]),
    enrollmentCount: 18500, rating: 4.8, reviewCount: 4200, reviews: [], isPublished: true,
    whatYouLearn: ['TypeScript type system', 'Generics and utility types', 'Integration with React', 'Best practices and patterns'],
    requirements: ['JavaScript knowledge required'],
    totalDuration: '24 hours', totalLessons: 4, createdAt: '2023-10-01', updatedAt: '2024-12-05',
  },
  {
    id: 'c7', title: 'Machine Learning A-Z', shortDescription: 'Hands-on machine learning with Python and R',
    description: 'Learn machine learning algorithms, data preprocessing, model evaluation and deployment in this comprehensive course.',
    instructor: 'u2', instructorName: 'Sarah Johnson', instructorAvatar: avatars[1],
    thumbnail: thumbnails[4], price: 0, category: 'Data Science', level: 'Advanced', language: 'English',
    curriculum: makeCurriculum('c7', [
      { title: 'Data Preprocessing', lessons: [
        { title: 'Handling Missing Data', dur: '15:00', videoUrl: 'i_LwzRVP7bg' },
        { title: 'Feature Scaling', dur: '12:00', videoUrl: 'vmEHCJofslg' }
      ] },
      { title: 'Regression', lessons: [
        { title: 'Simple Linear Regression', dur: '20:00', videoUrl: 'nk2CQITm_eo' },
        { title: 'Multiple Linear Regression', dur: '18:00', videoUrl: 'IHZwWFHWa-w' }
      ] },
    ]),
    enrollmentCount: 13400, rating: 4.7, reviewCount: 2800, reviews: [], isPublished: true,
    whatYouLearn: ['Data preprocessing techniques', 'Supervised and unsupervised learning', 'Model evaluation and selection', 'Deep learning fundamentals'],
    requirements: ['Python basics', 'Basic statistics knowledge'],
    totalDuration: '48 hours', totalLessons: 4, createdAt: '2023-04-15', updatedAt: '2024-11-25',
  },
  {
    id: 'c8', title: 'Graphic Design with Adobe Suite', shortDescription: 'Master Photoshop, Illustrator and InDesign',
    description: 'Complete graphic design course covering all Adobe Creative Suite tools for professional design work.',
    instructor: 'u3', instructorName: 'Mike Davis', instructorAvatar: avatars[2],
    thumbnail: thumbnails[6], price: 0, category: 'Design', level: 'Beginner', language: 'English',
    curriculum: makeCurriculum('c8', [
      { title: 'Photoshop Basics', lessons: [
        { title: 'Interface Tour', dur: '10:00', videoUrl: 'WONZVnlam6U' },
        { title: 'Layers & Masks', dur: '22:00', videoUrl: '68w2VwalD5w' }
      ] },
      { title: 'Illustrator', lessons: [
        { title: 'Vector Graphics', dur: '18:00', videoUrl: 'c9Wg6Cb_YlU' },
        { title: 'Logo Design', dur: '25:00', videoUrl: 'xBIVlM435Zg' }
      ] },
    ]),
    enrollmentCount: 7600, rating: 4.4, reviewCount: 1200, reviews: [], isPublished: true,
    whatYouLearn: ['Photoshop photo editing', 'Illustrator vector design', 'InDesign layout design', 'Professional design workflows'],
    requirements: ['Adobe Creative Suite installed', 'No prior design experience needed'],
    totalDuration: '38 hours', totalLessons: 4, createdAt: '2023-11-01', updatedAt: '2024-10-30',
  },
  {
    id: 'c9', title: 'Business Strategy & Management', shortDescription: 'Learn strategic thinking and business management skills',
    description: 'Develop essential business strategy skills used by top consultants and Fortune 500 executives.',
    instructor: 'u4', instructorName: 'Emily Chen', instructorAvatar: avatars[3],
    thumbnail: thumbnails[8], price: 0, category: 'Business', level: 'Intermediate', language: 'English',
    curriculum: makeCurriculum('c9', [
      { title: 'Strategic Thinking', lessons: [
        { title: 'Competitive Analysis', dur: '16:00', videoUrl: '6IFR3WYSBFM' },
        { title: 'SWOT Analysis', dur: '12:00', videoUrl: 'qp0HIF3SfI4' }
      ] },
      { title: 'Leadership', lessons: [
        { title: 'Team Management', dur: '20:00', videoUrl: 'rrkrvAUbU9Y' },
        { title: 'Decision Making', dur: '15:00', videoUrl: 'Unzc731iCUY' }
      ] },
    ]),
    enrollmentCount: 6200, rating: 4.6, reviewCount: 980, reviews: [], isPublished: true,
    whatYouLearn: ['Strategic planning frameworks', 'Competitive analysis', 'Team leadership', 'Financial decision making'],
    requirements: ['Basic business understanding'],
    totalDuration: '30 hours', totalLessons: 4, createdAt: '2023-12-01', updatedAt: '2024-11-05',
  },
  {
    id: 'c10', title: 'React Native Mobile Development', shortDescription: 'Build cross-platform mobile apps with React Native',
    description: 'Learn to build beautiful, performant mobile applications for iOS and Android using React Native and Expo.',
    instructor: 'u5', instructorName: 'Alex Kumar', instructorAvatar: avatars[4],
    thumbnail: thumbnails[9], price: 0, category: 'Mobile Development', level: 'Intermediate', language: 'English',
    curriculum: makeCurriculum('c10', [
      { title: 'React Native Setup', lessons: [
        { title: 'Getting Started with Expo', dur: '12:00', videoUrl: 'ZBCUegTZF7M' },
        { title: 'Core Components', dur: '18:00', videoUrl: 'bMknfKXIFA8' }
      ] },
      { title: 'Navigation & State', lessons: [
        { title: 'React Navigation', dur: '20:00', videoUrl: '4UZrsTqkcW4' },
        { title: 'State Management', dur: '16:00', videoUrl: 'IYvD9oBCuJI' }
      ] },
    ]),
    enrollmentCount: 10300, rating: 4.7, reviewCount: 2100, reviews: [], isPublished: true,
    whatYouLearn: ['React Native fundamentals', 'Cross-platform development', 'Navigation patterns', 'Publishing to App Store'],
    requirements: ['React knowledge', 'JavaScript fundamentals'],
    totalDuration: '40 hours', totalLessons: 4, createdAt: '2024-01-10', updatedAt: '2024-12-10',
  },
  {
    id: 'c11', title: 'Deep Learning with TensorFlow', shortDescription: 'Build neural networks and AI models with TensorFlow',
    description: 'Advanced deep learning course covering CNNs, RNNs, GANs and transformers with TensorFlow and Keras.',
    instructor: 'u2', instructorName: 'Sarah Johnson', instructorAvatar: avatars[1],
    thumbnail: thumbnails[10], price: 0, category: 'Data Science', level: 'Advanced', language: 'English',
    curriculum: makeCurriculum('c11', [
      { title: 'Neural Networks', lessons: [
        { title: 'Perceptrons & Activation', dur: '18:00', videoUrl: 'aircAruvnKk' },
        { title: 'Backpropagation', dur: '25:00', videoUrl: 'Ilg3gGewQ5U' }
      ] },
      { title: 'CNNs', lessons: [
        { title: 'Convolutional Layers', dur: '22:00', videoUrl: 'Lakz2MoHy6o' },
        { title: 'Image Classification', dur: '20:00', videoUrl: 'tPYj3fFJGjk' }
      ] },
    ]),
    enrollmentCount: 5800, rating: 4.9, reviewCount: 1450, reviews: [], isPublished: true,
    whatYouLearn: ['Neural network architecture', 'CNNs for computer vision', 'RNNs for NLP', 'Model deployment'],
    requirements: ['Python proficiency', 'Linear algebra basics', 'Machine learning fundamentals'],
    totalDuration: '52 hours', totalLessons: 4, createdAt: '2024-02-15', updatedAt: '2024-12-01',
  },
  {
    id: 'c12', title: 'Motion Design with After Effects', shortDescription: 'Create stunning animations and motion graphics',
    description: 'Learn professional motion design and animation techniques using Adobe After Effects from beginner to advanced.',
    instructor: 'u3', instructorName: 'Mike Davis', instructorAvatar: avatars[2],
    thumbnail: thumbnails[11], price: 0, category: 'Design', level: 'Beginner', language: 'English',
    curriculum: makeCurriculum('c12', [
      { title: 'After Effects Basics', lessons: [
        { title: 'Interface & Workflow', dur: '14:00', videoUrl: 'WONZVnlam6U' },
        { title: 'Keyframes & Animation', dur: '20:00', videoUrl: '68w2VwalD5w' }
      ] },
    ]),
    enrollmentCount: 4500, rating: 4.5, reviewCount: 720, reviews: [], isPublished: true,
    whatYouLearn: ['After Effects fundamentals', 'Keyframe animation', 'Motion graphics', 'Video compositing'],
    requirements: ['No prior experience needed'],
    totalDuration: '26 hours', totalLessons: 2, createdAt: '2024-03-01', updatedAt: '2024-11-20',
  },
  {
    id: 'c13', title: 'Social Media Marketing Pro', shortDescription: 'Grow your brand on Instagram, TikTok, LinkedIn and more',
    description: 'Learn proven social media marketing strategies to grow audiences and drive conversions across all major platforms.',
    instructor: 'u4', instructorName: 'Emily Chen', instructorAvatar: avatars[3],
    thumbnail: thumbnails[12], price: 0, category: 'Marketing', level: 'Beginner', language: 'English',
    curriculum: makeCurriculum('c13', [
      { title: 'Platform Strategies', lessons: [
        { title: 'Instagram Growth', dur: '16:00', videoUrl: 'xBIVlM435Zg' },
        { title: 'TikTok Marketing', dur: '14:00', videoUrl: 'qp0HIF3SfI4' }
      ] },
      { title: 'Content Creation', lessons: [
        { title: 'Viral Content Formula', dur: '18:00', videoUrl: 'rrkrvAUbU9Y' }
      ] },
    ]),
    enrollmentCount: 14200, rating: 4.3, reviewCount: 2800, reviews: [], isPublished: true,
    whatYouLearn: ['Platform-specific strategies', 'Content creation techniques', 'Audience growth tactics', 'Analytics and optimization'],
    requirements: ['Active social media accounts'],
    totalDuration: '20 hours', totalLessons: 3, createdAt: '2024-04-01', updatedAt: '2024-12-05',
  },
  {
    id: 'c14', title: 'Flutter App Development', shortDescription: 'Build beautiful native apps with Flutter and Dart',
    description: 'Complete Flutter course for building stunning cross-platform mobile applications with Dart programming language.',
    instructor: 'u5', instructorName: 'Alex Kumar', instructorAvatar: avatars[4],
    thumbnail: thumbnails[13], price: 0, category: 'Mobile Development', level: 'Beginner', language: 'English',
    curriculum: makeCurriculum('c14', [
      { title: 'Dart Basics', lessons: [
        { title: 'Dart Language Tour', dur: '18:00', videoUrl: '1ukSR1GRtMU' },
        { title: 'OOP in Dart', dur: '22:00', videoUrl: 'VPvVD8t02U8' }
      ] },
      { title: 'Flutter Widgets', lessons: [
        { title: 'Widget Tree', dur: '16:00', videoUrl: 'ZBCUegTZF7M' },
        { title: 'Layout Widgets', dur: '20:00', videoUrl: 'bMknfKXIFA8' }
      ] },
    ]),
    enrollmentCount: 8700, rating: 4.6, reviewCount: 1600, reviews: [], isPublished: true,
    whatYouLearn: ['Dart programming', 'Flutter widget system', 'State management', 'Publishing apps'],
    requirements: ['Basic programming knowledge'],
    totalDuration: '44 hours', totalLessons: 4, createdAt: '2024-05-15', updatedAt: '2024-11-30',
  },
  {
    id: 'c15', title: 'DevOps Engineering Complete', shortDescription: 'Master CI/CD, Docker, Kubernetes, and cloud deployment',
    description: 'Comprehensive DevOps course covering containerization, orchestration, CI/CD pipelines, and cloud infrastructure.',
    instructor: 'u5', instructorName: 'Alex Kumar', instructorAvatar: avatars[4],
    thumbnail: thumbnails[14], price: 0, category: 'DevOps', level: 'Advanced', language: 'English',
    curriculum: makeCurriculum('c15', [
      { title: 'Docker', lessons: [
        { title: 'Containers 101', dur: '14:00', videoUrl: 'pg19Z8LL06w' },
        { title: 'Docker Compose', dur: '18:00', videoUrl: 'Gjnup-PuquQ' }
      ] },
      { title: 'Kubernetes', lessons: [
        { title: 'K8s Architecture', dur: '22:00', videoUrl: 's_o8dwzRlu4' },
        { title: 'Deployments & Services', dur: '20:00', videoUrl: '9OfL9H6AmhQ' }
      ] },
    ]),
    enrollmentCount: 6100, rating: 4.8, reviewCount: 1100, reviews: [], isPublished: true,
    whatYouLearn: ['Docker containerization', 'Kubernetes orchestration', 'CI/CD pipelines', 'Cloud deployment (AWS/GCP)'],
    requirements: ['Linux basics', 'Command line proficiency', 'Basic networking knowledge'],
    totalDuration: '46 hours', totalLessons: 4, createdAt: '2024-06-01', updatedAt: '2024-12-10',
  },
];

// Generate reviews
const reviewComments = [
  'Excellent course! The instructor explains everything clearly.',
  'Great content but could use more practical examples.',
  'Best course I have taken on this platform. Highly recommended!',
  'Good value for money. Learned a lot of new concepts.',
  'The curriculum is well structured and easy to follow.',
  'Amazing course. The projects really helped solidify my understanding.',
  'Very comprehensive. Could be slightly faster paced for experienced learners.',
  'Loved the hands-on approach. Would love to see advanced topics added.',
];

courses.forEach(course => {
  course.reviews = Array.from({ length: Math.min(course.reviewCount, 5) }, (_, i) => ({
    id: `r-${course.id}-${i}`,
    courseId: course.id,
    studentId: `s${i + 1}`,
    studentName: ['Priya Sharma', 'Rahul Patel', 'Ananya Gupta', 'Vikram Singh', 'Neha Reddy'][i % 5],
    studentAvatar: avatars[i % 5],
    rating: Math.floor(Math.random() * 2) + 4,
    comment: reviewComments[i % reviewComments.length],
    createdAt: `2024-${String((i % 12) + 1).padStart(2, '0')}-15`,
  }));
});

export const enrollments: Enrollment[] = [
  { id: 'e1', studentId: 's1', courseId: 'c1', progress: 45, completedLessons: ['c1-les-0-0', 'c1-les-0-1', 'c1-les-0-2', 'c1-les-1-0'], enrolledAt: '2024-06-15', completedAt: null },
  { id: 'e2', studentId: 's1', courseId: 'c3', progress: 20, completedLessons: ['c3-les-0-0'], enrolledAt: '2024-08-01', completedAt: null },
];

export const testimonials = [
  { id: 't1', name: 'Riya Mehta', role: 'Software Engineer at Google', avatar: avatars[1], comment: 'Teach-Tribe transformed my career. The React course helped me land my dream job!', rating: 5 },
  { id: 't2', name: 'Arjun Patel', role: 'Data Scientist at Microsoft', avatar: avatars[2], comment: 'The data science curriculum is world-class. Best investment I have made in my education.', rating: 5 },
  { id: 't3', name: 'Sneha Kumar', role: 'UX Designer at Apple', avatar: avatars[3], comment: 'The design courses are incredible. Practical projects and amazing instructor support.', rating: 5 },
];
