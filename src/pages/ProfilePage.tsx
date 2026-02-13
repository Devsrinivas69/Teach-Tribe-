import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, profile, role, updateProfile } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');

  if (!user) { navigate('/login'); return null; }

  const handleSave = async () => {
    await updateProfile({ display_name: name, bio });
    toast({ title: 'Profile updated!' });
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-6">My Profile</h1>
        <div className="rounded-xl border border-border bg-card p-6 card-shadow">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <img src={profile?.avatar_url || ''} alt={profile?.display_name} className="h-20 w-20 rounded-full object-cover ring-4 ring-primary/10" />
              <button className="absolute bottom-0 right-0 rounded-full bg-primary p-1.5 text-primary-foreground">
                <Camera className="h-3 w-3" />
              </button>
            </div>
            <div>
              <h2 className="text-lg font-bold">{profile?.display_name}</h2>
              <p className="text-sm text-muted-foreground capitalize">{role}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Full Name</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <input value={user.email || ''} disabled className="mt-1 w-full rounded-lg border border-input bg-muted px-3 py-2.5 text-sm text-muted-foreground" />
            </div>
            <div>
              <label className="text-sm font-medium">Bio</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Tell us about yourself..." />
            </div>
            <Button onClick={handleSave} className="bg-primary text-primary-foreground">Save Changes</Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProfilePage;
