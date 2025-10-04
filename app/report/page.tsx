"use client";

import React, { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { logSimulation } from "@/lib/usage";


const PLN = (n: number) =>
  `${new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(n)))} PLN`;

export default function ReportPage() {
  const q = useSearchParams();
  const age = Number(q.get("age") ?? 30);
  const sex = (q.get("sex") ?? "male") as "male" | "female";
  const salary = Number(q.get("salary") ?? 6000);
  const startYear = Number(q.get("startYear") ?? 2015);
  const endYear = Number(q.get("endYear") ?? new Date().getFullYear() + 30);
  const includeSickLeave = q.get("includeSickLeave") === "1";
  const funds = q.get("funds") ? Number(q.get("funds")) : 0;
  const desired = q.get("desired") ? Number(q.get("desired")) : undefined;

  const [postalCode, setPostalCode] = useState("");

  const now = new Date();

  const result = useMemo(() => {
    const nowYear = new Date().getFullYear();
    const yearsWorked = Math.max(0, endYear - startYear);
    const sickPenalty = includeSickLeave ? (sex === "male" ? 0.02 : 0.03) : 0;

    const basePensionMonthly = salary * 0.4 * (yearsWorked / 35);
    const fundsMonthly = funds ? funds / 240 : 0;
    const adjusted = basePensionMonthly * (1 - sickPenalty) + fundsMonthly;

    const yearsUntilRetire = Math.max(0, endYear - nowYear);
    const inflation = 0.025;
    const real = adjusted / Math.pow(1 + inflation, yearsUntilRetire);

    const replacementRate = adjusted / Math.max(1, salary);

    const later = [
      { label: "+1 year", value: adjusted * 1.08 },
      { label: "+2 years", value: adjusted * 1.16 },
      { label: "+5 years", value: adjusted * 1.4 },
    ];

    let yearsToGoal: number | undefined = undefined;
    if (desired && desired > 0 && adjusted > 0) {
      if (adjusted >= desired) yearsToGoal = 0;
      else yearsToGoal = Math.ceil(Math.log(desired / adjusted) / Math.log(1.08));
    }

    return {
      yearsWorked,
      basePensionMonthly,
      adjusted,
      real,
      replacementRate,
      later,
      yearsToGoal,
    };
  }, [age, sex, salary, startYear, endYear, includeSickLeave, funds, desired]);

  function handleDownload() {
    const doc = new jsPDF({ unit: "pt", format: "a4" });

    const heading = "Pension Forecast Report";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(heading, 40, 50);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Generated: ${now.toLocaleString("pl-PL")}`, 40, 68);
    doc.text("Educational simulator. Replace assumptions with official ZUS / GUS / NBP data for production.", 40, 82);

    // Inputs table
    autoTable(doc, {
      startY: 100,
      theme: "grid",
      head: [["Parameter", "Value"]],
      body: [
        ["Age", String(age)],
        ["Sex", sex === "male" ? "Male" : "Female"],
        ["Gross salary (PLN)", PLN(salary)],
        ["Start year (Jan)", String(startYear)],
        ["Planned retirement year (Jan)", String(endYear)],
        ["Include sick leave", includeSickLeave ? "Yes" : "No"],
        ["Funds accumulated", PLN(funds)],
        ["Desired pension", desired ? PLN(desired) : "—"],
        ["Postal code (optional)", postalCode || "—"],
      ],
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [63, 132, 210] }, // ZUS blue
    });

    // Results table
    const resY = (doc as any).lastAutoTable.finalY + 16;
    autoTable(doc, {
      startY: resY,
      theme: "grid",
      head: [["Metric", "Amount"]],
      body: [
        ["Estimated pension (nominal)", PLN(result.adjusted)],
        ["Real (inflation-adjusted)", PLN(result.real)],
        ["Replacement rate", `${Math.round(result.replacementRate * 100)}%`],
        ["Years worked (Jan-JAN)", String(result.yearsWorked)],
      ],
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [0, 153, 63] }, // ZUS green
    });

    // Scenario table
    const scenY = (doc as any).lastAutoTable.finalY + 16;
    autoTable(doc, {
      startY: scenY,
      theme: "grid",
      head: [["Scenario", "Estimated pension"]],
      body: result.later.map((x) => [x.label, PLN(x.value)]),
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [255, 179, 79] }, // ZUS yellow
    });

    // Goal gap info
    const gapY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Goal comparison", 40, gapY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    let nextY = gapY + 16;
    if (desired) {
      if (result.adjusted >= desired) {
        doc.text(`Your forecast meets your desired pension of ${PLN(desired)}.`, 40, nextY);
      } else if (result.yearsToGoal !== undefined) {
        doc.text(
          `You may need approximately ${result.yearsToGoal} more ${result.yearsToGoal === 1 ? "year" : "years"} of work to reach ${PLN(
            desired
          )}.`,
          40,
          nextY
        );
      }
      nextY += 16;
    } else {
      doc.text("No desired pension provided on the first page.", 40, nextY);
      nextY += 16;
    }

    // Footer note
    nextY += 8;
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(
      "Disclaimer: This report is for educational purposes. Start and end years refer to January. Real outcomes depend on official indexation and individual history.",
      40,
      nextY
    );

    // Log the data for admin page
    const nowLog = new Date();
    try {
      logSimulation({
        date: nowLog.toISOString().slice(0,10),
        time: nowLog.toTimeString().slice(0,8),
        expected_pension: desired ?? null,
        age,
        sex,
        salary_amount: salary,
        sick_leave_included: includeSickLeave,
        funds_accumulated: funds ?? null,
        actual_pension: Math.round(result.adjusted),
        real_pension: Math.round(result.real),
        postal_code: postalCode || null,
      });
    } catch {}

    doc.save("pension-forecast-report.pdf");
  }

  return (
    <div className="min-h-screen bg-[#F3F6FA] text-[#001B2E]">
      <section className="max-w-4xl mx-auto px-6 pt-8">
        <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-semibold text-[#00416E]">
          Download your pension report
        </motion.h1>
        <p className="text-sm text-gray-600 mt-1">A concise PDF with your inputs, results, and scenarios. All amounts are in PLN.</p>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-6 grid gap-6 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-6 shadow-sm">
          <h2 className="font-semibold mb-4">Summary</h2>
          <ul className="text-sm grid gap-1">
            <li><strong>Estimated pension (nominal):</strong> {PLN(result.adjusted)}</li>
            <li><strong>Real (inflation-adjusted):</strong> {PLN(result.real)}</li>
            <li><strong>Replacement rate:</strong> {Math.round(result.replacementRate * 100)}%</li>
            <li><strong>Years worked:</strong> {result.yearsWorked}</li>
          </ul>

          {desired && (
            <p className="text-sm mt-3">
              Desired pension: <strong>{PLN(desired)}</strong>{" "}
              {result.adjusted >= desired
                ? "— your forecast meets your goal."
                : result.yearsToGoal !== undefined
                ? `— approx. ${result.yearsToGoal} more ${result.yearsToGoal === 1 ? "year" : "years"} needed to reach the goal.`
                : null}
            </p>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-6 shadow-sm">
          <h2 className="font-semibold mb-3">Details</h2>
          <ul className="text-sm grid gap-1">
            <li><strong>Age:</strong> {age}</li>
            <li><strong>Sex:</strong> {sex}</li>
            <li><strong>Gross salary:</strong> {PLN(salary)}</li>
            <li><strong>Start year (Jan):</strong> {startYear}</li>
            <li><strong>Planned retirement year (Jan):</strong> {endYear}</li>
            <li><strong>Include sick leave:</strong> {includeSickLeave ? "Yes" : "No"}</li>
            <li><strong>Funds accumulated:</strong> {PLN(funds)}</li>
          </ul>

          <div className="mt-4">
            <label className="block text-sm font-medium">Postal code (optional)</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g., 00-001"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className="mt-1 w-full p-2 border rounded"
            />
            <p className="text-xs text-gray-500 mt-1">Included in your PDF only if provided.</p>
          </div>
        </motion.div>
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-12">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-[#00416E] rounded-3xl p-6 text-white flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Generate PDF report</h3>
            <p className="text-sm text-white/80">It will include your inputs, core results, and later-retirement scenarios.</p>
          </div>
          <button onClick={handleDownload} className="px-4 py-2 rounded-2xl bg-white text-[#00416E] font-medium hover:opacity-95">
            Download
          </button>
        </motion.div>

        <p className="text-xs text-gray-500 mt-3">
          * Educational simulator. Start and end years refer to January. For production, replace assumptions with official ZUS / GUS / NBP sources.
        </p>
      </section>
    </div>
  );
}
