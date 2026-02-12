import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '@/types';
import { users as mockUsers } from '@/data/mockData';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => { success: boolean; message: string };
  signup: (name: string, email: string, password: string, role: UserRole) => { success: boolean; message: string };
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      login: (email, password) => {
        const user = mockUsers.find(u => u.email === email && u.password === password);
        if (user) {
          set({ user, isAuthenticated: true });
          return { success: true, message: 'Login successful!' };
        }
        return { success: false, message: 'Invalid email or password' };
      },
      signup: (name, email, password, role) => {
        const exists = mockUsers.find(u => u.email === email);
        if (exists) return { success: false, message: 'Email already exists' };
        const newUser: User = {
          id: `u-${Date.now()}`,
          name, email, password, role,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`,
          bio: '', enrolledCourses: [], createdCourses: [], createdAt: new Date().toISOString(),
        };
        mockUsers.push(newUser);
        set({ user: newUser, isAuthenticated: true });
        return { success: true, message: 'Account created!' };
      },
      logout: () => set({ user: null, isAuthenticated: false }),
      updateProfile: (data) => {
        const { user } = get();
        if (user) set({ user: { ...user, ...data } });
      },
    }),
    { name: 'academia-auth' }
  )
);
