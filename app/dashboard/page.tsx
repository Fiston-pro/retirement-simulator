"use client";

import React, { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts";

// Helpers
const PLN = (n: number) =>
  `${new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(n)))} PLN`;

// Types
type SalaryRow = { year: number; monthly: number };
type SickPeriod = { year: number; days: number };

export default function DashboardPage() {
  const q = useSearchParams();
  const age = Number(q.get("age") ?? 30);
  const sex = (q.get("sex") ?? "male") as "male" | "female";
  const baseSalary = Number(q.get("salary") ?? 6000);
  const startYear = Number(q.get("startYear") ?? 2015);
  const endYear = Number(q.get("endYear") ?? new Date().getFullYear() + 30);
  const includeSickLeaveDefault = q.get("includeSickLeave") === "1";
  const funds = q.get("funds") ? Number(q.get("funds")) : 0;

  // UI State
  const [annualRaise, setAnnualRaise] = useState(3.5); // % per year wage growth
  const [indexation, setIndexation] = useState(3.0); // % per year fund indexation
  const [withSickLeave, setWithSickLeave] = useState(includeSickLeaveDefault);

  // Seed salary table (2 rows: first & current year)
  const currentYear = new Date().getFullYear();
  const seed: SalaryRow[] = [
    { year: startYear, monthly: Math.round(baseSalary * 0.65) },
    { year: Math.min(currentYear, endYear - 1), monthly: baseSalary },
  ];
  const [salaryRows, setSalaryRows] = useState<SalaryRow[]>(seed);

  const [sickAvgDays, setSickAvgDays] = useState(sex === "male" ? 12 : 18);
  const [sickCustom, setSickCustom] = useState<SickPeriod[]>([]);

  // Derived years list
  const years = useMemo(() => Array.from({ length: Math.max(1, endYear - startYear) }, (_, i) => startYear + i), [startYear, endYear]);

  // Build a full salary series from sparse rows using piecewise linear + annualRaise future projection
  const salaryMap = useMemo(() => {
    const byYear: Record<number, number> = {};
    const sorted = [...salaryRows].sort((a, b) => a.year - b.year);
    // Fill explicit years
    sorted.forEach((r) => (byYear[r.year] = r.monthly));

    // Interpolate between known points
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      const span = b.year - a.year;
      for (let y = 1; y < span; y++) {
        const yr = a.year + y;
        const t = y / span;
        byYear[yr] = a.monthly + t * (b.monthly - a.monthly);
      }
    }

    // Extend into the future using annualRaise
    const last = sorted[sorted.length - 1];
    for (let y = last.year + 1; y <= endYear; y++) {
      const prev = byYear[y - 1] ?? last.monthly;
      byYear[y] = prev * (1 + annualRaise / 100);
    }

    // Backfill before first row if needed
    const first = sorted[0];
    for (let y = first.year - 1; y >= startYear; y--) {
      const next = byYear[y + 1] ?? first.monthly;
      byYear[y] = next / (1 + annualRaise / 100);
    }

    return byYear;
  }, [salaryRows, startYear, endYear, annualRaise]);

  // Sick leave impact per year
  const sickDaysMap = useMemo(() => {
    const m: Record<number, number> = {};
    years.forEach((yr) => (m[yr] = withSickLeave ? sickAvgDays : 0));
    sickCustom.forEach((p) => (m[p.year] = (m[p.year] ?? 0) + p.days));
    return m; // days per year
  }, [years, withSickLeave, sickAvgDays, sickCustom]);

  // Contributions & accumulation
  const { series, totalContrib, finalFundNoSick, finalFundWithSick } = useMemo(() => {
    // Pension contribution ~19.52% of gross (simplified)
    const contributionRate = 0.1952;

    let balanceNoSick = funds; // starting funds
    let balanceWithSick = funds;
    const idx = 1 + indexation / 100; // annual indexation

    const s: Array<{ year: number; salary: number; contrib: number; contribAdj: number; fund: number; fundAdj: number }>
      = [];

    years.forEach((yr) => {
      const monthly = salaryMap[yr] ?? baseSalary;
      const annualSalary = monthly * 12;
      const baseContrib = annualSalary * contributionRate;

      const days = sickDaysMap[yr] ?? 0; // out of 365
      const sickFactor = Math.max(0, 1 - days / 365); // reduce contributions proportionally
      const contribAdj = baseContrib * sickFactor;

      // Grow last year's fund by indexation, then add contributions
      balanceNoSick = balanceNoSick * idx + baseContrib;
      balanceWithSick = balanceWithSick * idx + contribAdj;

      s.push({
        year: yr,
        salary: monthly,
        contrib: baseContrib,
        contribAdj,
        fund: balanceNoSick,
        fundAdj: balanceWithSick,
      });
    });

    const totalContrib = s.reduce((acc, r) => acc + r.contrib, 0);

    return { series: s, totalContrib, finalFundNoSick: balanceNoSick, finalFundWithSick: balanceWithSick };
  }, [years, salaryMap, funds, indexation, sickDaysMap, baseSalary]);

  const summaryCards = [
    { label: "Years simulated", value: years.length },
    { label: "Final fund (no sick leave)", value: PLN(finalFundNoSick) },
    { label: "Final fund (with sick leave)", value: PLN(finalFundWithSick) },
  ];

  return (
    <div className="min-h-screen bg-[#F3F6FA] text-[#001B2E]">
      <section className="max-w-7xl mx-auto px-6 pt-8">
        <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-semibold text-[#00416E]">
          Pension Simulator Dashboard
        </motion.h1>
        <p className="text-sm text-gray-600 mt-1">
          Adjust salaries, growth, indexation, and sick-leave to explore how your accumulated ZUS funds could evolve.
        </p>
      </section>

      {/* Controls */}
      <section className="max-w-7xl mx-auto px-6 py-6 grid gap-6 md:grid-cols-[1.3fr_1fr]">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-6 shadow-sm">
          <h2 className="font-semibold mb-4">Salary history & projections</h2>

          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center text-sm font-medium text-gray-600 mb-2">
            <div>Year</div>
            <div>Monthly salary (PLN)</div>
            <div></div>
          </div>

          {salaryRows
            .sort((a, b) => a.year - b.year)
            .map((row, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center mb-2">
                <input
                  type="number"
                  value={row.year}
                  min={startYear}
                  max={endYear}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setSalaryRows((r) => r.map((x, i) => (i === idx ? { ...x, year: v } : x)));
                  }}
                  className="p-2 border rounded"
                />
                <input
                  type="number"
                  value={Math.round(row.monthly)}
                  min={1000}
                  step={50}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setSalaryRows((r) => r.map((x, i) => (i === idx ? { ...x, monthly: v } : x)));
                  }}
                  className="p-2 border rounded"
                />
                <div className="flex gap-2">
                  <button
                    className="px-3 py-2 text-xs rounded border"
                    onClick={() => setSalaryRows((r) => r.filter((_, i) => i !== idx))}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

          <div className="mt-2 flex gap-2">
            <button
              className="px-3 py-2 rounded bg-[#00993F] text-white text-sm"
              onClick={() => setSalaryRows((r) => [...r, { year: Math.min(endYear - 1, startYear + r.length), monthly: baseSalary }])}
            >
              + Add row
            </button>
            <button
              className="px-3 py-2 rounded border text-sm"
              onClick={() => setSalaryRows(seed)}
            >
              Reset
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-6">
            <div>
              <label className="block text-sm font-medium">Annual raise (salary) %</label>
              <input
                type="number"
                value={annualRaise}
                step={0.1}
                onChange={(e) => setAnnualRaise(Number(e.target.value))}
                className="mt-1 w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Fund indexation % / year</label>
              <input
                type="number"
                value={indexation}
                step={0.1}
                onChange={(e) => setIndexation(Number(e.target.value))}
                className="mt-1 w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Starting funds (PLN)</label>
              <input
                type="number"
                defaultValue={funds}
                onBlur={(e) => {
                  // no-op visual; starting funds used directly from URL param for simplicity
                  // could lift to state if you want to adjust live
                }}
                className="mt-1 w-full p-2 border rounded"
              />
              <p className="text-xs text-gray-500 mt-1">(Currently seeded from query: {PLN(funds)})</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-6 shadow-sm">
          <h2 className="font-semibold mb-4">Sick leave</h2>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={withSickLeave} onChange={(e) => setWithSickLeave(e.target.checked)} />
            Include sick-leave impact on contributions
          </label>

          <div className="mt-3">
            <label className="block text-sm font-medium">Average sick days per year</label>
            <input
              type="number"
              min={0}
              max={60}
              value={sickAvgDays}
              onChange={(e) => setSickAvgDays(Number(e.target.value))}
              className="mt-1 w-full p-2 border rounded"
            />
            <p className="text-xs text-gray-500 mt-1">Typical: ~12 (men), ~18 (women)</p>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Custom sick-leave periods</h3>
              <button
                className="px-3 py-2 rounded border text-xs"
                onClick={() => setSickCustom((r) => [...r, { year: startYear, days: 10 }])}
              >
                + Add period
              </button>
            </div>

            {sickCustom.length === 0 && (
              <p className="text-sm text-gray-500">No custom periods added.</p>
            )}

            {sickCustom.map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center mb-2">
                <input
                  type="number"
                  value={p.year}
                  min={startYear}
                  max={endYear}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setSickCustom((r) => r.map((x, idx) => (idx === i ? { ...x, year: v } : x)));
                  }}
                  className="p-2 border rounded"
                />
                <input
                  type="number"
                  value={p.days}
                  min={0}
                  max={180}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setSickCustom((r) => r.map((x, idx) => (idx === i ? { ...x, days: v } : x)));
                  }}
                  className="p-2 border rounded"
                />
                <button
                  className="px-3 py-2 rounded border text-xs"
                  onClick={() => setSickCustom((r) => r.filter((_, idx) => idx !== i))}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Charts */}
      <section className="max-w-7xl mx-auto px-6 pb-8 grid gap-6 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-6 shadow-sm">
          <h3 className="font-semibold mb-2">Accumulated funds over time</h3>
          <p className="text-sm text-gray-600 mb-3">Modeled with {indexation}% yearly indexation. Contributions use 19.52% of annual salary.</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ left: 10, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gFundA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3F84D2" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#3F84D2" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gFundB" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00993F" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#00993F" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(val: any) => PLN(Number(val))} />
                <Area type="monotone" dataKey="fund" name="No sick leave" stroke="#3F84D2" fill="url(#gFundA)" strokeWidth={2} />
                <Area type="monotone" dataKey="fundAdj" name="With sick leave" stroke="#00993F" fill="url(#gFundB)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-6 shadow-sm">
          <h3 className="font-semibold mb-2">Annual contributions</h3>
          <p className="text-sm text-gray-600 mb-3">Comparison of base vs adjusted contributions due to sick days.</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ left: 10, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(val: any) => PLN(Number(val))} />
                <Bar dataKey="contrib" name="Base" radius={[6, 6, 0, 0]} fill="#3F84D2" />
                <Bar dataKey="contribAdj" name="Adjusted" radius={[6, 6, 0, 0]} fill="#FFB34F" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </section>

      {/* Summary */}
      <section className="max-w-7xl mx-auto px-6 pb-12">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-6 shadow-sm">
          <h3 className="font-semibold mb-4">Summary</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {summaryCards.map((c, i) => (
              <div key={i} className="p-4 rounded-2xl bg-[#F7F9FB]">
                <div className="text-xs text-gray-500">{c.label}</div>
                <div className="text-xl font-semibold mt-1">{typeof c.value === "number" ? c.value : c.value}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Educational model. Replace assumptions with official ZUS / GUS / NBP series for production. Start and end years refer to January.
          </p>
        </motion.div>
      </section>
    </div>
  );
}
