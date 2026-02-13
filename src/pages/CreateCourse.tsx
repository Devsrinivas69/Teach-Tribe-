import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Trash2, GripVertical, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCourseStore } from '@/stores/courseStore';
import { categories } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import type { Course, Section } from '@/types';

const steps = ['Basic Info', 'Curriculum', 'Pricing & Details', 'Review & Publish'];

const CreateCourse = () => {
  const navigate = useNavigate();
  const { user, profile, role } = useAuth();
  const { addCourse } = useCourseStore();
  const { toast } = useToast();
  const [step, setStep] = useState(0);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [shortDesc, setShortDesc] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [isFree, setIsFree] = useState(false);
  const [whatYouLearn, setWhatYouLearn] = useState(['']);
  const [requirements, setRequirements] = useState(['']);
  const [sections, setSections] = useState<{ title: string; lessons: { title: string; videoUrl: string; duration: string }[] }[]>([
    { title: 'Section 1', lessons: [{ title: '', videoUrl: '', duration: '' }] },
  ]);

  if (!user || role === 'student') { navigate('/'); return null; }

  const addSection = () => setSections([...sections, { title: `Section ${sections.length + 1}`, lessons: [{ title: '', videoUrl: '', duration: '' }] }]);
  const addLesson = (si: number) => {
    const updated = [...sections];
    updated[si].lessons.push({ title: '', videoUrl: '', duration: '' });
    setSections(updated);
  };
  const removeSection = (si: number) => setSections(sections.filter((_, i) => i !== si));
  const removeLesson = (si: number, li: number) => {
    const updated = [...sections];
    updated[si].lessons = updated[si].lessons.filter((_, i) => i !== li);
    setSections(updated);
  };
  const updateSection = (si: number, title: string) => {
    const updated = [...sections];
    updated[si].title = title;
    setSections(updated);
  };
  const updateLesson = (si: number, li: number, field: string, value: string) => {
    const updated = [...sections];
    (updated[si].lessons[li] as any)[field] = value;
    setSections(updated);
  };

  const handlePublish = (isDraft: boolean) => {
    const newCourse: Course = {
      id: `c-${Date.now()}`, title, shortDescription: shortDesc, description,
      instructor: user.id, instructorName: profile?.display_name || '', instructorAvatar: profile?.avatar_url || '',
      thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&h=400&fit=crop',
      price: isFree ? 0 : price, category, level, language: 'English',
      curriculum: sections.map((s, si) => ({
        id: `sec-${si}`, title: s.title,
        lessons: s.lessons.map((l, li) => ({
          id: `les-${si}-${li}`, title: l.title, videoUrl: l.videoUrl || 'https://www.youtube.com/embed/dQw4w9WgXcQ',
          duration: l.duration || '10:00', description: '', isFree: li === 0, resources: [],
        })),
      })),
      enrollmentCount: 0, rating: 0, reviewCount: 0, reviews: [], isPublished: !isDraft,
      whatYouLearn: whatYouLearn.filter(Boolean), requirements: requirements.filter(Boolean),
      totalDuration: '0 hours', totalLessons: sections.reduce((a, s) => a + s.lessons.length, 0),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    addCourse(newCourse);
    toast({ title: isDraft ? 'Course saved as draft!' : 'Course published!' });
    navigate('/dashboard/instructor');
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Create New Course</h1>

      {/* Step Indicator */}
      <div className="mb-8 flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button onClick={() => setStep(i)} className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>{i + 1}</button>
            <span className={`hidden text-sm sm:inline ${i <= step ? 'font-medium' : 'text-muted-foreground'}`}>{s}</span>
            {i < steps.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
        {step === 0 && (
          <>
            <div>
              <label className="text-sm font-medium">Course Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Complete React Developer Course"
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-sm font-medium">Category *</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring">
                <option value="">Select category</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Level</label>
              <div className="mt-2 flex gap-3">
                {(['Beginner', 'Intermediate', 'Advanced'] as const).map(l => (
                  <button key={l} type="button" onClick={() => setLevel(l)}
                    className={`rounded-lg border px-4 py-2 text-sm transition-all ${level === l ? 'border-primary bg-primary/5 font-medium' : 'border-border hover:border-primary/30'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Short Description</label>
              <textarea value={shortDesc} onChange={e => setShortDesc(e.target.value.slice(0, 120))} maxLength={120}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" rows={2} placeholder="Brief overview (120 chars max)" />
              <p className="text-xs text-muted-foreground text-right">{shortDesc.length}/120</p>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            {sections.map((section, si) => (
              <div key={si} className="rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <input value={section.title} onChange={e => updateSection(si, e.target.value)}
                    className="flex-1 font-medium bg-transparent outline-none" placeholder="Section title" />
                  {sections.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeSection(si)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  )}
                </div>
                {section.lessons.map((lesson, li) => (
                  <div key={li} className="ml-6 mb-2 flex gap-2">
                    <input value={lesson.title} onChange={e => updateLesson(si, li, 'title', e.target.value)} placeholder="Lesson title"
                      className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none" />
                    <input value={lesson.videoUrl} onChange={e => updateLesson(si, li, 'videoUrl', e.target.value)} placeholder="Video URL"
                      className="w-40 rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none hidden sm:block" />
                    <input value={lesson.duration} onChange={e => updateLesson(si, li, 'duration', e.target.value)} placeholder="Duration"
                      className="w-20 rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none" />
                    {section.lessons.length > 1 && (
                      <Button variant="ghost" size="icon" className="shrink-0" onClick={() => removeLesson(si, li)}><Trash2 className="h-3 w-3" /></Button>
                    )}
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="ml-6 mt-1 gap-1" onClick={() => addLesson(si)}>
                  <Plus className="h-3 w-3" /> Add Lesson
                </Button>
              </div>
            ))}
            <Button variant="outline" className="gap-2" onClick={addSection}><Plus className="h-4 w-4" /> Add Section</Button>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <label className="text-sm font-medium">Full Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" rows={4} />
            </div>
            <div>
              <label className="text-sm font-medium">What Students Will Learn</label>
              {whatYouLearn.map((item, i) => (
                <div key={i} className="mt-1 flex gap-2">
                  <input value={item} onChange={e => { const u = [...whatYouLearn]; u[i] = e.target.value; setWhatYouLearn(u); }}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none" placeholder="Learning outcome" />
                  {whatYouLearn.length > 1 && <Button variant="ghost" size="icon" onClick={() => setWhatYouLearn(whatYouLearn.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3" /></Button>}
                </div>
              ))}
              <Button variant="ghost" size="sm" className="mt-1 gap-1" onClick={() => setWhatYouLearn([...whatYouLearn, ''])}><Plus className="h-3 w-3" /> Add</Button>
            </div>
            <div>
              <label className="text-sm font-medium">Requirements</label>
              {requirements.map((item, i) => (
                <div key={i} className="mt-1 flex gap-2">
                  <input value={item} onChange={e => { const u = [...requirements]; u[i] = e.target.value; setRequirements(u); }}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none" placeholder="Requirement" />
                </div>
              ))}
              <Button variant="ghost" size="sm" className="mt-1 gap-1" onClick={() => setRequirements([...requirements, ''])}><Plus className="h-3 w-3" /> Add</Button>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={isFree} onChange={e => setIsFree(e.target.checked)} className="rounded" />
                <span className="text-sm font-medium">Free Course</span>
              </label>
              {!isFree && (
                <div>
                  <label className="text-sm font-medium">Price (₹)</label>
                  <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))}
                    className="ml-2 w-32 rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none" />
                </div>
              )}
            </div>
          </>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/50 p-6">
              <h3 className="text-lg font-bold mb-4">Course Preview</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Title:</strong> {title || 'Untitled'}</p>
                <p><strong>Category:</strong> {category || 'Not set'}</p>
                <p><strong>Level:</strong> {level}</p>
                <p><strong>Description:</strong> {shortDesc || 'No description'}</p>
                <p><strong>Price:</strong> {isFree ? 'Free' : `₹${price}`}</p>
                <p><strong>Sections:</strong> {sections.length}</p>
                <p><strong>Total Lessons:</strong> {sections.reduce((a, s) => a + s.lessons.length, 0)}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => handlePublish(true)}>Save as Draft</Button>
              <Button className="flex-1 bg-primary text-primary-foreground" onClick={() => handlePublish(false)}>Publish Course</Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Navigation */}
      {step < 3 && (
        <div className="mt-6 flex justify-between">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep(s => s - 1)}>Back</Button>
          <Button onClick={() => setStep(s => s + 1)} className="bg-primary text-primary-foreground">Next</Button>
        </div>
      )}
    </div>
  );
};

export default CreateCourse;
