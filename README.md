# ZUS Pension Simulator (Hackathon MVP)

Educational web tool to raise public awareness of social insurance and future pension benefits.
Built with **Next.js 13 App Router**, **Tailwind CSS**, **Framer Motion**, **Recharts**, and **jsPDF**.

---

## ✨ Features

- **Landing page**: Introduces the simulator, user enters desired pension and sees quick comparisons with average benefits.
- **Forecast page**: Collects required inputs (age, sex, salary, start/end years, optional funds, sick-leave toggle).
- **Result dashboard**: Modern, animated dashboard with:
  - Nominal & inflation-adjusted pension amounts (PLN).
  - Replacement rate (pension ÷ last salary).
  - Salary vs. pension chart across career.
  - “Retire later” scenarios (+8% per year).
  - “Did you know?” facts (deterministic to avoid hydration mismatch).
  - Downloadable PDF report.
- **Admin page**: Shows logged simulation usage and exports to `.xls` (date, time, age, sex, salary, expected & actual pension, etc.).

---

## 🛠️ Tech Stack

- **Next.js 13** (App Router)
- **React** + **Framer Motion** (animations)
- **Tailwind CSS** (styling)
- **Recharts** (data visualization)
- **jsPDF** + **jspdf-autotable** (report generation)
- Local logging with `sessionStorage` for demo (replace with API/DB for production).

---

## ♿ Accessibility (WCAG 2.0)

- Skip link to main content.
- Visible focus ring for keyboard users.
- Deterministic animations with “reduce motion” support.
- Proper headings, labels, and ARIA landmarks.
- Color palette based on ZUS brand, checked for AA contrast.

---

## 🚀 Getting Started

```bash
# install dependencies
npm install

# run locally
npm run dev

# build production
npm run build && npm start
```

## 📂 Structure

```bash
app/
  layout.tsx          # global layout, SkipLink + <main>
  page.tsx            # landing
  forecast/page.tsx   # inputs page
  result/page.tsx     # dashboard with charts, logging, PDF link
  report/page.tsx     # PDF generator
  admin/page.tsx      # usage log view + export
components/
  a11y/WCAGKit.tsx    # accessibility helpers (SkipLink, VisuallyHidden, focusRing)
lib/
  usage.ts            # logSimulation, readLogs, clearLogs helpers
```

## 📜 Notes

- All start & end years refer to January.

- Replace mock assumptions with official ZUS / GUS / NBP data for production.

- This MVP logs to browser storage only. In production, integrate with a backend.

## 📝 License
MIT