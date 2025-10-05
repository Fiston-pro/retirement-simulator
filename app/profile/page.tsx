"use client";

import React from "react";
import { focusRing } from "@/components/a11y/WCAGKit";
import { useUserCtx } from "@/lib/userCtx";
import { loginAnon, loginGoogle, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export const dynamic = "force-dynamic";

type Goals = {
  monthlySave?: number;
  netflix?: boolean;
  coffee?: boolean;
  smoking?: boolean;
  customNote?: string;
  updatedAt?: any;
};

export default function ProfilePage() {
  const { user, profile, saveProfile } = useUserCtx();

  // ----- PROFILE FORM -----
  const [form, setForm] = React.useState({
    name: "",
    birthYear: "",
    salary: "",
    desired: "",
    postal: "",
  } as Record<string, string | number>);
  const [savedMsg, setSavedMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    setForm({
      name: profile?.name || "",
      birthYear: profile?.birthYear?.toString() || "",
      salary: profile?.salary?.toString() || "",
      desired: profile?.desired?.toString() || "",
      postal: profile?.postal || "",
    });
  }, [profile?.name, profile?.birthYear, profile?.salary, profile?.desired, profile?.postal]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    await saveProfile({
      name: String(form.name || "").trim() || undefined,
      birthYear: form.birthYear ? Number(form.birthYear) : undefined,
      salary: form.salary ? Number(form.salary) : undefined,
      desired: form.desired ? Number(form.desired) : undefined,
      postal: String(form.postal || "").trim() || undefined,
    });
    setSavedMsg("Profile saved ✅");
    setTimeout(() => setSavedMsg(null), 2000);
  }

  // ----- GOALS / GAMIFY (cloud) -----
  const [goals, setGoals] = React.useState<Goals | null>(null);
  const [goalsMsg, setGoalsMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      if (!user) { setGoals(null); return; }
      const snap = await getDoc(doc(db, "users", user.uid, "meta", "goals"));
      setGoals((snap.exists() ? (snap.data() as Goals) : { monthlySave: 0, netflix: false, coffee: false, smoking: false, customNote: "" }));
    })();
  }, [user?.uid]);

  async function saveGoals(partial: Partial<Goals>) {
    if (!user) return;
    const next = { ...(goals || {}), ...partial, updatedAt: serverTimestamp() };
    await setDoc(doc(db, "users", user.uid, "meta", "goals"), next, { merge: true });
    setGoals({ ...next, updatedAt: new Date() } as any);
    setGoalsMsg("Goals saved ✅");
    setTimeout(() => setGoalsMsg(null), 1500);
  }

  const monthlyFromToggles =
    (goals?.netflix ? 29 : 0) + (goals?.coffee ? 120 : 0) + (goals?.smoking ? 500 : 0);
  const monthlyTotal = (goals?.monthlySave || 0) + monthlyFromToggles;

  // A tiny projection: “what could this add at retirement?”
  const nowYear = new Date().getFullYear();
  const yearsToRet =
    (profile?.birthYear ? Math.max(0, (profile.birthYear + 65) - nowYear) : 25); // rough guess
  const realReturn = 0.03; // 3% real
  const annuityYears = 20; // draw period
  const futurePot = monthlyTotal * (((1 + realReturn) ** (yearsToRet) - 1) / realReturn); // future value of series
  const monthlyAddAtRet = (futurePot / (annuityYears * 12)) || 0;

  return (
    <div className="grid gap-4 sm:gap-6">
      {/* Header card */}
      <section className="rounded-3xl p-5 sm:p-6 text-white shadow-sm" style={{ background: "linear-gradient(135deg,#00416E,#3F84D2)" }}>
        <h1 className="text-xl sm:text-2xl font-semibold">Your profile</h1>
        <p className="text-white/90 text-sm sm:text-base mt-1">Edit your details to personalize the simulator and assistant.</p>

        {!user ? (
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <button onClick={loginAnon} className={`px-4 py-2 rounded-2xl bg-white/20 ${focusRing}`}>Continue as guest (Anonymous)</button>
            <button onClick={loginGoogle} className={`px-4 py-2 rounded-2xl bg-white text-[#00416E] font-medium ${focusRing}`}>Sign in with Google</button>
          </div>
        ) : (
          <p className="mt-3 text-xs sm:text-sm">
            Signed in as <strong>{user.isAnonymous ? "Anonymous" : user.displayName || user.email}</strong>
          </p>
        )}
      </section>

      {/* Profile form */}
      <section className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Personal details</h2>
        <p className="text-sm text-gray-600">Saved securely in the cloud.</p>

        <form onSubmit={onSave} className="grid gap-3 mt-3 max-w-xl">
          <Field label="Full name">
            <input
              disabled={!user}
              className={`p-2 border rounded ${focusRing} w-full`}
              placeholder="Jan Kowalski"
              value={String(form.name ?? "")}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Year of birth">
              <input
                disabled={!user}
                type="number"
                className={`p-2 border rounded ${focusRing} w-full`}
                placeholder="1992"
                min={1940}
                max={new Date().getFullYear()}
                value={String(form.birthYear ?? "")}
                onChange={(e) => setForm((f) => ({ ...f, birthYear: e.target.value }))}
              />
            </Field>
            <Field label="Postal code">
              <input
                disabled={!user}
                className={`p-2 border rounded ${focusRing} w-full`}
                placeholder="00-001"
                value={String(form.postal ?? "")}
                onChange={(e) => setForm((f) => ({ ...f, postal: e.target.value }))}
              />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Gross salary (PLN / month)">
              <input
                disabled={!user}
                type="number"
                min={0}
                className={`p-2 border rounded ${focusRing} w-full`}
                placeholder="7000"
                value={String(form.salary ?? "")}
                onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))}
              />
            </Field>
            <Field label="Desired pension (PLN / month)">
              <input
                disabled={!user}
                type="number"
                min={0}
                className={`p-2 border rounded ${focusRing} w-full`}
                placeholder="4500"
                value={String(form.desired ?? "")}
                onChange={(e) => setForm((f) => ({ ...f, desired: e.target.value }))}
              />
            </Field>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={!user}
              className={`px-4 py-2 rounded-2xl bg-[#00993F] text-white ${focusRing} disabled:opacity-50`}
              aria-disabled={!user}
              title={user ? "Save to cloud" : "Sign in to save"}
            >
              Save changes
            </button>
            {savedMsg && <span className="text-xs text-green-700 self-center">{savedMsg}</span>}
          </div>
        </form>
      </section>

      {/* Goals & Gamify */}
      <section className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Goals & gamify</h2>
        <p className="text-sm text-gray-600">Small recurring steps that can boost your pension.</p>

        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          <Field label="Monthly savings (PLN)">
            <input
              disabled={!user}
              type="number"
              min={0}
              className={`p-2 border rounded ${focusRing} w-full`}
              placeholder="100"
              value={goals?.monthlySave ?? ""}
              onChange={(e) => saveGoals({ monthlySave: e.target.value ? Number(e.target.value) : 0 })}
            />
          </Field>

          <Field label="Custom note (optional)">
            <input
              disabled={!user}
              className={`p-2 border rounded ${focusRing} w-full`}
              placeholder="Quit rideshares on weekdays"
              value={goals?.customNote ?? ""}
              onChange={(e) => saveGoals({ customNote: e.target.value })}
            />
          </Field>
        </div>

        <ul className="grid gap-2 text-sm mt-3" role="list">
          <li className="flex items-center justify-between">
            <div>
              <div className="font-medium">Quit Netflix month</div>
              <div className="text-xs text-gray-600">“Trade 2h streaming for a stronger future.”</div>
            </div>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                disabled={!user}
                checked={!!goals?.netflix}
                onChange={(e) => saveGoals({ netflix: e.target.checked })}
              />
              <span>+29 PLN</span>
            </label>
          </li>
          <li className="flex items-center justify-between">
            <div>
              <div className="font-medium">Skip daily coffee</div>
              <div className="text-xs text-gray-600">“Brew at home, boost your pension.”</div>
            </div>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                disabled={!user}
                checked={!!goals?.coffee}
                onChange={(e) => saveGoals({ coffee: e.target.checked })}
              />
              <span>+120 PLN</span>
            </label>
          </li>
          <li className="flex items-center justify-between">
            <div>
              <div className="font-medium">No smoking budget</div>
              <div className="text-xs text-gray-600">“Quit a pack, fund your future.”</div>
            </div>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                disabled={!user}
                checked={!!goals?.smoking}
                onChange={(e) => saveGoals({ smoking: e.target.checked })}
              />
              <span>+500 PLN</span>
            </label>
          </li>
        </ul>

        <div className="mt-3 grid sm:grid-cols-3 gap-2 text-sm">
          <div className="rounded-xl px-3 py-2 bg-[#F1F5F9]">Monthly total: <strong>{monthlyTotal} PLN</strong></div>
          <div className="rounded-xl px-3 py-2 bg-[#F1F5F9]">Years to retirement (rough): <strong>{yearsToRet}</strong></div>
          <div className="rounded-xl px-3 py-2 bg-[#E7F6EE]">Potential extra at retirement: <strong>{Math.round(monthlyAddAtRet)} PLN/m</strong></div>
        </div>

        {goalsMsg && <div className="mt-2 text-xs text-green-700">{goalsMsg}</div>}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
