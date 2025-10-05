// components/sim/AdvancedDashboard.tsx
"use client";

import React from "react";
import { focusRing } from "@/components/a11y/WCAGKit";
import { calcForecastAdvanced, type AdvancedInputs, type SalaryPoint, type IllnessPeriod } from "@/lib/pension-advanced";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, LineChart, Line } from "recharts";

const PLN = (n: number) =>
  `${new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 }).format(Math.round(n))} PLN`;

export default function AdvancedDashboard({
  seed,
  onComputed,
}: {
  seed: AdvancedInputs;
  onComputed?: (out: ReturnType<typeof calcForecastAdvanced>) => void;
}) {
  const [form, setForm] = React.useState<AdvancedInputs>(seed);

  // Derived results
  const out = React.useMemo(() => calcForecastAdvanced(form), [form]);
  React.useEffect(() => { onComputed?.(out); }, [out, onComputed]);

  // Manage lists
  function addHist() {
    setForm(f => ({ ...f, historicalSalaries: [...f.historicalSalaries, { year: f.startYear, gross: f.baseSalary }] }));
  }
  function addFuture() {
    setForm(f => ({ ...f, futureOverrides: [...f.futureOverrides, { year: f.endYear, gross: f.baseSalary }] }));
  }
  function addIllness() {
    setForm(f => ({ ...f, illness: [...f.illness, { startYear: f.startYear, endYear: f.startYear, monthsPerYear: 1 }] }));
  }
  function updateHist(i: number, key: keyof SalaryPoint, val: number) {
    setForm(f => {
      const arr = f.historicalSalaries.slice();
      arr[i] = { ...arr[i], [key]: val };
      return { ...f, historicalSalaries: arr };
    });
  }
  function removeHist(i: number) {
    setForm(f => ({ ...f, historicalSalaries: f.historicalSalaries.filter((_, idx) => idx !== i) }));
  }
  function updateFut(i: number, key: keyof SalaryPoint, val: number) {
    setForm(f => {
      const arr = f.futureOverrides.slice();
      arr[i] = { ...arr[i], [key]: val };
      return { ...f, futureOverrides: arr };
    });
  }
  function removeFut(i: number) {
    setForm(f => ({ ...f, futureOverrides: f.futureOverrides.filter((_, idx) => idx !== i) }));
  }
  function updateIll(i: number, key: keyof IllnessPeriod, val: number) {
    setForm(f => {
      const arr = f.illness.slice();
      arr[i] = { ...arr[i], [key]: val };
      return { ...f, illness: arr };
    });
  }
  function removeIll(i: number) {
    setForm(f => ({ ...f, illness: f.illness.filter((_, idx) => idx !== i) }));
  }

  return (
    <div className="grid gap-4">
      {/* Controls */}
      <section className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Advanced controls</h3>
        <p className="text-sm text-gray-600">Tune indexation, historical/future salaries, and illness periods.</p>

        <div className="grid sm:grid-cols-3 gap-3 mt-3">
          <Field label="Indexation (avg wage growth)">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step="0.001"
                className={`p-2 border rounded ${focusRing} w-full`}
                value={form.indexationRate}
                onChange={(e) => setForm(f => ({ ...f, indexationRate: Number(e.target.value) || 0 }))}
              />
              <span className="text-sm text-gray-600">e.g., 0.035 = 3.5%</span>
            </div>
          </Field>
          <Field label="Base salary (fallback, PLN)">
            <input
              type="number" min={0}
              className={`p-2 border rounded ${focusRing} w-full`}
              value={form.baseSalary}
              onChange={(e) => setForm(f => ({ ...f, baseSalary: Number(e.target.value) || 0 }))}
            />
          </Field>
          <Field label="Starting funds (PLN, optional)">
            <input
              type="number" min={0}
              className={`p-2 border rounded ${focusRing} w-full`}
              value={form.startingFunds ?? 0}
              onChange={(e) => setForm(f => ({ ...f, startingFunds: Number(e.target.value) || 0 }))}
            />
          </Field>
        </div>

        {/* Historical salaries */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Historical salaries</h4>
            <button onClick={addHist} className={`px-3 py-1.5 rounded-2xl bg-[#3F84D2] text-white ${focusRing}`}>Add</button>
          </div>
          <ListTable
            rows={form.historicalSalaries}
            columns={[
              { key: "year", label: "Year", width: "w-24" },
              { key: "gross", label: "Gross PLN / m", width: "w-32" },
            ]}
            onChange={(i, key, v) => updateHist(i, key as any, v)}
            onRemove={removeHist}
          />
        </div>

        {/* Future overrides */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Future salary overrides</h4>
            <button onClick={addFuture} className={`px-3 py-1.5 rounded-2xl bg-[#00993F] text-white ${focusRing}`}>Add</button>
          </div>
          <ListTable
            rows={form.futureOverrides}
            columns={[
              { key: "year", label: "Year", width: "w-24" },
              { key: "gross", label: "Gross PLN / m", width: "w-32" },
            ]}
            onChange={(i, key, v) => updateFut(i, key as any, v)}
            onRemove={removeFut}
          />
        </div>

        {/* Illness periods */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Illness periods (months per year)</h4>
            <button onClick={addIllness} className={`px-3 py-1.5 rounded-2xl bg-[#FFB34F] text-[#001B2E] ${focusRing}`}>Add</button>
          </div>
          <IllnessTable
            rows={form.illness}
            onChange={updateIll}
            onRemove={removeIll}
          />
        </div>
      </section>

      {/* Charts */}
      <section className="rounded-3xl p-4 sm:p-6 text-white" style={{ background: "linear-gradient(135deg,#00416E,#3F84D2)" }}>
        <h3 className="text-lg font-semibold">Accumulation & salary path</h3>
        <div className="grid gap-4 md:grid-cols-2 mt-3">
          <div className="h-64 sm:h-72 bg-white/10 rounded-xl p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={out.yearly}>
                <defs>
                  <linearGradient id="gBal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#ffffff33" />
                <XAxis dataKey="year" stroke="#fff" tick={{ fill: "#fff", fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${Math.round(v/1000)}k`} stroke="#fff" tick={{ fill: "#fff", fontSize: 12 }} />
                <Tooltip formatter={(v: any) => PLN(Number(v))} />
                <Area type="monotone" dataKey="accountBalance" stroke="#fff" fill="url(#gBal)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="h-64 sm:h-72 bg-white/10 rounded-xl p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={out.yearly}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#ffffff33" />
                <XAxis dataKey="year" stroke="#fff" tick={{ fill: "#fff", fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${Math.round(v)}`} stroke="#fff" tick={{ fill: "#fff", fontSize: 12 }} />
                <Tooltip formatter={(v: any) => PLN(Number(v))} />
                <Line type="monotone" dataKey="salary" stroke="#FFB34F" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          <Card number={PLN(out.nominalMonthly)} label="Estimated (nominal)" />
          <Card number={PLN(out.realMonthly)} label="Real (inflation-adjusted)" />
          <Card number={`${Math.round(out.replacementRate * 100)}%`} label="Replacement rate" />
        </div>
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

function ListTable({
  rows,
  columns,
  onChange,
  onRemove,
}: {
  rows: SalaryPoint[];
  columns: { key: keyof SalaryPoint; label: string; width?: string }[];
  onChange: (i: number, key: keyof SalaryPoint, value: number) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="mt-2 overflow-auto">
      <table className="min-w-[520px] text-sm">
        <thead>
          <tr className="text-left text-gray-600">
            {columns.map(c => <th key={String(c.key)} className={`py-2 pr-4 ${c.width || ""}`}>{c.label}</th>)}
            <th className="py-2 pr-4"></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length+1} className="py-6 text-center text-gray-500">No rows</td></tr>
          ) : rows.map((r, i) => (
            <tr key={i} className="border-t">
              {columns.map(c => (
                <td key={String(c.key)} className="py-2 pr-4">
                  <input
                    type="number"
                    className={`p-2 border rounded ${focusRing} w-28`}
                    value={Number((r as any)[c.key] || 0)}
                    onChange={(e) => onChange(i, c.key, Number(e.target.value) || 0)}
                  />
                </td>
              ))}
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
  onChange: (i: number, key: keyof IllnessPeriod, value: number) => void;
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
              <td className="py-2 pr-4"><input type="number" className={`p-2 border rounded ${focusRing} w-24`} value={r.startYear} onChange={(e)=>onChange(i,"startYear",Number(e.target.value)||0)} /></td>
              <td className="py-2 pr-4"><input type="number" className={`p-2 border rounded ${focusRing} w-24`} value={r.endYear} onChange={(e)=>onChange(i,"endYear",Number(e.target.value)||0)} /></td>
              <td className="py-2 pr-4"><input type="number" className={`p-2 border rounded ${focusRing} w-24`} min={0} max={12} value={r.monthsPerYear ?? 0} onChange={(e)=>onChange(i,"monthsPerYear",Number(e.target.value)||0)} /></td>
              <td className="py-2 pr-4"><button onClick={()=>onRemove(i)} className={`px-2 py-1 rounded bg-red-50 text-red-700 ${focusRing}`}>Remove</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Card({ number, label }: { number: string; label: string }) {
  return (
    <div className="bg-white/95 text-[#001B2E] rounded-2xl p-3 sm:p-4">
      <div className="text-xl sm:text-2xl font-semibold">{number}</div>
      <div className="text-[11px] sm:text-xs mt-1 text-white/90">{label}</div>
    </div>
  );
}
