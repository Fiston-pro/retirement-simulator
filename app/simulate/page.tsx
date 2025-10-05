// app/simulate/page.tsx
"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { useUserCtx } from "@/lib/userCtx";
import { saveForecast, loginAnon, loginGoogle, logout } from "@/lib/firebase";
import { calcForecast, type ForecastInput } from "@/lib/pension";
import { focusRing } from "@/components/a11y/WCAGKit";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
} from "recharts";

export const dynamic = "force-dynamic";

const PLN = (n: number) =>
  `${new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 }).format(
    Math.max(0, Math.round(Number(n || 0)))
  )} PLN`;

export default function SimulatePage() {
  const { user, profile } = useUserCtx();
  const params = useSearchParams();

  // ---------- BASIC FORM ----------
  const [form, setForm] = React.useState<ForecastInput>({
    age: 30,
    sex: "male",
    salary: 6000,
    startYear: 2015,
    endYear: new Date().getFullYear() + 30,
    includeSickLeave: false,
    funds: undefined,
    desired: undefined,
  });

  // seed from profile + ?desired=
  const [seeded, setSeeded] = React.useState(false);
  React.useEffect(() => {
    if (seeded) return;
    const now = new Date().getFullYear();
    const birth = profile?.birthYear && profile.birthYear > 1900 ? profile.birthYear : undefined;
    const age = birth ? Math.max(18, Math.min(80, now - birth)) : undefined;
    const desiredQS = params?.get("desired");
    setForm((f) => ({
      ...f,
      age: age ?? f.age,
      salary: profile?.salary ?? f.salary,
      desired: desiredQS ? Number(desiredQS) : profile?.desired ?? f.desired,
    }));
    setSeeded(true);
  }, [profile?.birthYear, profile?.salary, profile?.desired, params, seeded]);

  const basic = React.useMemo(() => calcForecast(form), [form]);

  // simple visual salary path (for the basic chart)
  const visIndexation = 0.035;
  const yearsWorked = Math.max(1, Math.min(60, form.endYear - form.startYear));
  const years = Array.from({ length: yearsWorked }, (_, i) => form.startYear + i);
  const salarySeries = years.map((y, i) => ({
    year: y,
    salary:
      form.salary *
      Math.max(0.6, Math.min(2.0, Math.pow(1 + visIndexation, i) * (1 + Math.sin(i * 0.7) * 0.02))),
    pension: i < years.length - 1 ? 0 : basic.nominalMonthly,
  }));

  // ---------- ADVANCED DASHBOARD (exactly per 1.4) ----------
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [advInputs, setAdvInputs] = React.useState<AdvancedInputs>(() => ({
    age: form.age,
    sex: form.sex,
    startYear: form.startYear,
    endYear: form.endYear,
    baseSalary: form.salary,
    indexationRate: 0.035,         // user-editable
    startingFunds: form.funds ?? 0, // ZUS account+sub-account today
    historicalSalaries: [],         // [{year, gross}]
    futureOverrides: [],            // [{year, gross}]
    illness: [],                    // [{startYear, endYear, monthsPerYear}]
  }));

  // keep advInputs aligned when core years/sex change
  React.useEffect(() => {
    setAdvInputs((a) => ({
      ...a,
      age: form.age,
      sex: form.sex,
      startYear: form.startYear,
      endYear: form.endYear,
      baseSalary: form.salary,
      startingFunds: form.funds ?? 0,
    }));
  }, [form.age, form.sex, form.startYear, form.endYear, form.salary, form.funds]);

  const adv = React.useMemo(() => calcForecastAdvanced(advInputs), [advInputs]);

  // ---------- SAVE ----------
  const [saveMsg, setSaveMsg] = React.useState<string | null>(null);
  async function handleSave() {
    if (!user) return;
    const cleanForm = {
      ...form,
      funds: form.funds ?? null,
      desired: form.desired ?? null,
    };
    // Include the Advanced Dashboard scenario (inputs + snapshot outputs)
    await saveForecast(user.uid, {
      form: cleanForm,
      basicResult: basic,
      advanced: {
        inputs: sanitizeForSave(advInputs),
        outputs: sanitizeForSave(adv),
      },
      createdAtISO: new Date().toISOString(), // client-side stamp (we also set serverTimestamp in helper)
    });
    setSaveMsg("Saved to cloud ✅");
    setTimeout(() => setSaveMsg(null), 1800);
  }

  // placeholders from profile
  const ph = {
    age:
      profile?.birthYear && profile.birthYear > 1900
        ? String(Math.max(18, Math.min(80, new Date().getFullYear() - profile.birthYear)))
        : "30",
    salary: profile?.salary ? String(profile.salary) : "6000",
    desired: profile?.desired ? String(profile.desired) : "4500",
  };

  return (
    <div className="grid gap-4 sm:gap-6">
      {/* Header */}
      <section
        className="rounded-3xl p-4 sm:p-5 text-white shadow-sm"
        style={{ background: "linear-gradient(135deg,#00416E,#3F84D2)" }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">Pension simulator</h1>
            <p className="text-white/90 text-sm sm:text-base">
              Set your goal and explore basic vs. advanced scenarios.
            </p>
          </div>
          <div className="flex gap-2">
            {!user ? (
              <>
                <button onClick={loginAnon} className={`px-3 py-2 rounded-2xl bg-white/20 text-white text-sm ${focusRing}`}>
                  Continue as guest
                </button>
                <button onClick={loginGoogle} className={`px-3 py-2 rounded-2xl bg-white text-[#00416E] text-sm font-medium ${focusRing}`}>
                  Sign in with Google
                </button>
              </>
            ) : (
              <button onClick={logout} className={`px-3 py-2 rounded-2xl bg-white text-[#00416E] text-sm font-medium ${focusRing}`}>
                Log out
              </button>
            )}
          </div>
        </div>
        {seeded && (
          <div className="mt-3 text-xs sm:text-sm bg-white/15 inline-block px-2 py-1 rounded">
            Using your profile as defaults — you can edit anything.
          </div>
        )}
      </section>

      {/* BASIC: inputs + results */}
      <section className="grid gap-4 md:grid-cols-2">
        {/* Inputs */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Basic inputs</h2>
          <p className="text-sm text-gray-600">All years refer to January.</p>

          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            <Field label="Age">
              <input
                type="number"
                min={18}
                max={80}
                className={`p-2 border rounded ${focusRing}`}
                value={form.age}
                placeholder={ph.age}
                onChange={(e) => setForm((f) => ({ ...f, age: Number(e.target.value) || 0 }))}
              />
            </Field>
            <Field label="Sex">
              <select
                className={`p-2 border rounded ${focusRing}`}
                value={form.sex}
                onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value as any }))}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </Field>
            <Field label="Gross salary (PLN/month)">
              <input
                type="number"
                min={0}
                className={`p-2 border rounded ${focusRing}`}
                value={form.salary}
                placeholder={ph.salary}
                onChange={(e) => setForm((f) => ({ ...f, salary: Number(e.target.value) || 0 }))}
              />
            </Field>
            <Field label="Start year">
              <input
                type="number"
                className={`p-2 border rounded ${focusRing}`}
                value={form.startYear}
                onChange={(e) => setForm((f) => ({ ...f, startYear: Number(e.target.value) || f.startYear }))}
              />
            </Field>
            <Field label="End year (retirement)">
              <input
                type="number"
                className={`p-2 border rounded ${focusRing}`}
                value={form.endYear}
                onChange={(e) => setForm((f) => ({ ...f, endYear: Number(e.target.value) || f.endYear }))}
              />
            </Field>
            <Field label="Desired pension (optional, PLN)">
              <input
                type="number"
                min={0}
                className={`p-2 border rounded ${focusRing}`}
                value={form.desired ?? ""}
                placeholder={ph.desired}
                onChange={(e) => setForm((f) => ({ ...f, desired: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </Field>
          </div>
        </div>

        {/* Results */}
        <div
          className="rounded-3xl p-4 sm:p-6 text-white shadow-sm"
          style={{ background: "linear-gradient(135deg,#3F84D2,#00993F)" }}
        >
          <h2 className="text-lg font-semibold">Basic results</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            <Stat number={PLN(basic.nominalMonthly)} label="Estimated (nominal)" />
            <Stat number={PLN(basic.realMonthly)} label="Real (inflation-adjusted)" />
            <Stat number={`${Math.round(basic.replacementRate * 100)}%`} label="Replacement rate" />
          </div>

          <div className="h-56 sm:h-72 mt-4 bg-white/10 rounded-xl p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salarySeries}>
                <defs>
                  <linearGradient id="gSalary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity={0.2} />
                  </linearGradient>
                  <linearGradient id="gPension" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFB34F" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#FFB34F" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#ffffff33" />
                <XAxis dataKey="year" stroke="#fff" tick={{ fill: "#fff", fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} stroke="#fff" tick={{ fill: "#fff", fontSize: 12 }} />
                <Tooltip formatter={(val: any, name: any) => name === "salary" ? [PLN(val), "Salary (PLN)"] : [PLN(val), "Pension (PLN)"]} />
                <Area type="monotone" dataKey="salary" stroke="#fff" fill="url(#gSalary)" strokeWidth={2} />
                <Area type="monotone" dataKey="pension" stroke="#FFB34F" fill="url(#gPension)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {form.desired != null && (
            <p className="mt-3 text-xs sm:text-sm">
              Desired: <strong>{PLN(form.desired)}</strong> —{" "}
              {basic.yearsToGoal === 0
                ? "goal met 🎉"
                : basic.yearsToGoal
                ? `work ~${basic.yearsToGoal} more ${basic.yearsToGoal === 1 ? "year" : "years"}`
                : ""}
            </p>
          )}

          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <a
              href={`/report?age=${form.age}&sex=${form.sex}&salary=${form.salary}&startYear=${form.startYear}&endYear=${form.endYear}${
                form.includeSickLeave ? "&includeSickLeave=1" : ""
              }${form.funds ? `&funds=${form.funds}` : ""}${form.desired ? `&desired=${form.desired}` : ""}`}
              className={`px-4 py-2 rounded-2xl bg-white text-[#00416E] font-medium ${focusRing}`}
            >
              Download PDF
            </a>
            <button
              onClick={handleSave}
              disabled={!user}
              className={`px-4 py-2 rounded-2xl border border-white/80 ${focusRing} disabled:opacity-50`}
              aria-disabled={!user}
              title={user ? "Save to your cloud profile" : "Sign in to save"}
            >
              {user ? "Save to cloud" : "Sign in to save"}
            </button>
          </div>
          {saveMsg && <div className="mt-2 text-xs bg-white/20 inline-block px-2 py-1 rounded">{saveMsg}</div>}
        </div>
      </section>

      {/* ADVANCED DASHBOARD — EXACT 1.4 */}
      <section className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Advanced dashboard (what-if)</h2>
            <p className="text-sm text-gray-600">
              Historical & future salaries, custom indexation, illness periods, and accumulated funds.
            </p>
          </div>
          <button
            className={`px-4 py-2 rounded-2xl border ${focusRing}`}
            onClick={() => setShowAdvanced((s) => !s)}
            aria-expanded={showAdvanced}
          >
            {showAdvanced ? "Hide" : "Show"} dashboard
          </button>
        </div>

        {showAdvanced && (
          <div className="mt-4">
            <AdvancedDashboard inputs={advInputs} onChange={setAdvInputs} outputs={adv} />
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------- UI bits ---------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div className="bg-white/95 text-[#001B2E] rounded-2xl p-3 sm:p-4">
      <div className="text-xl sm:text-2xl font-semibold">{number}</div>
      <div className="text-[11px] sm:text-xs mt-1 text-black/90">{label}</div>
    </div>
  );
}

/* ---------- Advanced types + calc (self-contained) ---------- */

type SalaryPoint = { year: number; gross: number };           // PLN/month
type IllnessPeriod = { startYear: number; endYear: number; monthsPerYear?: number };

type AdvancedInputs = {
  age: number;
  sex: "male" | "female";
  startYear: number;
  endYear: number;
  baseSalary: number;
  indexationRate: number;         // e.g., 0.035 = 3.5%
  historicalSalaries: SalaryPoint[];
  futureOverrides: SalaryPoint[];
  illness: IllnessPeriod[];       // months per year impact
  startingFunds?: number;         // ZUS account+sub-account today
};

type AdvancedOutputs = {
  yearly: Array<{ year: number; salary: number; contributionBase: number; accountBalance: number }>;
  nominalMonthly: number;
  realMonthly: number;
  replacementRate: number;
};

function calcForecastAdvanced(input: AdvancedInputs): AdvancedOutputs {
  const {
    startYear, endYear, baseSalary, indexationRate,
    historicalSalaries, futureOverrides, illness, startingFunds = 0,
  } = input;

  const years: number[] = [];
  for (let y = startYear; y <= endYear; y++) years.push(y);

  const histMap = new Map(historicalSalaries.map(s => [s.year, s.gross]));
  const futMap  = new Map(futureOverrides.map(s => [s.year, s.gross]));

  const illMonths = new Map<number, number>();
  for (const p of illness) {
    for (let y = Math.min(p.startYear, p.endYear); y <= Math.max(p.startYear, p.endYear); y++) {
      illMonths.set(y, (illMonths.get(y) || 0) + (p.monthsPerYear ?? 0));
    }
  }

  const path: number[] = [];
  for (let i = 0; i < years.length; i++) {
    const y = years[i];
    let s = histMap.get(y);
    if (s == null) s = futMap.get(y);
    if (s == null) s = i === 0 ? baseSalary : Math.max(0, path[i - 1] * (1 + indexationRate));
    path.push(s!);
  }

  const adjSalary: number[] = path.map((s, i) => {
    const y = years[i];
    const months = Math.max(0, Math.min(12, illMonths.get(y) || 0));
    return s * ((12 - months) / 12);
  });

  const contribRate = 0.1952; // combined pension pillar (educational proxy)
  let balance = startingFunds;
  const yearly = years.map((y, i) => {
    const salary = adjSalary[i];
    const annualContrib = salary * 12 * contribRate;
    balance = (balance * (1 + indexationRate)) + annualContrib;
    return { year: y, salary, contributionBase: salary, accountBalance: balance };
  });

  const lifeYears = 20; // educational divisor
  const nominalMonthly = balance / (lifeYears * 12);
  const realMonthly = nominalMonthly / Math.pow(1 + 0.025, 10); // rough 10y @2.5% inflation
  const lastSalary = adjSalary.at(-1) || baseSalary;
  const replacementRate = lastSalary > 0 ? nominalMonthly / lastSalary : 0;

  return { yearly, nominalMonthly, realMonthly, replacementRate };
}

/* ---------- Advanced Dashboard component (1.4 exact) ---------- */

function AdvancedDashboard({
  inputs,
  outputs,
  onChange,
}: {
  inputs: AdvancedInputs;
  outputs: AdvancedOutputs;
  onChange: (v: AdvancedInputs) => void;
}) {
  const set = (patch: Partial<AdvancedInputs>) => onChange({ ...inputs, ...patch });

  const addHist = () =>
    set({ historicalSalaries: [...inputs.historicalSalaries, { year: inputs.startYear, gross: inputs.baseSalary }] });
  const addFut = () =>
    set({ futureOverrides: [...inputs.futureOverrides, { year: inputs.endYear, gross: inputs.baseSalary }] });
  const addIll = () =>
    set({ illness: [...inputs.illness, { startYear: inputs.startYear, endYear: inputs.startYear, monthsPerYear: 1 }] });

  const updHist = (i: number, key: keyof SalaryPoint, val: number) => {
    const arr = inputs.historicalSalaries.slice();
    arr[i] = { ...arr[i], [key]: val };
    set({ historicalSalaries: arr });
  };
  const delHist = (i: number) =>
    set({ historicalSalaries: inputs.historicalSalaries.filter((_, idx) => idx !== i) });

  const updFut = (i: number, key: keyof SalaryPoint, val: number) => {
    const arr = inputs.futureOverrides.slice();
    arr[i] = { ...arr[i], [key]: val };
    set({ futureOverrides: arr });
  };
  const delFut = (i: number) =>
    set({ futureOverrides: inputs.futureOverrides.filter((_, idx) => idx !== i) });

  const updIll = (i: number, key: keyof IllnessPeriod, val: number) => {
    const arr = inputs.illness.slice();
    arr[i] = { ...arr[i], [key]: val };
    set({ illness: arr });
  };
  const delIll = (i: number) => set({ illness: inputs.illness.filter((_, idx) => idx !== i) });

  return (
    <div className="grid gap-4">
      {/* Controls */}
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Indexation (avg wage growth)">
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.001"
              min={0}
              className={`p-2 border rounded ${focusRing} w-full`}
              value={inputs.indexationRate}
              onChange={(e) => set({ indexationRate: Number(e.target.value) || 0 })}
            />
            <span className="text-xs text-gray-600">e.g., 0.035 = 3.5%</span>
          </div>
        </Field>
        <Field label="Starting funds (PLN)">
          <input
            type="number"
            min={0}
            className={`p-2 border rounded ${focusRing} w-full`}
            value={inputs.startingFunds ?? 0}
            onChange={(e) => set({ startingFunds: Number(e.target.value) || 0 })}
          />
        </Field>
        <div className="self-end text-xs text-gray-600">
          Changes apply instantly to charts & advanced result.
        </div>
      </div>

      {/* Historical salaries */}
      <section className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Historical salaries (specific years)</h3>
          <button onClick={addHist} className={`px-3 py-1.5 rounded-2xl bg-[#3F84D2] text-white ${focusRing}`}>Add</button>
        </div>
        <SalaryTable
          rows={inputs.historicalSalaries}
          onChange={updHist}
          onRemove={delHist}
        />
      </section>

      {/* Future overrides */}
      <section className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Future salaries (overrides)</h3>
          <button onClick={addFut} className={`px-3 py-1.5 rounded-2xl bg-[#00993F] text-white ${focusRing}`}>Add</button>
        </div>
        <SalaryTable
          rows={inputs.futureOverrides}
          onChange={updFut}
          onRemove={delFut}
        />
      </section>

      {/* Illness periods */}
      <section className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Illness periods (months per year)</h3>
          <button onClick={addIll} className={`px-3 py-1.5 rounded-2xl bg-[#FFB34F] text-[#001B2E] ${focusRing}`}>Add</button>
        </div>
        <IllnessTable rows={inputs.illness} onChange={updIll} onRemove={delIll} />
      </section>

      {/* Charts + Advanced result */}
      <section
        className="rounded-2xl p-3 sm:p-4 text-white"
        style={{ background: "linear-gradient(135deg,#00416E,#3F84D2)" }}
      >
        <h3 className="font-medium">Accumulated funds & salary path</h3>
        <div className="grid gap-4 md:grid-cols-2 mt-3">
          <div className="h-56 sm:h-72 bg-white/10 rounded-xl p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={outputs.yearly}>
                <defs>
                  <linearGradient id="gBal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#ffffff33" />
                <XAxis dataKey="year" stroke="#fff" tick={{ fill: "#fff", fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} stroke="#fff" tick={{ fill: "#fff", fontSize: 12 }} />
                <Tooltip formatter={(v: any) => PLN(v)} />
                <Area type="monotone" dataKey="accountBalance" stroke="#fff" fill="url(#gBal)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="h-56 sm:h-72 bg-white/10 rounded-xl p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={outputs.yearly}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#ffffff33" />
                <XAxis dataKey="year" stroke="#fff" tick={{ fill: "#fff", fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${Math.round(Number(v))}`} stroke="#fff" tick={{ fill: "#fff", fontSize: 12 }} />
                <Tooltip formatter={(v: any) => PLN(v)} />
                <Line type="monotone" dataKey="salary" stroke="#FFB34F" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          <Stat number={PLN(outputs.nominalMonthly)} label="Advanced (nominal)" />
          <Stat number={PLN(outputs.realMonthly)} label="Advanced (real)" />
          <Stat number={`${Math.round(outputs.replacementRate * 100)}%`} label="Advanced replacement" />
        </div>
      </section>
    </div>
  );
}

/* ---------- Advanced tables ---------- */

function SalaryTable({
  rows,
  onChange,
  onRemove,
}: {
  rows: SalaryPoint[];
  onChange: (i: number, key: keyof SalaryPoint, val: number) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="mt-2 overflow-auto">
      <table className="min-w-[520px] text-sm">
        <thead>
          <tr className="text-left text-gray-600">
            <th className="py-2 pr-4 w-24">Year</th>
            <th className="py-2 pr-4 w-32">Gross PLN / month</th>
            <th className="py-2 pr-4"></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={3} className="py-6 text-center text-gray-500">No rows</td></tr>
          ) : rows.map((r, i) => (
            <tr key={i} className="border-t">
              <td className="py-2 pr-4">
                <input type="number" className={`p-2 border rounded ${focusRing} w-24`} value={r.year}
                  onChange={(e) => onChange(i, "year", Number(e.target.value) || 0)} />
              </td>
              <td className="py-2 pr-4">
                <input type="number" className={`p-2 border rounded ${focusRing} w-32`} min={0} value={r.gross}
                  onChange={(e) => onChange(i, "gross", Number(e.target.value) || 0)} />
              </td>
              <td className="py-2 pr-4">
                <button onClick={() => onRemove(i)} className={`px-2 py-1 rounded bg-red-50 text-red-700 ${focusRing}`}>Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IllnessTable({
  rows,
  onChange,
  onRemove,
}: {
  rows: IllnessPeriod[];
  onChange: (i: number, key: keyof IllnessPeriod, val: number) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="mt-2 overflow-auto">
      <table className="min-w-[580px] text-sm">
        <thead>
          <tr className="text-left text-gray-600">
            <th className="py-2 pr-4 w-24">Start year</th>
            <th className="py-2 pr-4 w-24">End year</th>
            <th className="py-2 pr-4 w-40">Months per year</th>
            <th className="py-2 pr-4"></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={4} className="py-6 text-center text-gray-500">No periods</td></tr>
          ) : rows.map((r, i) => (
            <tr key={i} className="border-t">
              <td className="py-2 pr-4">
                <input type="number" className={`p-2 border rounded ${focusRing} w-24`} value={r.startYear}
                  onChange={(e) => onChange(i, "startYear", Number(e.target.value) || 0)} />
              </td>
              <td className="py-2 pr-4">
                <input type="number" className={`p-2 border rounded ${focusRing} w-24`} value={r.endYear}
                  onChange={(e) => onChange(i, "endYear", Number(e.target.value) || 0)} />
              </td>
              <td className="py-2 pr-4">
                <input type="number" min={0} max={12} className={`p-2 border rounded ${focusRing} w-24`} value={r.monthsPerYear ?? 0}
                  onChange={(e) => onChange(i, "monthsPerYear", Number(e.target.value) || 0)} />
              </td>
              <td className="py-2 pr-4">
                <button onClick={() => onRemove(i)} className={`px-2 py-1 rounded bg-red-50 text-red-700 ${focusRing}`}>Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Helpers ---------- */

function sanitizeForSave<T>(obj: T): T {
  // shallowly remove undefined values so Firestore accepts it; do NOT touch nested sentinels
  if (!obj || typeof obj !== "object") return obj;
  const out: any = {};
  for (const [k, v] of Object.entries(obj as any)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}
