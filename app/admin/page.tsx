"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";
import { readLogs, clearLogs, type UsageLog } from "@/lib/usage";

const PLN = (n: number) =>
  `${new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(n)))} PLN`;

export default function AdminUsagePage() {
  const [rows, setRows] = useState<UsageLog[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    setRows(readLogs());
  }, []);

  const filtered = useMemo(() => {
    if (!filter) return rows;
    const f = filter.toLowerCase();
    return rows.filter((r) =>
      [r.date, r.time, String(r.age), r.sex, String(r.salary_amount), r.postal_code || "", String(r.expected_pension || "")]
        .join(" ")
        .toLowerCase()
        .includes(f)
    );
  }, [rows, filter]);

  function exportXLS() {
    const headers = [
      "Date of use",
      "Time of use",
      "Expected pension",
      "Age",
      "Sex",
      "Salary amount",
      "Whether periods of illness were included",
      "Amount of funds accumulated",
      "Actual pension",
      "Real (inflation-adjusted) pension",
      "Postal code",
    ];

    const data = filtered.map((r) => [
      r.date,
      r.time,
      r.expected_pension ?? "",
      r.age,
      r.sex,
      r.salary_amount,
      r.sick_leave_included ? "Yes" : "No",
      r.funds_accumulated ?? "",
      r.actual_pension,
      r.real_pension,
      r.postal_code ?? "",
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "usage");
    XLSX.writeFile(wb, "zus-usage-report.xls", { bookType: "xls" });
  }

  function handleClearAll() {
    if (!confirm("Delete all stored usage logs on this device?")) return;
    clearLogs();
    setRows([]);
  }

  return (
    <div className="min-h-screen bg-[#F3F6FA] text-[#001B2E]">
      <section className="max-w-6xl mx-auto px-6 pt-8">
        <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-semibold text-[#00416E]">
          Usage report (Admin)
        </motion.h1>
        <p className="text-sm text-gray-600 mt-1">
          Export an Excel <code>.xls</code> with all simulations performed on this device.
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <input
              placeholder="Search (date, time, age, sex, salary, postal code)"
              className="w-full md:w-72 p-2 border rounded"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={exportXLS} className="px-4 py-2 rounded bg-[#00993F] text-white">
                Download .xls
              </button>
              <button onClick={handleClearAll} className="px-4 py-2 rounded border">
                Clear all
              </button>
            </div>
          </div>

          <div className="overflow-auto mt-4">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">Expected</th>
                  <th className="py-2 pr-4">Age</th>
                  <th className="py-2 pr-4">Sex</th>
                  <th className="py-2 pr-4">Salary</th>
                  <th className="py-2 pr-4">Sick leave?</th>
                  <th className="py-2 pr-4">Funds</th>
                  <th className="py-2 pr-4">Actual</th>
                  <th className="py-2 pr-4">Real</th>
                  <th className="py-2 pr-4">Postal code</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-gray-500">
                      No logs yet. Generate a result or a report to see entries here.
                    </td>
                  </tr>
                )}
                {filtered.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-2 pr-4">{r.date}</td>
                    <td className="py-2 pr-4">{r.time}</td>
                    <td className="py-2 pr-4">{r.expected_pension ? PLN(r.expected_pension) : "—"}</td>
                    <td className="py-2 pr-4">{r.age}</td>
                    <td className="py-2 pr-4">{r.sex}</td>
                    <td className="py-2 pr-4">{PLN(r.salary_amount)}</td>
                    <td className="py-2 pr-4">{r.sick_leave_included ? "Yes" : "No"}</td>
                    <td className="py-2 pr-4">{r.funds_accumulated != null ? PLN(r.funds_accumulated) : "—"}</td>
                    <td className="py-2 pr-4">{PLN(r.actual_pension)}</td>
                    <td className="py-2 pr-4">{PLN(r.real_pension)}</td>
                    <td className="py-2 pr-4">{r.postal_code || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
