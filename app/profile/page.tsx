// app/profile/page.tsx
"use client";

import React from "react";
import { focusRing } from "@/components/a11y/WCAGKit";
import { useUserCtx } from "@/lib/userCtx";
import { serverTimestamp, setDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const fakeChallenges = [
  { id: "coffee", label: "Skip Coffee", amount: 15, icon: "☕" },
  { id: "netflix", label: "Pause Netflix", amount: 50, icon: "🎬" },
  { id: "bike", label: "Bike to Work", amount: 20, icon: "🚴" },
];

const fakeFriends = [
  { id: "1", name: "Anna", avatar: "https://i.pravatar.cc/40?img=1" },
  { id: "2", name: "Kuba", avatar: "https://i.pravatar.cc/40?img=2" },
  { id: "3", name: "Marek", avatar: "https://i.pravatar.cc/40?img=3" },
];

export default function ProfilePage() {
  const { user, profile } = useUserCtx();
  const [fund, setFund] = React.useState(0);
  const [badges, setBadges] = React.useState<string[]>([]);

  function addChallenge(c: typeof fakeChallenges[number]) {
    const newFund = fund + c.amount;
    setFund(newFund);
    // unlock badges based on total
    const newBadges: string[] = [];
    if (newFund >= 50) newBadges.push("🥉");
    if (newFund >= 200) newBadges.push("🥈");
    if (newFund >= 500) newBadges.push("🥇");
    if (newFund >= 1000) newBadges.push("🏆");
    setBadges(newBadges);
  }

  const [name, setName] = React.useState(profile?.name || "");
  const [birthYear, setBirthYear] = React.useState(profile?.birthYear || "");
  const [salary, setSalary] = React.useState(profile?.salary || "");

  async function saveProfile() {
    if (!user) return;
    await setDoc(
      doc(db, "users", user.uid),
      {
        name,
        birthYear: Number(birthYear) || null,
        salary: Number(salary) || null,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    alert("Profile updated!");
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">

<section className="bg-white rounded-3xl p-6 shadow-sm">
  <h2 className="text-lg font-semibold mb-2">Your Info</h2>
  <div className="grid sm:grid-cols-3 gap-3">
    <input
      className={`p-2 border rounded ${focusRing}`}
      placeholder="Name"
      value={name}
      onChange={(e) => setName(e.target.value)}
    />
    <input
      className={`p-2 border rounded ${focusRing}`}
      placeholder="Birth year"
      value={birthYear}
      onChange={(e) => setBirthYear(e.target.value)}
    />
    <input
      className={`p-2 border rounded ${focusRing}`}
      placeholder="Gross salary PLN"
      value={salary}
      onChange={(e) => setSalary(e.target.value)}
    />
  </div>
  <button
    onClick={saveProfile}
    className={`mt-3 px-4 py-2 rounded-2xl bg-[#00993F] text-white ${focusRing}`}
  >
    Save profile
  </button>
</section>


      <section
        className="rounded-3xl p-6 text-white"
        style={{ background: "linear-gradient(135deg,#3F84D2,#00993F)" }}
      >
        <h1 className="text-2xl font-semibold">Your Profile</h1>
        <p className="text-white/90">
          {user ? `Hi ${profile?.name || user.email}!` : "You’re browsing as guest."}
        </p>
      </section>

      {/* Progress */}
      <section className="bg-white rounded-3xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Your Future Fund</h2>
        <div className="text-2xl font-bold">{fund} PLN saved</div>
        <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
          <div
            className="bg-[#3F84D2] h-3 rounded-full"
            style={{ width: `${Math.min(100, (fund / 1000) * 100)}%` }}
          ></div>
        </div>
        {badges.length > 0 && (
          <div className="mt-2 flex gap-2 text-2xl">{badges.map((b, i) => <span key={i}>{b}</span>)}</div>
        )}
      </section>

      {/* Challenges */}
      <section className="bg-white rounded-3xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Daily / Monthly Challenges</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {fakeChallenges.map((c) => (
            <button
              key={c.id}
              onClick={() => addChallenge(c)}
              className={`flex flex-col items-center gap-2 border rounded-2xl p-4 hover:bg-gray-50 ${focusRing}`}
            >
              <div className="text-3xl">{c.icon}</div>
              <div className="font-medium">{c.label}</div>
              <div className="text-sm text-gray-500">+{c.amount} PLN</div>
            </button>
          ))}
        </div>
      </section>

      {/* Friends */}
      <section className="bg-white rounded-3xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Your Friends</h2>
        <div className="flex flex-wrap gap-4">
          {fakeFriends.map((f) => (
            <div
              key={f.id}
              className="flex flex-col items-center gap-1 border rounded-2xl p-3 w-24 hover:bg-gray-50"
            >
              <img src={f.avatar} alt="" className="w-10 h-10 rounded-full" />
              <div className="text-sm font-medium">{f.name}</div>
              <button
                className={`text-xs px-2 py-1 rounded bg-[#FFB34F] text-[#001B2E] ${focusRing}`}
              >
                Challenge
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <button
            className={`px-4 py-2 rounded-2xl bg-[#00993F] text-white ${focusRing}`}
          >
            Invite Friends
          </button>
        </div>
      </section>
    </div>
  );
}
