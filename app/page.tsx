// app/page.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { focusRing } from "@/components/a11y/WCAGKit";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
} from "recharts";

const BRAND_BLUE = "#3F84D2";
const BRAND_GREEN = "#00993F";
const BRAND_ORANGE = "#FFB34F";

// ⚠️ For hackathon demo: set a “current average benefit” constant here (PLN).
// Replace later with a real source if you want.
const CURRENT_AVG_PENSION_PLN = 3600;

const GROUPS = [
  {
    key: "below-min",
    label: "Below minimum",
    value: 12, // %
    desc:
      "Beneficiaries with low employment activity; did not meet 25y (men) / 20y (women), so no guaranteed minimum.",
  },
  {
    key: "minimum",
    label: "At minimum",
    value: 18,
    desc:
      "Beneficiaries who met the qualifying period and receive the guaranteed minimum pension.",
  },
  { key: "2-3k", label: "2–3k PLN", value: 24, desc: "Common benefit range for many new retirees." },
  { key: "3-4k", label: "3–4k PLN", value: 22, desc: "Above average; longer contributions or higher pay." },
  { key: "4-5k", label: "4–5k PLN", value: 14, desc: "High earners or longer-than-average careers." },
  { key: "5k+", label: "5k+ PLN", value: 10, desc: "Top benefits—very long careers and high contribution bases." },
];

const DID_YOU_KNOW: string[] = [
  "Delaying retirement by a year often lifts your monthly benefit by several percent.",
  "Longer contribution periods and fewer career breaks generally mean a higher pension.",
  "Indexation maintains the real value of benefits, but inflation can still erode purchasing power.",
  "Even small monthly savings (e.g., 100 PLN) compound meaningfully over decades.",
  "Sick-leave periods slightly lower contributions and can reduce the final benefit.",
];

export default function BasicDashboardPage() {
  const router = useRouter();

  // Desired pension (controlled)
  const [desired, setDesired] = React.useState<number | "">("");

  // Client-only “Did you know?” to avoid hydration mismatch
  const [fact, setFact] = React.useState<string>("");
  React.useEffect(() => {
    const daySeed = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
    const idx = hashCode(daySeed) % DID_YOU_KNOW.length;
    setFact(DID_YOU_KNOW[idx]);
  }, []);

  function goNext() {
    const d = desired && Number(desired) > 0 ? Number(desired) : undefined;
    const url = d ? `/simulate?desired=${Math.round(d)}` : `/simulate`;
    router.push(url);
  }

  return (
    <div className="grid gap-4 sm:gap-6">
      
      {/* Context + input */}
      <section
        className="rounded-3xl p-5 sm:p-6 text-white pb-6"
        style={{ background: "linear-gradient(135deg,#3F84D2,#00993F)" }}
        aria-labelledby="dash-title"
      >
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
          <span className="inline-flex items-center gap-1 bg-white/15 rounded-full px-2 py-1">
            🤝 <span className="opacity-90">Invite friends</span>
          </span>
          <span className="inline-flex items-center gap-1 bg-white/15 rounded-full px-2 py-1">
            🎮 <span className="opacity-90">Daily challenges</span>
          </span>
          <span className="inline-flex items-center gap-1 bg-white/15 rounded-full px-2 py-1">
            🏆 <span className="opacity-90">Unlock badges</span>
          </span>
          <span className="inline-flex items-center gap-1 bg-white/15 rounded-full px-2 py-1">
            💬 <span className="opacity-90">AI helper</span>
          </span>
        </div>

        <div className="flex gap-2 sm:ml-auto">
          <a
            href="/profile"
            className={`text-xs sm:text-sm px-3 py-1.5 rounded-2xl bg-white text-[#00416E] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-white/90`}
          >
            Create a Squad
          </a>
        </div>
      </div>

        <h1 id="dash-title" className="text-xl sm:text-2xl font-semibold">
          What monthly pension would you like to have?
        </h1>
        <p className="text-sm sm:text-base text-white/90 mt-1">
          Tell us your target in PLN. We’ll compare it to today’s average and show how your
          career path affects the forecast.
        </p>

        <div className="mt-4 grid sm:grid-cols-[1fr,auto] gap-3 items-end">
          <label className="grid gap-1 max-w-xs">
            <span className="text-sm font-medium">Desired pension (PLN / month)</span>
            <input
              inputMode="numeric"
              type="number"
              min={0}
              className={`p-2 rounded-xl text-white ${focusRing}`}
              placeholder="4500"
              value={desired}
              onChange={(e) =>
                setDesired(e.target.value === "" ? "" : Number(e.target.value) || 0)
              }
              aria-describedby="desired-help"
            />
            <span id="desired-help" className="text-xs text-white/90">
              This is your goal — we won’t judge 😊
            </span>
          </label>

          <button
            onClick={goNext}
            className={`px-4 py-2 rounded-2xl bg-white text-[#00416E] font-medium ${focusRing} w-fit`}
            aria-label="Continue to simulator"
          >
            Continue to simulator
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <InfoCard
            title="Your goal"
            value={
              desired === ""
                ? "—"
                : `${new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 }).format(
                    Number(desired)
                  )} PLN`
            }
            hint="You can change this anytime."
          />
          <InfoCard
            title="Average benefit (today)"
            value={`${new Intl.NumberFormat("pl-PL", {
              maximumFractionDigits: 0,
            }).format(CURRENT_AVG_PENSION_PLN)} PLN`}
            hint="For quick context. Source: demo constant."
          />
          <InfoCard
            title="Context"
            value={
              desired === ""
                ? "Enter your goal to compare"
                : Number(desired) >= CURRENT_AVG_PENSION_PLN
                ? "Above current average"
                : "Below current average"
            }
            hint="We’ll adjust for inflation later."
          />
        </div>
      </section>

      {/* Distribution chart with hover descriptions */}
      <section className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm">
        <h2 className="text-lg sm:text-xl font-semibold">Where do most benefits sit?</h2>
        <p className="text-sm text-gray-600">
          Hover or focus bars to learn what each group means. This helps place your goal in
          context.
        </p>

        <div className="mt-3 h-64 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={GROUPS} barCategoryGap={16}>
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis
                tickFormatter={(v) => `${v}%`}
                domain={[0, 30]}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as (typeof GROUPS)[number];
                  return (
                    <div className="bg-white border rounded-lg p-3 max-w-[240px] text-sm shadow">
                      <div className="font-medium mb-1">
                        {p.label} — {p.value}%
                      </div>
                      <div className="text-gray-700">{p.desc}</div>
                    </div>
                  );
                }}
              />
              <ReferenceLine
                y={20}
                stroke="#CBD5E1"
                strokeDasharray="4 4"
                ifOverflow="discard"
              />
              <Bar dataKey="value" aria-label="Pension distribution by group">
                {GROUPS.map((g, i) => (
                  <Cell
                    key={g.key}
                    fill={i % 2 === 0 ? BRAND_BLUE : BRAND_GREEN}
                    tabIndex={0}
                    role="img"
                    aria-label={`${g.label}: ${g.value}% — ${g.desc}`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Did you know? */}
      <section className="rounded-3xl p-4 sm:p-6 text-white"
        style={{ background: "linear-gradient(135deg,#00416E,#3F84D2)" }}
      >
        <h2 className="text-lg sm:text-xl font-semibold">Did you know?</h2>
        <p className="text-sm sm:text-base mt-1 text-white/90">
          {fact || "Small changes over many years can have a big impact on your future income."}
        </p>
      </section>
    </div>
  );
}

function InfoCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-white/95 text-[#001B2E] rounded-2xl p-3 sm:p-4 shadow-sm">
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xl sm:text-2xl font-semibold mt-1">{value}</div>
      {hint && <div className="text-xs text-gray-600 mt-1">{hint}</div>}
    </div>
  );
}

function hashCode(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
