"use client";
import React from "react";
import { watchUser, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import type { User } from "firebase/auth";

export type UserProfile = {
  name?: string;
  birthYear?: number;
  salary?: number;
  desired?: number;
  postal?: string;
  updatedAt?: any;
};

type Ctx = {
  user: User | null;
  profile: UserProfile | null;
  refresh: () => Promise<void>;
  saveProfile: (p: Partial<UserProfile>) => Promise<void>;
};

const C = React.createContext<Ctx>({
  user: null,
  profile: null,
  refresh: async () => {},
  saveProfile: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);

  const loadProfile = React.useCallback(async () => {
    if (!user) { setProfile(null); return; }
    const snap = await getDoc(doc(db, "users", user.uid));
    setProfile((snap.exists() ? (snap.data().profile || {}) : {}) as UserProfile);
  }, [user]);

  React.useEffect(() => watchUser(setUser), []);
  React.useEffect(() => { loadProfile(); }, [loadProfile]);

  async function saveProfile(partial: Partial<UserProfile>) {
    if (!user) return;
    const next = { ...(profile || {}), ...partial, updatedAt: serverTimestamp() };
    await setDoc(doc(db, "users", user.uid), { profile: next }, { merge: true });
    setProfile({ ...next, updatedAt: new Date() } as any);

    // inside saveProfile()
    await setDoc(doc(db, "users", user.uid), {
      email: user.isAnonymous ? null : user.email || user.displayName || null,
      isAnonymous: !!user.isAnonymous,
      profile: next,
    }, { merge: true });

  }

  return <C.Provider value={{ user, profile, refresh: loadProfile, saveProfile }}>{children}</C.Provider>;
}

export const useUserCtx = () => React.useContext(C);
