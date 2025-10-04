"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { motion } from "framer-motion";

export default function LandingPage() {
  const router = useRouter();
  const [desired, setDesired] = useState<number | "">("");
  const [averagePension] = useState<number>(2550); // placeholder — replace with real data

  const pensionGroups = [
    {
      key: "below_min",
      label: "Pensions below minimum",
      value: 1200,
      desc:
        "Beneficiaries receiving a pension below the minimum often had low employment activity or did not work the required years to get the guaranteed minimum.",
    },
    {
      key: "average",
      label: "Average pension",
      value: averagePension,
      desc: "The average monthly pension across beneficiaries in Poland.",
    },
    {
      key: "top",
      label: "Top pensions",
      value: 12000,
      desc: "The highest pensions are usually received by long-career workers, occasionally concentrated in certain regions.",
    },
  ];

  const facts = [
    "Did you know that retirement age affects your pension size significantly — delaying retirement usually increases the pension amount.",
    "Pension amounts differ by region and career length.",
    "Periods of illness can reduce the amount accumulated; the simulator can include average sick-leave effects.",
  ];

  const [factIndex, setFactIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setFactIndex((i) => (i + 1) % facts.length), 8000);
    return () => clearInterval(t);
  }, [facts.length]);

  const data = [
    { name: "Average", value: averagePension },
    { name: "Your goal", value: desired === "" ? 0 : (desired as number) },
  ];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = desired === "" ? "" : `?desired=${desired}`;
    router.push(`/forecast${q}`);
  }

  return (
    <main className="min-h-screen bg-[#F7F9FB] text-black p-6">
      <header className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: "#00416E" }}
              aria-hidden
            >
              ZUS
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Plan your future pension</h1>
              <p className="text-sm text-gray-600">A simple tool to compare your expectation vs forecast.</p>
            </div>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: input + quick chart */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl shadow-sm"
        >
          <form onSubmit={handleSubmit} aria-label="Desired pension form">
            <label htmlFor="desired" className="block text-sm font-medium">
              What pension would you like to have (PLN / month)?
            </label>
            <input
              id="desired"
              name="desired"
              type="number"
              inputMode="numeric"
              min={0}
              value={desired}
              onChange={(e) => setDesired(e.target.value === "" ? "" : Number(e.target.value))}
              className="mt-2 w-full rounded p-3 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#3F84D2]"
              aria-describedby="desired-help"
            />
            <div id="desired-help" className="sr-only">
              Enter the monthly pension amount you would like in today's PLN.
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 rounded bg-[#00993F] text-white focus:ring-2 focus:ring-offset-2 focus:ring-[#00416E]"
              >
                Compare
              </button>

              <button
                type="button"
                onClick={() => setDesired(averagePension)}
                className="px-3 py-2 rounded border"
              >
                Use average ({averagePension} PLN)
              </button>

              <button
                type="button"
                onClick={() => setDesired(0)}
                className="px-3 py-2 rounded border text-sm"
              >
                Clear
              </button>
            </div>

            <div className="mt-6" role="region" aria-live="polite">
              <h3 className="text-sm font-medium">Quick comparison</h3>
              <div className="h-52 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(val: any) => `${val} PLN`} />
                    <Bar dataKey="value">
                      <Cell key={`cell-avg`} fill="#3F84D2" />
                      <Cell key={`cell-goal`} fill="#FFB34F" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </form>
        </motion.div>

        {/* Right: pension groups & facts */}
        <motion.aside initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-2xl shadow-sm">
          <h3 className="text-lg font-semibold">Pension groups</h3>
          <ul className="mt-4 grid gap-3">
            {pensionGroups.map((g) => (
              <li
                key={g.key}
                className="group p-3 rounded border border-gray-100 hover:shadow-md focus-within:shadow-md"
                tabIndex={0}
                aria-describedby={`desc-${g.key}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{g.label}</div>
                    <div className="text-xs text-gray-500">{g.value} PLN (avg)</div>
                  </div>
                  <div className="ml-4 text-sm text-gray-400">Hover for details</div>
                </div>
                <p id={`desc-${g.key}`} className="mt-2 text-sm text-gray-600 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-all">
                  {g.desc}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <h4 className="text-sm font-medium">Did you know?</h4>
            <p className="mt-2 text-sm text-gray-700" aria-live="polite">{facts[factIndex]}</p>
          </div>
        </motion.aside>
      </section>

      <footer className="max-w-6xl mx-auto mt-8 text-xs text-gray-500">Built for Hackathon — uses mock data. Replace placeholders with official ZUS / GUS / NBP data.</footer>
    </main>
  );
}
