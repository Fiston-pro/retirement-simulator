# README

## Pension Simulator – HackYeah ZUS Challenge

An educational web application built with **Next.js 15 (App Router)** that visualises future pension benefits for people entering the labour market in Poland.  
It implements the ZUS Hackathon requirements, including the basic simulator, advanced dashboard for deeper forecasting, and accessibility/WCAG compliance.

### ✨ Features

- **Modern, mobile-friendly UI**  
  Responsive layouts, ZUS brand palette, gradients and accessible focus rings.

- **Basic Pension Simulator (spec 1.1)**  
  * Ask what pension you’d like to have in the future.  
  * Compare it to the current average benefit amount.  
  * “Did you know?” random facts about pensions.  
  * Clear chart comparing salary vs. estimated benefit.  

- **Advanced Dashboard (spec 1.4)**  
  * Enter specific historical salaries or future salary overrides.  
  * Set custom indexation rate (wage growth).  
  * Specify illness periods (months per year) past & future.  
  * Visualise how your ZUS account/sub-account grows over the years.  
  * See advanced nominal, real and replacement rate values.

- **Downloadable Report (spec 1.5)**  
  Generate a PDF with the input parameters, charts and calculated forecast.

- **User Profiles**  
  * Anonymous or Google login via Firebase Authentication.  
  * Logged-in users can save forecasts to the cloud (Firestore).  
  * Profile page shows saved scenarios, gamified tips & goals.

- **Admin Page**  
  * View and export user forecasts to XLSX.  
  * Filter only logged-in users’ data.  

- **AI Assistant**  
  Floating 💬 icon on every page opens an assistant trained to answer retirement questions and explain the replacement rate.  
  Uses GPT model API for responses and `react-markdown` to render formatted answers.

- **Accessibility**  
  Complies with WCAG 2.0 AA contrast.  
  Keyboard-focusable controls and visible focus rings.

### 🛠 Tech Stack

- [Next.js 15 / App Router](https://nextjs.org/)  
- [React](https://react.dev/) + [TailwindCSS](https://tailwindcss.com/) for UI  
- [Firebase](https://firebase.google.com/) for Auth and Firestore persistence  
- [Recharts](https://recharts.org/) for interactive charts  
- [jsPDF](https://github.com/parallax/jsPDF) + `autoTable` for PDF export  
- [react-markdown](https://github.com/remarkjs/react-markdown) for assistant messages  

### 📂 Main Structure

```bash
app/
  layout.tsx # global layout with Header + AssistantWidget
  simulate/page.tsx # main pension simulator + advanced dashboard
  report/page.tsx # PDF report download page
  profile/page.tsx # user profile with gamified goals
  admin/page.tsx # admin data export view
components/
  site/ui.tsx # Header + AssistantWidget + Footer
  a11y/WCAGKit.tsx # focusRing + skip link helpers
lib/
  firebase.ts # Firebase init, saveForecast helpers
  userCtx.tsx # React context for logged-in user data
  pension.ts # calcForecast + calcForecastAdvanced
public/
  logo.png # 500x500 logo
```
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

## 🔑 Environment Variables

Create `.env.local` with your Firebase config:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

## 📜 Notes

- This simulator is educational. It uses simplified assumptions (average indexation, constant contribution rate, 20-year life expectancy) and defaults to the current Polish statutory retirement age (60 women, 65 men).

- Real ZUS calculations are more complex and include official life-expectancy tables, indexing rules and special cases.

## 🏆 Hackathon Goal

Provide an accessible, visually appealing and interactive pension forecast tool that increases awareness of future retirement benefits and promotes better savings habits among young workers.

## 📝 License
MIT