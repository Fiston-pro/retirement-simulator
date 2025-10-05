import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  type User,
} from "firebase/auth";
import { getFirestore, serverTimestamp, collection, addDoc, doc, setDoc, FieldValue } from "firebase/firestore";

const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate envs early to avoid cryptic runtime errors
const missing = Object.entries(cfg)
  .filter(([, v]) => !v)
  .map(([k]) => k);
if (missing.length) {
  // eslint-disable-next-line no-console
  console.warn(
    `[Firebase] Missing env vars: ${missing.join(
      ", "
    )}. Check .env.local and Vercel env settings.`
  );
}

const app = getApps().length ? getApps()[0] : initializeApp(cfg as any);

export const auth = getAuth(app);
export const db = getFirestore(app);

export function watchUser(cb: (u: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

export async function loginAnon() {
  try {
    return await signInAnonymously(auth);
  } catch (e: any) {
    // Helpful console message for common misconfig
    console.error("[Firebase] Anonymous sign-in failed:", e?.code || e);
    throw new Error(
      e?.code === "auth/configuration-not-found"
        ? "Anonymous sign-in is not enabled in Firebase Console → Authentication → Sign-in method."
        : e?.message || "Sign-in failed"
    );
  }
}

export async function loginGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    return await signInWithPopup(auth, provider);
  } catch (e: any) {
    console.error("[Firebase] Google sign-in failed:", e?.code || e);
    if (e?.code === "auth/configuration-not-found") {
      throw new Error(
        "Google sign-in is not enabled. Enable Google provider in Firebase Console → Authentication → Sign-in method, and ensure your domain is authorized."
      );
    }
    throw new Error(e?.message || "Google sign-in failed");
  }
}

export async function logout() {
  try {
    await signOut(auth);
  } catch (e) {
    console.error("[Firebase] Logout failed:", e);
  }
}

export async function upsertProfile(uid: string, profile: any) {
  const ref = doc(db, "users", uid);
  await setDoc(ref, { profile, updatedAt: serverTimestamp() }, { merge: true });
}

export function sanitizeUndefined<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj as any;

  // Leave Firestore sentinels alone
  if (obj instanceof FieldValue) return obj as any;

  if (Array.isArray(obj)) return obj.map(sanitizeUndefined) as any;

  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    // Leave serverTimestamp etc. alone
    if (v instanceof FieldValue) {
      out[k] = v;
    } else {
      out[k] = sanitizeUndefined(v as any);
    }
  }
  return out;
}

export async function saveForecast(uid: string, data: any) {
  const col = collection(db, "users", uid, "forecasts");
  const safe = sanitizeUndefined({
    ...data,
    createdAt: serverTimestamp(), // will pass through untouched
  });
  await addDoc(col, safe);
}