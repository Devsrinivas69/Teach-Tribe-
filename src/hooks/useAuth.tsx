/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithPopup,
  signOut,
  updateProfile as updateFirebaseProfile,
  type User,
} from 'firebase/auth';
import { getApps, initializeApp } from 'firebase/app';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  writeBatch,
  where,
} from 'firebase/firestore';
import { auth, db, firebaseConfig, googleProvider } from '@/lib/firebase';
import { MASTER_ADMIN_EMAIL } from '@/lib/constants';
import {
  sanitizeDisplayNameForProfile,
  sanitizeLoginInput,
  sanitizeSignupInput,
} from '@/lib/authInputSecurity';
import type { AdminUnit, UserAdminMembership } from '@/types';

export type AppRole = 'student' | 'instructor' | 'admin' | 'master_admin';

interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
}

interface SignupOptions {
  adminId?: string;
}

interface LoginOptions {
  preferredAdminId?: string;
}

export interface ManagedWorkspaceUser {
  userId: string;
  email: string;
  displayName: string;
  appRole: AppRole;
  roleUnderAdmin: 'student' | 'instructor' | 'admin';
  adminId: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: AppRole;
  isAuthenticated: boolean;
  loading: boolean;
  adminUnits: AdminUnit[];
  memberships: UserAdminMembership[];
  activeAdminId: string | null;
  activeAdmin: AdminUnit | null;
  login: (email: string, password: string, options?: LoginOptions) => Promise<{ success: boolean; message: string }>;
  signup: (name: string, email: string, password: string, role?: AppRole, options?: SignupOptions) => Promise<{ success: boolean; message: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  switchActiveAdmin: (adminId: string) => Promise<void>;
  createAdminUnit: (name: string, status: 'active' | 'upcoming') => Promise<{ success: boolean; message: string; adminId?: string }>;
  assignUserToAdmin: (userId: string, adminId: string, roleUnderAdmin: 'student' | 'instructor' | 'admin', isPrimary?: boolean) => Promise<{ success: boolean; message: string }>;
  updateAdminUnitStatus: (adminId: string, status: 'active' | 'upcoming') => Promise<{ success: boolean; message: string }>;
  deleteAdminUnit: (adminId: string) => Promise<{ success: boolean; message: string }>;
  createManagedUserAccount: (
    name: string,
    email: string,
    password: string,
    adminId: string,
    roleUnderAdmin: 'student' | 'instructor' | 'admin'
  ) => Promise<{ success: boolean; message: string; userId?: string }>;
  removeUserFromAdmin: (userId: string, adminId: string) => Promise<{ success: boolean; message: string }>;
  listUsersByAdmin: (adminId: string) => Promise<{ success: boolean; message: string; users?: ManagedWorkspaceUser[] }>;
  runDefaultAdminMigration: () => Promise<{
    success: boolean;
    message: string;
    summary?: {
      defaultAdminId: string;
      usersProcessed: number;
      membershipsCreated: number;
      rolesCreated: number;
      coursesUpdated: number;
    };
  }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const defaultAdminName = 'General Admin';

const makeMembershipDocId = (userId: string, adminId: string) => `${userId}_${adminId}`;

const toErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

const delay = (ms: number) => new Promise<void>((resolve) => {
  setTimeout(resolve, ms);
});

const ensureAuthReadyForFirestore = async (uid: string) => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const currentUser = auth.currentUser;
    if (currentUser?.uid === uid) {
      await currentUser.getIdToken();
      return;
    }
    await delay(100);
  }

  throw new Error('Auth session is not ready yet. Please retry in a moment.');
};

const normalizeRoleForMembership = (appRole: AppRole): 'student' | 'instructor' | 'admin' => {
  if (appRole === 'instructor') return 'instructor';
  if (appRole === 'admin' || appRole === 'master_admin') return 'admin';
  return 'student';
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole>('student');
  const [loading, setLoading] = useState(true);
  const [adminUnits, setAdminUnits] = useState<AdminUnit[]>([]);
  const [memberships, setMemberships] = useState<UserAdminMembership[]>([]);
  const [activeAdminId, setActiveAdminId] = useState<string | null>(null);

  const getProvisioningAuth = () => {
    const appName = 'provisioning-app';
    const existing = getApps().find((app) => app.name === appName);
    const app = existing || initializeApp(firebaseConfig, appName);
    return getAuth(app);
  };

  const writeAuditLog = async (action: string, details: Record<string, unknown>) => {
    if (!user) return;

    await addDoc(collection(db, 'admin_audit_logs'), {
      actorId: user.uid,
      actorEmail: user.email || '',
      actorRole: role,
      action,
      details,
      createdAt: new Date().toISOString(),
    });
  };

  const storageKey = useMemo(() => (user ? `active-admin-${user.uid}` : null), [user]);

  const saveActiveAdmin = (adminId: string | null) => {
    if (!storageKey) return;
    if (adminId) localStorage.setItem(storageKey, adminId);
    else localStorage.removeItem(storageKey);
  };

  const fetchProfile = async (uid: string) => {
    const snap = await getDoc(doc(db, 'profiles', uid));
    if (snap.exists()) {
      setProfile(snap.data() as Profile);
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const newProfile: Profile = {
      id: uid,
      display_name: sanitizeDisplayNameForProfile(currentUser.displayName || 'User'),
      avatar_url: currentUser.photoURL || null,
      bio: '',
    };

    await setDoc(doc(db, 'profiles', uid), {
      ...newProfile,
      email: currentUser.email || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setProfile(newProfile);
  };

  const fetchAdminUnits = async () => {
    const snap = await getDocs(collection(db, 'admin_units'));
    const units = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<AdminUnit, 'id'>),
    }));

    setAdminUnits(units);
    return units;
  };

  const ensureDefaultAdminUnit = async () => {
    const units = await fetchAdminUnits();
    if (units.length > 0) return units[0].id;

    const id = `admin-${Date.now()}`;
    await setDoc(doc(db, 'admin_units', id), {
      name: defaultAdminName,
      status: 'active',
      createdBy: user?.uid || null,
      createdAt: new Date().toISOString(),
    });

    await fetchAdminUnits();
    return id;
  };

  const fetchMemberships = async (uid: string) => {
    const q = query(collection(db, 'user_admin_memberships'), where('userId', '==', uid));
    const snap = await getDocs(q);

    const rows: UserAdminMembership[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<UserAdminMembership, 'id'>),
    }));

    setMemberships(rows);
    return rows;
  };

  const resolveRole = async (uid: string): Promise<AppRole> => {
    const currentUser = auth.currentUser;
    const snap = await getDoc(doc(db, 'user_roles', uid));

    if (currentUser?.email?.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
      if (!snap.exists() || snap.data().role !== 'master_admin') {
        await setDoc(doc(db, 'user_roles', uid), {
          user_id: uid,
          role: 'master_admin',
          created_at: new Date().toISOString(),
        }, { merge: true });
      }
      setRole('master_admin');
      return 'master_admin';
    }

    if (!snap.exists()) {
      await setDoc(doc(db, 'user_roles', uid), {
        user_id: uid,
        role: 'student',
        created_at: new Date().toISOString(),
      }, { merge: true });
      setRole('student');
      return 'student';
    }

    const storedRole = (snap.data().role as AppRole) || 'student';
    if (storedRole === 'master_admin') {
      setRole('student');
      return 'student';
    }

    setRole(storedRole);
    return storedRole;
  };

  const pickActiveAdmin = async (currentRole: AppRole, userMemberships: UserAdminMembership[], preferredAdminId?: string) => {
    if (currentRole === 'master_admin') {
      setActiveAdminId(null);
      saveActiveAdmin(null);
      return;
    }

    let nextAdminId: string | null = null;

    if (preferredAdminId && userMemberships.some((m) => m.adminId === preferredAdminId)) {
      nextAdminId = preferredAdminId;
    }

    if (!nextAdminId && storageKey) {
      const cached = localStorage.getItem(storageKey);
      if (cached && userMemberships.some((m) => m.adminId === cached)) {
        nextAdminId = cached;
      }
    }

    if (!nextAdminId) {
      nextAdminId = userMemberships.find((m) => m.isPrimary)?.adminId || userMemberships[0]?.adminId || null;
    }

    setActiveAdminId(nextAdminId);
    saveActiveAdmin(nextAdminId);
  };

  const refreshProfile = async () => {
    if (!user) return;

    const units = await fetchAdminUnits();
    const currentRole = await resolveRole(user.uid);
    const userMemberships = await fetchMemberships(user.uid);

    if (units.length === 0) {
      await ensureDefaultAdminUnit();
    }

    await fetchProfile(user.uid);
    await pickActiveAdmin(currentRole, userMemberships);
  };

  useEffect(() => {
    fetchAdminUnits().catch(() => {
      setAdminUnits([]);
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const units = await fetchAdminUnits();
        if (units.length === 0) {
          const id = `admin-${Date.now()}`;
          await setDoc(doc(db, 'admin_units', id), {
            name: defaultAdminName,
            status: 'active',
            createdBy: firebaseUser.uid,
            createdAt: new Date().toISOString(),
          });
          await fetchAdminUnits();
        }
        await fetchProfile(firebaseUser.uid);
        const currentRole = await resolveRole(firebaseUser.uid);
        const userMemberships = await fetchMemberships(firebaseUser.uid);
        const userStorageKey = `active-admin-${firebaseUser.uid}`;

        if (currentRole === 'master_admin') {
          setActiveAdminId(null);
          localStorage.removeItem(userStorageKey);
        } else {
          let nextAdminId: string | null = null;
          const cached = localStorage.getItem(userStorageKey);
          if (cached && userMemberships.some((m) => m.adminId === cached)) {
            nextAdminId = cached;
          }

          if (!nextAdminId) {
            nextAdminId = userMemberships.find((m) => m.isPrimary)?.adminId || userMemberships[0]?.adminId || null;
          }

          setActiveAdminId(nextAdminId);
          if (nextAdminId) {
            localStorage.setItem(userStorageKey, nextAdminId);
          } else {
            localStorage.removeItem(userStorageKey);
          }
        }
      } else {
        setProfile(null);
        setRole('student');
        setMemberships([]);
        setActiveAdminId(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string, options?: LoginOptions) => {
    try {
      const sanitized = sanitizeLoginInput({ email, password });

      await signInWithEmailAndPassword(auth, sanitized.email, sanitized.password);
      if (options?.preferredAdminId) {
        setTimeout(() => {
          setActiveAdminId(options.preferredAdminId || null);
        }, 0);
      }
      return { success: true, message: 'Login successful!' };
    } catch (error: unknown) {
      return { success: false, message: toErrorMessage(error, 'Login failed') };
    }
  };

  const signup = async (
    name: string,
    email: string,
    password: string,
    userRole: AppRole = 'student',
    options?: SignupOptions
  ) => {
    try {
      const sanitized = sanitizeSignupInput({ name, email, password });

      if (userRole === 'master_admin' && sanitized.email !== MASTER_ADMIN_EMAIL.toLowerCase()) {
        return { success: false, message: 'Master admin registration is restricted.' };
      }

      if (userRole === 'admin') {
        return { success: false, message: 'Admin accounts must be created by master admin.' };
      }

      if ((userRole === 'student' || userRole === 'instructor') && !options?.adminId) {
        return { success: false, message: 'Please select an admin workspace.' };
      }

      const { user: newUser } = await createUserWithEmailAndPassword(auth, sanitized.email, sanitized.password);

      await updateFirebaseProfile(newUser, {
        displayName: sanitized.name,
        photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(sanitized.name)}&background=6366f1&color=fff`,
      });

      await ensureAuthReadyForFirestore(newUser.uid);

      const now = new Date().toISOString();
      const batch = writeBatch(db);

      batch.set(doc(db, 'profiles', newUser.uid), {
        id: newUser.uid,
        display_name: sanitized.name,
        email: sanitized.email,
        avatar_url: newUser.photoURL,
        bio: '',
        created_at: now,
        updated_at: now,
      });

      batch.set(doc(db, 'user_roles', newUser.uid), {
        user_id: newUser.uid,
        role: userRole,
        created_at: now,
      });

      if ((userRole === 'student' || userRole === 'instructor') && options?.adminId) {
        const membershipId = makeMembershipDocId(newUser.uid, options.adminId);
        batch.set(doc(db, 'user_admin_memberships', membershipId), {
          userId: newUser.uid,
          adminId: options.adminId,
          roleUnderAdmin: userRole,
          isPrimary: true,
          createdAt: now,
        });
      }

      await batch.commit();

      if ((userRole === 'student' || userRole === 'instructor') && options?.adminId) {
        setActiveAdminId(options.adminId);
      }

      setRole(userRole);
      return { success: true, message: 'Account created!' };
    } catch (error: unknown) {
      return { success: false, message: toErrorMessage(error, 'Signup failed') };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const googleUser = result.user;
      const safeGoogleName = sanitizeDisplayNameForProfile(googleUser.displayName || 'User');

      await ensureAuthReadyForFirestore(googleUser.uid);

      const profileRef = doc(db, 'profiles', googleUser.uid);
      const roleRef = doc(db, 'user_roles', googleUser.uid);

      let selectedAdmin = adminUnits.find((a) => a.status === 'active')?.id;
      if (!selectedAdmin) {
        try {
          selectedAdmin = await ensureDefaultAdminUnit();
        } catch {
          selectedAdmin = null;
        }
      }

      const membershipId = selectedAdmin ? makeMembershipDocId(googleUser.uid, selectedAdmin) : null;
      const membershipRef = membershipId ? doc(db, 'user_admin_memberships', membershipId) : null;

      const [profileSnap, roleSnap, membershipSnap] = await Promise.all([
        getDoc(profileRef),
        getDoc(roleRef),
        membershipRef ? getDoc(membershipRef) : Promise.resolve(null),
      ]);

      const now = new Date().toISOString();
      const batch = writeBatch(db);
      let hasWrites = false;

      if (!profileSnap.exists()) {
        batch.set(profileRef, {
          id: googleUser.uid,
          display_name: safeGoogleName,
          email: googleUser.email || '',
          avatar_url: googleUser.photoURL,
          bio: '',
          created_at: now,
          updated_at: now,
        });
        hasWrites = true;
      }

      if (!roleSnap.exists()) {
        batch.set(roleRef, {
          user_id: googleUser.uid,
          role: 'student',
          created_at: now,
        });
        hasWrites = true;
      }

      if (selectedAdmin && membershipRef && !membershipSnap?.exists()) {
        batch.set(membershipRef, {
          userId: googleUser.uid,
          adminId: selectedAdmin,
          roleUnderAdmin: 'student',
          isPrimary: true,
          createdAt: now,
        });
        hasWrites = true;
      }

      if (hasWrites) {
        await batch.commit();
      }

      if (selectedAdmin) {
        setActiveAdminId(selectedAdmin);
      }

      return { success: true, message: 'Google sign-in successful!' };
    } catch (error: unknown) {
      return { success: false, message: toErrorMessage(error, 'Google sign-in failed') };
    }
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
    setRole('student');
    setMemberships([]);
    setActiveAdminId(null);
  };

  const updateProfileData = async (data: Partial<Profile>) => {
    if (!user) return;
    await updateDoc(doc(db, 'profiles', user.uid), {
      ...data,
      updated_at: new Date().toISOString(),
    });
    await fetchProfile(user.uid);
  };

  const switchActiveAdmin = async (adminId: string) => {
    if (!user) return;

    if (role !== 'master_admin' && !memberships.some((m) => m.adminId === adminId)) {
      throw new Error('You do not belong to this admin workspace.');
    }

    setActiveAdminId(adminId);
    saveActiveAdmin(adminId);
  };

  const createAdminUnit = async (name: string, status: 'active' | 'upcoming') => {
    try {
      if (role !== 'master_admin' || !user) {
        return { success: false, message: 'Only master admin can create admin workspaces.' };
      }

      const adminId = `admin-${Date.now()}`;
      await setDoc(doc(db, 'admin_units', adminId), {
        name,
        status,
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
      });

      await writeAuditLog('admin_unit_created', {
        adminId,
        name,
        status,
      });

      await fetchAdminUnits();
      return { success: true, message: 'Admin workspace created.', adminId };
    } catch (error: unknown) {
      return { success: false, message: toErrorMessage(error, 'Failed to create admin workspace.') };
    }
  };

  const assignUserToAdmin = async (
    userId: string,
    adminId: string,
    roleUnderAdmin: 'student' | 'instructor' | 'admin',
    isPrimary = false
  ) => {
    try {
      if ((role !== 'master_admin' && role !== 'admin') || !user) {
        return { success: false, message: 'You are not authorized to assign users.' };
      }

      const membershipId = makeMembershipDocId(userId, adminId);
      await setDoc(doc(db, 'user_admin_memberships', membershipId), {
        userId,
        adminId,
        roleUnderAdmin,
        isPrimary,
        createdAt: new Date().toISOString(),
      }, { merge: true });

      if (roleUnderAdmin === 'admin') {
        await setDoc(doc(db, 'user_roles', userId), {
          user_id: userId,
          role: 'admin',
          created_at: new Date().toISOString(),
        }, { merge: true });
      }

      await writeAuditLog('user_assigned_to_admin', {
        userId,
        adminId,
        roleUnderAdmin,
        isPrimary,
      });

      if (userId === user.uid) {
        await fetchMemberships(user.uid);
      }

      return { success: true, message: 'User assigned successfully.' };
    } catch (error: unknown) {
      return { success: false, message: toErrorMessage(error, 'Failed to assign user.') };
    }
  };

  const updateAdminUnitStatus = async (adminId: string, status: 'active' | 'upcoming') => {
    try {
      if (!user || role !== 'master_admin') {
        return { success: false, message: 'Only master admin can update admin workspace status.' };
      }

      await updateDoc(doc(db, 'admin_units', adminId), { status });
      await writeAuditLog('admin_unit_status_updated', { adminId, status });
      await fetchAdminUnits();

      return { success: true, message: 'Admin workspace status updated.' };
    } catch (error: unknown) {
      return { success: false, message: toErrorMessage(error, 'Failed to update admin workspace status.') };
    }
  };

  const deleteAdminUnit = async (adminId: string) => {
    try {
      if (!user || role !== 'master_admin') {
        return { success: false, message: 'Only master admin can delete admin workspaces.' };
      }

      const allUnits = await fetchAdminUnits();
      if (allUnits.length <= 1) {
        return { success: false, message: 'At least one admin workspace must exist.' };
      }

      const [membershipsSnap, coursesSnap] = await Promise.all([
        getDocs(query(collection(db, 'user_admin_memberships'), where('adminId', '==', adminId))),
        getDocs(query(collection(db, 'courses'), where('adminId', '==', adminId))),
      ]);

      if (!membershipsSnap.empty) {
        return {
          success: false,
          message: 'Cannot delete workspace while users are assigned. Remove workspace users first.',
        };
      }

      if (!coursesSnap.empty) {
        return {
          success: false,
          message: 'Cannot delete workspace while courses are linked. Move or delete those courses first.',
        };
      }

      await deleteDoc(doc(db, 'admin_units', adminId));

      await writeAuditLog('admin_unit_deleted', {
        adminId,
      });

      await fetchAdminUnits();
      return { success: true, message: 'Admin workspace deleted successfully.' };
    } catch (error: unknown) {
      return { success: false, message: toErrorMessage(error, 'Failed to delete admin workspace.') };
    }
  };

  const createManagedUserAccount = async (
    name: string,
    email: string,
    password: string,
    adminId: string,
    roleUnderAdmin: 'student' | 'instructor' | 'admin'
  ) => {
    try {
      if (!user || role !== 'master_admin') {
        return { success: false, message: 'Only master admin can create managed users.' };
      }

      if (password.length < 8) {
        return { success: false, message: 'Password must be at least 8 characters.' };
      }

      const sanitized = sanitizeSignupInput({ name, email, password });

      const provisioningAuth = getProvisioningAuth();
      const credential = await createUserWithEmailAndPassword(
        provisioningAuth,
        sanitized.email,
        sanitized.password
      );
      const createdUser = credential.user;

      await signOut(provisioningAuth);

      await setDoc(doc(db, 'profiles', createdUser.uid), {
        id: createdUser.uid,
        display_name: sanitized.name,
        email: sanitized.email,
        avatar_url: null,
        bio: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { merge: true });

      await setDoc(doc(db, 'user_roles', createdUser.uid), {
        user_id: createdUser.uid,
        role: roleUnderAdmin,
        created_at: new Date().toISOString(),
      }, { merge: true });

      const membershipId = makeMembershipDocId(createdUser.uid, adminId);
      await setDoc(doc(db, 'user_admin_memberships', membershipId), {
        userId: createdUser.uid,
        adminId,
        roleUnderAdmin,
        isPrimary: true,
        createdAt: new Date().toISOString(),
      }, { merge: true });

      await writeAuditLog('managed_user_created', {
        userId: createdUser.uid,
        email: sanitized.email,
        adminId,
        roleUnderAdmin,
      });

      return { success: true, message: 'User account created and assigned successfully.', userId: createdUser.uid };
    } catch (error: unknown) {
      return { success: false, message: toErrorMessage(error, 'Failed to create user account.') };
    }
  };

  const removeUserFromAdmin = async (userId: string, adminId: string) => {
    try {
      if (!user || role !== 'master_admin') {
        return { success: false, message: 'Only master admin can remove users from workspace.' };
      }

      const membershipId = makeMembershipDocId(userId, adminId);
      await deleteDoc(doc(db, 'user_admin_memberships', membershipId));

      await writeAuditLog('user_removed_from_admin', {
        userId,
        adminId,
      });

      if (userId === user.uid) {
        await fetchMemberships(user.uid);
      }

      return { success: true, message: 'User removed from workspace.' };
    } catch (error: unknown) {
      return { success: false, message: toErrorMessage(error, 'Failed to remove user from workspace.') };
    }
  };

  const listUsersByAdmin = async (adminId: string) => {
    try {
      if (!user || role !== 'master_admin') {
        return { success: false, message: 'Only master admin can list workspace users.' };
      }

      const membershipSnap = await getDocs(
        query(collection(db, 'user_admin_memberships'), where('adminId', '==', adminId))
      );

      const users = await Promise.all(membershipSnap.docs.map(async (membershipDoc) => {
        const membership = membershipDoc.data() as Omit<UserAdminMembership, 'id'>;
        const [profileSnap, roleSnap] = await Promise.all([
          getDoc(doc(db, 'profiles', membership.userId)),
          getDoc(doc(db, 'user_roles', membership.userId)),
        ]);

        const profileData = profileSnap.exists()
          ? (profileSnap.data() as { display_name?: string; email?: string })
          : {};
        const roleData = roleSnap.exists()
          ? (roleSnap.data() as { role?: AppRole })
          : {};

        return {
          userId: membership.userId,
          adminId,
          roleUnderAdmin: membership.roleUnderAdmin,
          displayName: profileData.display_name || 'Unknown User',
          email: profileData.email || '',
          appRole: roleData.role || 'student',
        } as ManagedWorkspaceUser;
      }));

      return { success: true, message: 'Workspace users loaded.', users };
    } catch (error: unknown) {
      return { success: false, message: toErrorMessage(error, 'Failed to load workspace users.') };
    }
  };

  const runDefaultAdminMigration = async () => {
    try {
      if (!user || role !== 'master_admin') {
        return { success: false, message: 'Only master admin can run migration.' };
      }

      let defaultAdminId = adminUnits.find((a) => a.status === 'active')?.id || adminUnits[0]?.id || null;

      if (!defaultAdminId) {
        const created = await createAdminUnit(defaultAdminName, 'active');
        if (!created.success || !created.adminId) {
          return { success: false, message: created.message || 'Could not create default admin workspace.' };
        }
        defaultAdminId = created.adminId;
      }

      const [profilesSnap, rolesSnap, membershipsSnap, coursesSnap] = await Promise.all([
        getDocs(collection(db, 'profiles')),
        getDocs(collection(db, 'user_roles')),
        getDocs(collection(db, 'user_admin_memberships')),
        getDocs(collection(db, 'courses')),
      ]);

      const rolesMap = new Map<string, AppRole>();
      rolesSnap.docs.forEach((d) => {
        const data = d.data() as { user_id?: string; role?: AppRole };
        if (data.user_id && data.role) rolesMap.set(data.user_id, data.role);
      });

      const membershipSet = new Set<string>(membershipsSnap.docs.map((d) => d.id));

      let membershipsCreated = 0;
      let rolesCreated = 0;
      let coursesUpdated = 0;

      const userBatch = writeBatch(db);

      profilesSnap.docs.forEach((profileDoc) => {
        const uid = profileDoc.id;
        if (!rolesMap.has(uid)) {
          userBatch.set(doc(db, 'user_roles', uid), {
            user_id: uid,
            role: 'student',
            created_at: new Date().toISOString(),
          }, { merge: true });
          rolesCreated += 1;
          rolesMap.set(uid, 'student');
        }

        const membershipId = makeMembershipDocId(uid, defaultAdminId as string);
        if (!membershipSet.has(membershipId)) {
          userBatch.set(doc(db, 'user_admin_memberships', membershipId), {
            userId: uid,
            adminId: defaultAdminId,
            roleUnderAdmin: normalizeRoleForMembership(rolesMap.get(uid) || 'student'),
            isPrimary: true,
            createdAt: new Date().toISOString(),
          }, { merge: true });
          membershipsCreated += 1;
        }
      });

      await userBatch.commit();

      const courseBatch = writeBatch(db);
      coursesSnap.docs.forEach((courseDoc) => {
        const data = courseDoc.data() as { adminId?: string };
        if (!data.adminId) {
          courseBatch.update(doc(db, 'courses', courseDoc.id), { adminId: defaultAdminId });
          coursesUpdated += 1;
        }
      });

      if (coursesUpdated > 0) {
        await courseBatch.commit();
      }

      await writeAuditLog('default_admin_migration_completed', {
        defaultAdminId,
        usersProcessed: profilesSnap.docs.length,
        membershipsCreated,
        rolesCreated,
        coursesUpdated,
      });

      await refreshProfile();

      return {
        success: true,
        message: 'Migration completed successfully.',
        summary: {
          defaultAdminId,
          usersProcessed: profilesSnap.docs.length,
          membershipsCreated,
          rolesCreated,
          coursesUpdated,
        },
      };
    } catch (error: unknown) {
      return { success: false, message: toErrorMessage(error, 'Failed to run migration.') };
    }
  };

  const activeAdmin = useMemo(
    () => adminUnits.find((u) => u.id === activeAdminId) || null,
    [adminUnits, activeAdminId]
  );

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      role,
      isAuthenticated: !!user,
      loading,
      adminUnits,
      memberships,
      activeAdminId,
      activeAdmin,
      login,
      signup,
      signInWithGoogle,
      logout,
      updateProfile: updateProfileData,
      refreshProfile,
      switchActiveAdmin,
      createAdminUnit,
      assignUserToAdmin,
      updateAdminUnitStatus,
      deleteAdminUnit,
      createManagedUserAccount,
      removeUserFromAdmin,
      listUsersByAdmin,
      runDefaultAdminMigration,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
