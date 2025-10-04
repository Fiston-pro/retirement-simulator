"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

export default function ForecastPage() {
  const router = useRouter();
  const params = useSearchParams();
  const desiredFromLanding = params.get("desired");

  // Form state
  const [age, setAge] = useState(30);
  const [sex, setSex] = useState("male");
  const [salary, setSalary] = useState(6000);
  const [startYear, setStartYear] = useState(2015);
  const [endYear, setEndYear] = useState(65);
  const [funds, setFunds] = useState("");
  const [includeSickLeave, setIncludeSickLeave] = useState(false);

  // Auto default end year by age + gender (retirement age)
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const retirementAge = sex === "male" ? 65 : 60;
    const birthYear = currentYear - age;
    const defaultStart = Math.max(birthYear + 18, 1980);
    setStartYear(defaultStart);
    setEndYear(birthYear + retirementAge);
  }, [age, sex]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = new URLSearchParams({
      age: String(age),
      sex,
      salary: String(salary),
      startYear: String(startYear),
      endYear: String(endYear),
      includeSickLeave: includeSickLeave ? "1" : "0",
    });
    if (funds) query.append("funds", funds);
    if (desiredFromLanding) query.append("desired", desiredFromLanding);
    router.push(`/result?${query.toString()}`);
  }

  return (
    <main className="min-h-screen bg-[#F7F9FB] text-black p-6">
      <header className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold text-[#00416E]">Forecast your future pension</h1>
        {desiredFromLanding && (
          <p className="mt-1 text-sm text-gray-600">
            Desired pension: <strong>{desiredFromLanding} PLN/month</strong>
          </p>
        )}
      </header>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto mt-6 bg-white p-6 rounded-2xl shadow-sm"
      >
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Age</label>
            <input
              type="number"
              min={18}
              max={70}
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="mt-1 w-full p-3 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Sex</label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="sex"
                  value="male"
                  checked={sex === "male"}
                  onChange={() => setSex("male")}
                />
                Male
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="sex"
                  value="female"
                  checked={sex === "female"}
                  onChange={() => setSex("female")}
                />
                Female
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Gross salary (PLN/month)</label>
            <input
              type="number"
              min={1000}
              step={100}
              value={salary}
              onChange={(e) => setSalary(Number(e.target.value))}
              className="mt-1 w-full p-3 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Start year of work</label>
            <input
              type="number"
              min={1980}
              value={startYear}
              onChange={(e) => setStartYear(Number(e.target.value))}
              className="mt-1 w-full p-3 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Planned retirement year</label>
            <input
              type="number"
              min={new Date().getFullYear()}
              value={endYear}
              onChange={(e) => setEndYear(Number(e.target.value))}
              className="mt-1 w-full p-3 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Funds accumulated in ZUS account (optional)</label>
            <input
              type="number"
              min={0}
              placeholder="Leave empty to estimate automatically"
              value={funds}
              onChange={(e) => setFunds(e.target.value)}
              className="mt-1 w-full p-3 border rounded"
            />
          </div>

          <div className="col-span-2 flex items-center gap-3 mt-3">
            <input
              id="sickLeave"
              type="checkbox"
              checked={includeSickLeave}
              onChange={(e) => setIncludeSickLeave(e.target.checked)}
            />
            <label htmlFor="sickLeave" className="text-sm font-medium">
              Include the possibility of sick leave
            </label>
          </div>

          {includeSickLeave && (
            <div className="col-span-2 bg-[#F7F9FB] p-4 rounded text-sm text-gray-600 border border-dashed border-gray-300">
              On average, women in Poland spend ~18 days/year and men ~12 days/year on sick leave — this may slightly reduce pension benefits.
            </div>
          )}

          <div className="col-span-2 flex justify-end mt-6">
            <button
              type="submit"
              className="px-6 py-3 rounded bg-[#00993F] text-white hover:bg-[#007a32] focus:ring-2 focus:ring-offset-2 focus:ring-[#00416E]"
            >
              Forecast my pension
            </button>
          </div>
        </form>
      </motion.section>
    </main>
  );
}
