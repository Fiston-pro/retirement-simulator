// app/admin/page.tsx
"use client";

import * as XLSX from "xlsx";

import React from "react";
import { focusRing } from "@/components/a11y/WCAGKit";
import { db, loginAnon, loginGoogle } from "@/lib/firebase";
import { useUserCtx } from "@/lib/userCtx";
import {
  collection,
  getDocs,
  query,
  collectionGroup,
  Timestamp,
} from "firebase/firestore";

export const dynamic = "force-dynamic";

type UserRow = {
  uid: string;
  isAnonymous?: boolean;
  email?: string | null;
  profile?: any;
  updatedAt?: string | null;
};

type ForecastRow = {
  id: string;
  uid: string;
  createdAt?: string | null;
  form?: any;
  result?: any;
};

export default function AdminPage() {
  const { user } = useUserCtx();

  // ---- All hooks are declared unconditionally (no early returns) ----
  const [mounted, setMounted] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [tab, setTab] = React.useState<"users" | "forecasts">("users");
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [forecasts, setForecasts] = React.useState<ForecastRow[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    // Only fetch after mount + signed-in
    if (!mounted || !user) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // users collection
        const uSnaps = await getDocs(collection(db, "users"));
        const u: UserRow[] = uSnaps.docs.map((d) => {
          const data = d.data() || {};
          const p = data.profile || {};
          return {
            uid: d.id,
            isAnonymous: !!data.isAnonymous,
            email: data.email ?? null,
            profile: p,
            updatedAt: toClientTimeString(p?.updatedAt),
          };
        });

        // forecasts via collectionGroup
        const fSnaps = await getDocs(query(collectionGroup(db, "forecasts")));
        const f: ForecastRow[] = fSnaps.docs.map((d) => {
          const data = d.data() || {};
          return {
            id: d.id,
            uid: d.ref.path.split("/")[1], // users/{uid}/forecasts/{id}
            createdAt: toClientTimeString(data.createdAt),
            form: data.form || {},
            result: data.result || {},
          };
        });

        setUsers(u);
        setForecasts(f);
      } catch (e: any) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [mounted, user]);

  // ----------------------- Render branches -----------------------
  // (1) Before hydration: render a stable placeholder to avoid mismatch
  if (!mounted) {
    return (
      <div
        suppressHydrationWarning
        className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm"
      >
        Loading…
      </div>
    );
  }

  // (2) Mounted: show either sign-in gate or admin content
  return (
    <div className="grid gap-3">
      <header
        className="rounded-3xl p-4 sm:p-6 text-white"
        style={{ background: "linear-gradient(135deg,#3F84D2,#00993F)" }}
      >
        <h1 className="text-xl sm:text-2xl font-semibold">Admin</h1>
        <p className="text-sm text-white/85 mt-1">
          Cloud-only data: users (anonymous & registered) and their saved forecasts.
        </p>

        <div className="mt-3 flex gap-2">
          <button
            className={`px-4 py-2 rounded-2xl ${tab === "users" ? "bg:white bg-white text-[#00416E]" : "bg-white/20 text-white"} ${focusRing}`}
            onClick={() => setTab("users")}
          >
            Users
          </button>
          <button
            className={`px-4 py-2 rounded-2xl ${tab === "forecasts" ? "bg:white bg-white text-[#00416E]" : "bg-white/20 text-white"} ${focusRing}`}
            onClick={() => setTab("forecasts")}
          >
            Forecasts
          </button>

            {/* Download */}
          <button
            onClick={() => downloadXLSX(users, forecasts)}
            className={`ml-auto px-4 py-2 rounded-2xl bg-white text-[#00416E] font-medium ${focusRing}`}
            aria-label="Download XLSX report"
            title="Download .xlsx report"
            disabled={!users?.length && !forecasts?.length}
          >
            Download XLSX
          </button>
        </div>
      </header>

      {!user ? (
        // Sign-in gate (no early return; just a branch)
        <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Please sign in</h2>
          <p className="text-sm text-gray-600 mb-3">Sign in to view admin data.</p>
          <div className="flex gap-2">
            <button
              onClick={loginAnon}
              className={`px-3 py-2 rounded bg-[#3F84D2] text-white text-sm ${focusRing}`}
            >
              Anon
            </button>
            <button
              onClick={loginGoogle}
              className={`px-3 py-2 rounded bg-[#00993F] text-white text-sm ${focusRing}`}
            >
              Google
            </button>
          </div>
        </div>
      ) : (
        <>
          {error && (
            <div className="bg-red-50 text-red-700 rounded-2xl p-3">{error}</div>
          )}

          {loading ? (
            <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm">Loading…</div>
          ) : tab === "users" ? (
            <UsersTable rows={users} />
          ) : (
            <ForecastsTable rows={forecasts} />
          )}
        </>
      )}
    </div>
  );
}

// ----- Tables & helpers -----

function UsersTable({ rows }: { rows: UserRow[] }) {
  return (
    <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm overflow-auto">
      <h2 className="text-lg font-semibold mb-3">Users</h2>
      <div className="text-sm text-gray-600 mb-3">
        Total: <strong>{rows.length}</strong> • Registered:{" "}
        <strong>{rows.filter((r) => !r.isAnonymous).length}</strong> • Anonymous:{" "}
        <strong>{rows.filter((r) => r.isAnonymous).length}</strong>
      </div>

      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-600">
            <th className="py-2 pr-4">UID</th>
            <th className="py-2 pr-4">Account</th>
            <th className="py-2 pr-4">Email</th>
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Birth</th>
            <th className="py-2 pr-4">Salary</th>
            <th className="py-2 pr-4">Desired</th>
            <th className="py-2 pr-4">Postal</th>
            <th className="py-2 pr-4">Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={9} className="py-8 text-center text-gray-500">
                No users yet.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.uid} className="border-t">
                <td className="py-2 pr-4">{r.uid}</td>
                <td className="py-2 pr-4">{r.isAnonymous ? "Anonymous" : "Registered"}</td>
                <td className="py-2 pr-4">{r.email || "—"}</td>
                <td className="py-2 pr-4">{r.profile?.name || "—"}</td>
                <td className="py-2 pr-4">{r.profile?.birthYear ?? "—"}</td>
                <td className="py-2 pr-4">{fmtPLN(r.profile?.salary)}</td>
                <td className="py-2 pr-4">{fmtPLN(r.profile?.desired)}</td>
                <td className="py-2 pr-4">{r.profile?.postal || "—"}</td>
                <td className="py-2 pr-4">{r.updatedAt || "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ForecastsTable({ rows }: { rows: ForecastRow[] }) {
  return (
    <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm overflow-auto">
      <h2 className="text-lg font-semibold mb-3">Forecasts</h2>
      <div className="text-sm text-gray-600 mb-3">
        Total: <strong>{rows.length}</strong>
      </div>

      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-600">
            <th className="py-2 pr-4">Created</th>
            <th className="py-2 pr-4">UID</th>
            <th className="py-2 pr-4">Age</th>
            <th className="py-2 pr-4">Sex</th>
            <th className="py-2 pr-4">Salary</th>
            <th className="py-2 pr-4">Start→End</th>
            <th className="py-2 pr-4">Sick</th>
            <th className="py-2 pr-4">Funds</th>
            <th className="py-2 pr-4">Desired</th>
            <th className="py-2 pr-4">Nominal</th>
            <th className="py-2 pr-4">Real</th>
            <th className="py-2 pr-4">Repl.</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={12} className="py-8 text-center text-gray-500">
                No forecasts yet.
              </td>
            </tr>
          ) : (
            rows.map((r) => {
              const f = r.form || {};
              const res = r.result || {};
              return (
                <tr key={r.id} className="border-t">
                  <td className="py-2 pr-4">{r.createdAt || "—"}</td>
                  <td className="py-2 pr-4">{r.uid}</td>
                  <td className="py-2 pr-4">{f.age ?? "—"}</td>
                  <td className="py-2 pr-4">{f.sex ?? "—"}</td>
                  <td className="py-2 pr-4">{fmtPLN(f.salary)}</td>
                  <td className="py-2 pr-4">{f.startYear ?? "—"}→{f.endYear ?? "—"}</td>
                  <td className="py-2 pr-4">{f.includeSickLeave ? "Yes" : "No"}</td>
                  <td className="py-2 pr-4">{fmtPLN(f.funds)}</td>
                  <td className="py-2 pr-4">{fmtPLN(f.desired)}</td>
                  <td className="py-2 pr-4">{fmtPLN(res.nominalMonthly)}</td>
                  <td className="py-2 pr-4">{fmtPLN(res.realMonthly)}</td>
                  <td className="py-2 pr-4">
                    {res.replacementRate != null ? `${Math.round(res.replacementRate * 100)}%` : "—"}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---- helpers ----
function fmtPLN(n: any) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `${new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 }).format(
    Math.round(Number(n))
  )} PLN`;
}

function toClientTimeString(v: any): string | null {
  if (!v) return null;
  try {
    let d: Date | null = null;
    if (v instanceof Timestamp) d = v.toDate();
    else if (v.seconds) d = new Date(v.seconds * 1000);
    if (d) return d.toLocaleString("pl-PL");
  } catch {}
  return null;
}

function downloadXLSX(users: any[], forecasts: any[]) {
  const usageHeaders = [
    "Date of use",
    "Time of use",
    "Expected pension (PLN)",
    "Age",
    "Sex",
    "Salary amount (PLN)",
    "Included sick leave?",
    "Funds in account+subaccount (PLN)",
    "Actual pension (PLN)",
    "Real (inflation-adjusted) pension (PLN)",
    "Postal code",
  ];

  const rows = forecasts.map((f) => {
    const form = f.form || {};
    const res = f.result || {};
    const uid = f.uid;
    const u = users.find((u) => u.id === uid || u.uid === uid);
    const postal = u?.profile?.postal ?? "";

    // Robust date/time extraction
    let d: Date | null = null;
    try {
      if (f.createdAt?.seconds) d = new Date(f.createdAt.seconds * 1000); // Firestore Timestamp
      else if (typeof f.createdAt === "string") d = new Date(f.createdAt); // ISO string
    } catch {}
    const dateStr = d && !isNaN(d.getTime()) ? d.toLocaleDateString("pl-PL") : "(no date)";
    const timeStr = d && !isNaN(d.getTime()) ? d.toLocaleTimeString("pl-PL") : "(no time)";

    return [
      dateStr,
      timeStr,
      form.desired ?? "",
      form.age ?? "",
      form.sex ?? "",
      form.salary ?? "",
      form.includeSickLeave ? "Yes" : "No",
      form.funds ?? "",
      Math.round(res.nominalMonthly ?? 0),
      Math.round(res.realMonthly ?? 0),
      postal,
    ];
  });

  const usageSheet = XLSX.utils.aoa_to_sheet([usageHeaders, ...rows]);

  const usersHeaders = ["uid", "Account", "Email", "Name", "Birth year", "Salary (PLN)", "Desired (PLN)", "Postal", "Updated"];
  const usersRows = users.map((u) => [
    u.id || u.uid,
    u.isAnonymous ? "Anonymous" : "Registered",
    u.email || "",
    u.profile?.name || "",
    u.profile?.birthYear ?? "",
    u.profile?.salary ?? "",
    u.profile?.desired ?? "",
    u.profile?.postal || "",
    u.updatedAt || "",
  ]);
  const usersSheet = XLSX.utils.aoa_to_sheet([usersHeaders, ...usersRows]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, usageSheet, "Usage");
  XLSX.utils.book_append_sheet(wb, usersSheet, "Users");
  XLSX.writeFile(wb, "zus-admin-report.xlsx");
}
