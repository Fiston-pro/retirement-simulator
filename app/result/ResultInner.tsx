"use client";

import React, { useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { logSimulation } from "@/lib/usage";

// ------------ Helpers ------------
const PLN = (n: number) =>
  `${new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 }).format(
    Math.max(0, Math.round(n))
  )} PLN`;

const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);

// Deterministic hash (no Math.random) to keep SSR/CSR in sync
const hashString = (s: string) => {
  let h = 0 >>> 0;
  for (let i = 0; i < s.length; i++) h = ((h * 31) ^ s.charCodeAt(i)) >>> 0;
  return h >>> 0;
};

export default function ResultInner() {
  const router = useRouter();
  const q = useSearchParams();

  // -------- Read query params --------
  const age = Number(q.get("age") ?? 30);
  const sex = (q.get("sex") ?? "male") as "male" | "female";
  const salary = Number(q.get("salary") ?? 6000); // monthly gross
  const startYear = Number(q.get("startYear") ?? 2015);
  const endYear = Number(q.get("endYear") ?? new Date().getFullYear() + 30);
  const includeSickLeave = q.get("includeSickLeave") === "1";
  const funds = q.get("funds") ? Number(q.get("funds")) : undefined;
  const desired = q.get("desired") ? Number(q.get("desired")) : undefined;

  const nowYear = new Date().getFullYear();

  // -------- Core calculations (realistic but simplified) --------
  const {
    yearsWorked,
    sickAdjPensionMonthly,
    inflationAdjustedMonthly,
    replacementRate,
    laterOptions,
    salarySeries,
    pensionSeries,
    avgPensionBenchmark,
    yearsToGoal,
  } = useMemo(() => {
    const yearsWorked = clamp(endYear - startYear, 0, 60);

    // Avg annual wage growth for visuals (3.5%)
    const annualWageGrowth = 0.035;

    // Sick leave adjustment (avg effect)
    const sickPenalty = includeSickLeave ? (sex === "male" ? 0.02 : 0.03) : 0; // 2% men, 3% women

    // Base pension formula (simplified): salary * 0.40 * (yearsWorked / 35)
    const basePensionMonthly = salary * 0.4 * (yearsWorked / 35);

    // Optional funds → monthly stream over ~20 years (240 months)
    const fundsMonthly = funds ? funds / 240 : 0;

    // Apply sick leave reduction to accumulation
    const sickAdjPensionMonthly = basePensionMonthly * (1 - sickPenalty) + fundsMonthly;

    // Inflation-adjust to today's PLN (assume 2.5% per year until retirement)
    const yearsUntilRetire = Math.max(0, endYear - nowYear);
    const inflation = 0.025;
    const inflationAdjustedMonthly =
      sickAdjPensionMonthly / Math.pow(1 + inflation, yearsUntilRetire);

    // Replacement rate vs last salary
    const replacementRate = sickAdjPensionMonthly / Math.max(1, salary);

    // Later retirement options: each extra year ~ +8%
    const laterOptions = [
      { label: "+1 year", value: sickAdjPensionMonthly * 1.08 },
      { label: "+2 years", value: sickAdjPensionMonthly * 1.16 },
      { label: "+5 years", value: sickAdjPensionMonthly * 1.4 },
    ];

    // Salary series over career for chart (deterministic variation via Math.sin)
    const years = Array.from({ length: Math.max(1, yearsWorked) }, (_, i) => startYear + i);
    const salarySeries = years.map((year, i) => {
      const growth = Math.pow(1 + annualWageGrowth, i);
      const noise = 1 + Math.sin(i * 0.7) * 0.03; // deterministic (no randomness)
      return {
        year,
        salary: salary * Math.max(0.6, Math.min(1.2, growth * noise)),
      };
    });

    // Pension series: 0 before retirement; jump at final year
    const pensionSeries = years.map((year, i) => ({
      year,
      pension: i < years.length - 1 ? 0 : sickAdjPensionMonthly,
    }));

    // Average pension benchmark (mock; replace with ZUS data when available)
    const avgPensionBenchmark = Math.max(2500, 0.45 * salary);

    // Years to reach desired goal (approx using +8%/year compounding on benefit)
    let yearsToGoal: number | undefined = undefined;
    if (desired && desired > 0 && sickAdjPensionMonthly > 0) {
      if (sickAdjPensionMonthly >= desired) {
        yearsToGoal = 0;
      } else {
        const neededFactor = desired / sickAdjPensionMonthly;
        const yearlyBoost = 1.08;
        yearsToGoal = Math.ceil(Math.log(neededFactor) / Math.log(yearlyBoost));
      }
    }

    return {
      yearsWorked,
      sickAdjPensionMonthly,
      inflationAdjustedMonthly,
      replacementRate,
      laterOptions,
      salarySeries,
      pensionSeries,
      avgPensionBenchmark,
      yearsToGoal,
    };
  }, [
    age,
    sex,
    salary,
    startYear,
    endYear,
    includeSickLeave,
    funds,
    desired,
    nowYear,
  ]);

  // -------- Facts (deterministic selection to avoid hydration mismatch) --------
  const facts = useMemo(
    () => [
      "Delaying retirement typically increases your monthly benefit by several percent per year.",
      "Including periods of illness can slightly reduce the final benefit due to lower contributions.",
      "Average pensions differ by region and career length.",
      "Indexation and inflation mean real purchasing power can differ from nominal amounts.",
    ],
    []
  );
  const factIndexSeed = `${age}-${sex}-${salary}-${startYear}-${endYear}-${includeSickLeave ? 1 : 0}`;
  const fact = facts[hashString(factIndexSeed) % facts.length];

  // -------- Logging with StrictMode-safe de-duplication --------
  // Build a deterministic key for this specific result run
  const logKey = [
    "result",
    age,
    sex,
    salary,
    startYear,
    endYear,
    includeSickLeave ? 1 : 0,
    funds ?? 0,
    desired ?? 0,
    Math.round(sickAdjPensionMonthly),
    Math.round(inflationAdjustedMonthly),
  ].join("|");

  useEffect(() => {
    try {
      // Prevent duplicate logs in React 18 Strict Mode (dev re-mount)
      const lastKey = sessionStorage.getItem("zus-last-log-key");
      if (lastKey === logKey) return;
      sessionStorage.setItem("zus-last-log-key", logKey);

      const now = new Date();
      logSimulation({
        date: now.toISOString().slice(0, 10),
        time: now.toTimeString().slice(0, 8),
        expected_pension: desired ?? null,
        age,
        sex,
        salary_amount: salary,
        sick_leave_included: includeSickLeave,
        funds_accumulated: funds ?? null,
        actual_pension: Math.round(sickAdjPensionMonthly),
        real_pension: Math.round(inflationAdjustedMonthly),
        postal_code: null,
      });
    } catch {
      // ignore
    }
  }, [
    logKey,
    desired,
    age,
    sex,
    salary,
    includeSickLeave,
    funds,
    sickAdjPensionMonthly,
    inflationAdjustedMonthly,
  ]);

  // -------- UI --------
  return (
    <div className="min-h-screen bg-[#F3F6FA] text-[#001B2E]">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-8">
        <button
          onClick={() => router.push("/forecast" + (desired ? `?desired=${desired}` : ""))}
          className="text-sm mb-4 underline"
        >
          ← Edit inputs
        </button>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-6 md:p-8 bg-gradient-to-br from-[#3F84D2] to-[#00993F] text-white shadow-md"
        >
          <h1 className="text-2xl md:text-3xl font-semibold">Your Future Pension Estimate</h1>
          <p className="mt-2 text-white/90">
            Based on your inputs ({age} yrs, {sex}, salary {PLN(salary)}) and a career from {startYear} to {endYear}.
          </p>

          <div className="grid md:grid-cols-3 gap-4 mt-6">
            <Card number={PLN(sickAdjPensionMonthly)} label="Estimated pension (nominal)" />
            <Card number={PLN(inflationAdjustedMonthly)} label="Real (inflation-adjusted)" />
            <Card number={`${Math.round(replacementRate * 100)}%`} label="Replacement rate" />
          </div>

          {desired && (
            <p className="mt-4 text-sm">
              Desired pension: <strong>{PLN(desired)}</strong> —{" "}
              {sickAdjPensionMonthly >= desired ? (
                <>you already meet your goal 🎉</>
              ) : yearsToGoal !== undefined ? (
                <>work approximately <strong>{yearsToGoal}</strong> more {yearsToGoal === 1 ? "year" : "years"} to reach it.</>
              ) : null}
            </p>
          )}
        </motion.div>
      </section>

      {/* Chart */}
      <section className="max-w-7xl mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Salary vs Pension Over Career</h2>
          <p className="text-sm text-gray-600 mb-4">
            Pension appears at retirement year; salaries shown as indexed progression.
          </p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={salarySeries.map((s, i) => ({
                  year: s.year,
                  salary: s.salary,
                  pension: pensionSeries[i]?.pension ?? 0,
                }))}
                margin={{ left: 10, right: 10, top: 10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gSalary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3F84D2" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#3F84D2" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gPension" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFB34F" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#FFB34F" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(val: any) => PLN(Number(val))} />
                <Area type="monotone" dataKey="salary" stroke="#3F84D2" fill="url(#gSalary)" strokeWidth={2} />
                <Area type="monotone" dataKey="pension" stroke="#FFB34F" fill="url(#gPension)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            Benchmark average pension today (mock): {PLN(avgPensionBenchmark)}.
          </div>
        </motion.div>
      </section>

      {/* Retire later */}
      <section className="max-w-7xl mx-auto px-6 pb-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">What if you retire later?</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[{ label: "Default", value: sickAdjPensionMonthly }, ...laterOptions]}
                margin={{ left: 10, right: 10, top: 10, bottom: 0 }}
              >
                <XAxis dataKey="label" />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(val: any) => PLN(Number(val))} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  <Cell key="c0" fill="#00993F" />
                  <Cell key="c1" fill="#3F84D2" />
                  <Cell key="c2" fill="#FFB34F" />
                  <Cell key="c3" fill="#F05E5E" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-sm text-gray-600">
            Each extra working year is modeled here as ~8% benefit increase (simplified).
          </p>
        </motion.div>
      </section>

      {/* Did you know + CTA */}
      <section className="max-w-7xl mx-auto px-6 pb-12 grid gap-6 md:grid-cols-[2fr_1fr]">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-6 shadow-sm">
          <h3 className="text-base font-semibold mb-2">Did you know?</h3>
          <p className="text-sm text-gray-700">{fact}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#00416E] rounded-3xl p-6 text-white flex items-center justify-between gap-4"
        >
          <div>
            <h3 className="text-lg font-semibold">Download your report</h3>
            <p className="text-sm text-white/80">Get a PDF with your inputs, charts, and recommendations.</p>
          </div>
          <button
            onClick={() => router.push("/report" + (desired ? `?desired=${desired}` : ""))}
            className="px-4 py-2 rounded-2xl bg-white text-[#00416E] font-medium hover:opacity-95"
          >
            Generate PDF
          </button>
        </motion.div>
      </section>

      <footer className="max-w-7xl mx-auto px-6 pb-8 text-xs text-gray-500">
        * Educational simulator. Replace mock assumptions with official ZUS / GUS / NBP data for production. Start and end years refer to January.
      </footer>
    </div>
  );
}

function Card({ number, label }: { number: string; label: string }) {
  return (
    <div className="bg-white/95 text-[#001B2E] rounded-2xl p-4 shadow-sm">
      <div className="text-2xl font-semibold">{number}</div>
      <div className="text-xs mt-1 text-gray-600">{label}</div>
    </div>
  );
}
