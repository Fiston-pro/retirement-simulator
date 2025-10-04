"use client";

import React from "react";
import { save, load, pushArr } from "@/lib/store";
import { motion } from "framer-motion";
import { focusRing, VisuallyHidden } from "@/components/a11y/WCAGKit";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export const dynamic = "force-dynamic";

const PLN = (n: number) => `${new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(n)))} PLN`;

const DAILY_KEY = "zus-gamify-daily"; // array of {date: YYYY-MM-DD, amount}
const MONTHLY_KEY = "zus-gamify-monthly"; // { netflix: boolean, coffee: boolean, smoking: boolean, custom: number }

const slogans = [
  "Future-you says: thanks!",
  "Small steps, big pension.",
  "Skip now, smile later.",
  "Compound your calm.",
  "Today's choice, tomorrow's freedom.",
];

export default function GamifyPage() {
  const [todayAmount, setTodayAmount] = React.useState<number | "">("");
  const [daily, setDaily] = React.useState<{ date: string; amount: number }[]>([]);
  const [monthly, setMonthly] = React.useState(load(MONTHLY_KEY, { netflix: false, coffee: false, smoking: false, custom: 0 }));

  React.useEffect(() => {
    setDaily(load(DAILY_KEY, [] as { date: string; amount: number }[]));
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const totalDaily = daily.reduce((a, b) => a + b.amount, 0);
  const monthlySum = (monthly.netflix ? 29 : 0) + (monthly.coffee ? 120 : 0) + (monthly.smoking ? 500 : 0) + (Number(monthly.custom) || 0);

  function addToday() {
    if (!todayAmount || Number(todayAmount) <= 0) return;
    const entry = { date: today, amount: Number(todayAmount) };
    pushArr(DAILY_KEY, entry);
    setDaily((d) => [...d, entry]);
    setTodayAmount("");
  }

  function toggleMonthly(k: keyof typeof monthly) {
    const next = { ...monthly, [k]: !monthly[k] };
    setMonthly(next);
    save(MONTHLY_KEY, next);
  }

  function updateCustom(v: number) {
    const next = { ...monthly, custom: v };
    setMonthly(next);
    save(MONTHLY_KEY, next);
  }

  // Build cumulative series for chart
  const series = daily
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .reduce(
      (acc: Array<{ date: string; saved: number }>, cur) => {
        const prev = acc.length ? acc[acc.length - 1].saved : 0;
        acc.push({ date: cur.date, saved: prev + cur.amount });
        return acc;
      },
      []
    );

  const slogan = slogans[(daily.length + (monthly.netflix ? 1 : 0) + (monthly.coffee ? 1 : 0) + (monthly.smoking ? 1 : 0)) % slogans.length];

  return (
    <div className="min-h-screen bg-[#F3F6FA] text-[#001B2E]">
      <section className="max-w-6xl mx-auto px-6 pt-10">
        <h1 className="text-2xl font-semibold text-[#00416E]">Savings challenges</h1>
        <p className="text-sm text-gray-600 mt-1">Gamified nudges to redirect small expenses to your pension.</p>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-6 grid gap-6 md:grid-cols-[1.3fr_1fr]">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-6 shadow-sm">
          <h2 className="font-semibold mb-2">Daily: “Skip it, save it”</h2>
          <p className="text-sm text-gray-600 mb-4">Log small wins (e.g., skipped cigarettes, snacks, taxi). Build your streak.</p>

          <div className="flex gap-2 items-end">
            <label className="grid gap-1">
              <span className="text-sm font-medium">Amount saved today (PLN)</span>
              <input
                type="number"
                value={todayAmount as any}
                onChange={(e) => setTodayAmount(e.target.value ? Number(e.target.value) : "")}
                className={`p-2 border rounded ${focusRing}`}
                placeholder="15"
                min={0}
              />
            </label>
            <button onClick={addToday} className={`px-4 py-2 rounded bg-[#00993F] text-white ${focusRing}`}>Add</button>
          </div>

          <div className="h-72 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ left: 10, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3F84D2" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#3F84D2" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v: any) => PLN(Number(v))} />
                <Area type="monotone" dataKey="saved" stroke="#3F84D2" fill="url(#gS)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 text-sm text-gray-700">Total logged: <strong>{PLN(totalDaily)}</strong></div>
          <div className="mt-1 text-xs text-gray-500" aria-live="polite">{slogan}</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-6 shadow-sm">
          <h2 className="font-semibold mb-2">Monthly challenges</h2>
          <p className="text-sm text-gray-600 mb-4">Toggle recurring savings and see your monthly total.</p>

          <ul className="grid gap-3 text-sm" role="list">
            <li className="flex items-center justify-between">
              <div>
                <div className="font-medium">Quit Netflix month</div>
                <div className="text-xs text-gray-600">“Trade 2 hours of streaming for a stronger future.”</div>
              </div>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={monthly.netflix} onChange={() => toggleMonthly("netflix")} />
                <span>29 PLN</span>
              </label>
            </li>
            <li className="flex items-center justify-between">
              <div>
                <div className="font-medium">Skip daily coffee</div>
                <div className="text-xs text-gray-600">“Brew at home, boost your pension.”</div>
              </div>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={monthly.coffee} onChange={() => toggleMonthly("coffee")} />
                <span>120 PLN</span>
              </label>
            </li>
            <li className="flex items-center justify-between">
              <div>
                <div className="font-medium">No smoking budget</div>
                <div className="text-xs text-gray-600">“Quit a pack, fund your future.”</div>
              </div>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={monthly.smoking} onChange={() => toggleMonthly("smoking")} />
                <span>500 PLN</span>
              </label>
            </li>
            <li className="flex items-center justify-between">
              <div>
                <div className="font-medium">Custom recurring saving</div>
                <div className="text-xs text-gray-600">“Name it, save it.”</div>
              </div>
              <div className="flex items-center gap-2">
                <VisuallyHidden>Custom monthly amount</VisuallyHidden>
                <input type="number" min={0} placeholder="0" value={Number(monthly.custom) || 0} onChange={(e) => updateCustom(Number(e.target.value) || 0)} className={`w-24 p-2 border rounded ${focusRing}`} />
                <span>PLN</span>
              </div>
            </li>
          </ul>

          <div className="mt-4 text-sm">Monthly total: <strong>{PLN(monthlySum)}</strong></div>
          <p className="text-xs text-gray-600">Tip: Redirect this to IKE/IKZE or an additional savings account.</p>
        </motion.div>
      </section>
    </div>
  );
}
