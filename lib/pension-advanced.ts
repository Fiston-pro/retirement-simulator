// lib/pension-advanced.ts
export type SalaryPoint = { year: number; gross: number }; // PLN/month
export type IllnessPeriod = { startYear: number; endYear: number; monthsPerYear?: number };

export type AdvancedInputs = {
  // Core
  age: number;
  sex: "male" | "female";
  startYear: number;
  endYear: number;

  // Advanced
  historicalSalaries: SalaryPoint[]; // overrides for specific years
  futureOverrides: SalaryPoint[];    // overrides for future years
  baseSalary: number;                // if no override exists, start from here
  indexationRate: number;            // e.g., 0.035 = 3.5% wage growth
  illness: IllnessPeriod[];          // months reduced per year in ranges
  startingFunds?: number;            // ZUS account+sub-account today (optional)
};

export type AdvancedOutputs = {
  yearly: Array<{
    year: number;
    salary: number;           // indexed salary (after illness adjustment)
    contributionBase: number; // simplified, use salary here (gross)
    accountBalance: number;   // cumulative indexed contributions
  }>;
  nominalMonthly: number;
  realMonthly: number;
  replacementRate: number;
};

// Simple, educational accumulation:
// - monthly contribution proxy = salary * 19.52% (employee+employer pension pillar) * 12
// - account balance indexed with given indexation rate
// - final monthly benefit = balance / (life-expectancy-years * 12)   (very simplified)
export function calcForecastAdvanced(input: AdvancedInputs): AdvancedOutputs {
  const {
    startYear,
    endYear,
    baseSalary,
    indexationRate,
    historicalSalaries,
    futureOverrides,
    illness,
    startingFunds = 0,
  } = input;

  const years: number[] = [];
  for (let y = startYear; y <= endYear; y++) years.push(y);

  // Utility maps for quick override lookup
  const histMap = new Map(historicalSalaries.map(s => [s.year, s.gross]));
  const futMap  = new Map(futureOverrides.map(s => [s.year, s.gross]));

  // Illness months per year map
  const illMonths = new Map<number, number>();
  for (const p of illness) {
    for (let y = p.startYear; y <= p.endYear; y++) {
      illMonths.set(y, (illMonths.get(y) || 0) + (p.monthsPerYear ?? 0));
    }
  }

  // Build salary path with overrides + indexation (fallback)
  const path: number[] = [];
  let last = baseSalary;
  for (let i = 0; i < years.length; i++) {
    const y = years[i];
    // priority: historical override → future override → indexed continuation
    let s = histMap.get(y);
    if (s == null) s = futMap.get(y);
    if (s == null) {
      if (i === 0) s = baseSalary;
      else s = Math.max(0, path[i - 1] * (1 + indexationRate));
    }
    path.push(s!);
  }

  // Apply illness: reduce salary proportionally to months off (very simplified)
  const adjSalary: number[] = path.map((s, i) => {
    const y = years[i];
    const months = Math.max(0, Math.min(12, illMonths.get(y) || 0));
    const factor = (12 - months) / 12; // e.g., 2 months sick → 10/12 contribution
    return s * factor;
  });

  // Accumulate ZUS account balance (educational – not official)
  const contribRate = 0.1952; // 19.52% combined pension contribution
  let balance = startingFunds;
  const yearly = years.map((y, i) => {
    const salary = adjSalary[i];
    const annualContrib = salary * 12 * contribRate;
    balance = (balance * (1 + indexationRate)) + annualContrib; // index + add contrib
    return {
      year: y,
      salary,
      contributionBase: salary,
      accountBalance: balance,
    };
  });

  // End-of-career conversion to monthly annuity
  const lifeYears = 20; // stand-in for life expectancy divisor
  const nominalMonthly = balance / (lifeYears * 12); // PLN/month
  const realMonthly = nominalMonthly / Math.pow(1 + 0.025, 10); // rough 10y horizon @2.5% inflation
  const lastSalary = adjSalary.at(-1) || baseSalary;
  const replacementRate = lastSalary > 0 ? nominalMonthly / lastSalary : 0;

  return {
    yearly,
    nominalMonthly,
    realMonthly,
    replacementRate,
  };
}
