export type ForecastInput = {
  age: number;
  sex: "male" | "female";
  salary: number; // PLN/month gross
  startYear: number;
  endYear: number; // January-based
  includeSickLeave: boolean;
  funds?: number; // PLN in ZUS account/sub-account
  desired?: number; // PLN/month goal
};

export type ForecastResult = {
  nominalMonthly: number;
  realMonthly: number;
  replacementRate: number;
  laterOptions: { label: string; value: number }[];
  avgPensionBenchmark: number;
  yearsToGoal?: number;
};

export function calcForecast(i: ForecastInput, nowYear = new Date().getFullYear()): ForecastResult {
  const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);
  const yearsWorked = clamp(i.endYear - i.startYear, 0, 60);

  const sickPenalty = i.includeSickLeave ? (i.sex === "male" ? 0.02 : 0.03) : 0;
  const base = i.salary * 0.4 * (yearsWorked / 35);
  const fundsMonthly = i.funds ? i.funds / 240 : 0;
  const nominalMonthly = base * (1 - sickPenalty) + fundsMonthly;

  const yearsToRet = Math.max(0, i.endYear - nowYear);
  const realMonthly = nominalMonthly / Math.pow(1 + 0.025, yearsToRet);
  const replacementRate = nominalMonthly / Math.max(1, i.salary);

  const laterOptions = [
    { label: "+1 year", value: nominalMonthly * 1.08 },
    { label: "+2 years", value: nominalMonthly * 1.16 },
    { label: "+5 years", value: nominalMonthly * 1.4 },
  ];
  const avgPensionBenchmark = Math.max(2500, 0.45 * i.salary);

  let yearsToGoal: number | undefined;
  if (i.desired && i.desired > 0 && nominalMonthly > 0) {
    yearsToGoal = nominalMonthly >= i.desired ? 0 : Math.ceil(Math.log(i.desired / nominalMonthly) / Math.log(1.08));
  }

  return { nominalMonthly, realMonthly, replacementRate, laterOptions, avgPensionBenchmark, yearsToGoal };
}
