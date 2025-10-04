"use client";

import React from "react";
import { load, save } from "@/lib/store";
import { focusRing, SkipLink } from "@/components/a11y/WCAGKit";

export const dynamic = "force-dynamic";

type Profile = {
  name: string;
  birthYear: number | "";
  salary: number | "";
  desired: number | "";
  postal: string;
};

const DEFAULT_PROFILE: Profile = {
  name: "",
  birthYear: "",
  salary: "",
  desired: "",
  postal: "",
};

export default function ProfilePage() {
  const [name, setName] = React.useState<string>("");
  const [birthYear, setBirthYear] = React.useState<number | "">("");
  const [salary, setSalary] = React.useState<number | "">("");
  const [desired, setDesired] = React.useState<number | "">("");
  const [postal, setPostal] = React.useState<string>("");

  // Load once from localStorage and coerce to the correct types
  React.useEffect(() => {
    const p = load<Partial<Profile>>("zus-profile", DEFAULT_PROFILE);

    setName(typeof p.name === "string" ? p.name : "");
    setBirthYear(
      p.birthYear === "" || p.birthYear == null
        ? ""
        : typeof p.birthYear === "number"
        ? p.birthYear
        : Number(p.birthYear) || ""
    );
    setSalary(
      p.salary === "" || p.salary == null
        ? ""
        : typeof p.salary === "number"
        ? p.salary
        : Number(p.salary) || ""
    );
    setDesired(
      p.desired === "" || p.desired == null
        ? ""
        : typeof p.desired === "number"
        ? p.desired
        : Number(p.desired) || ""
    );
    setPostal(typeof p.postal === "string" ? p.postal : "");
  }, []);

  function persist() {
    const toSave: Profile = {
      name,
      birthYear,
      salary,
      desired,
      postal,
    };
    save("zus-profile", toSave);
  }

  return (
    <div className="min-h-screen bg-[#F3F6FA] text-[#001B2E]">
      <SkipLink />
      <section className="max-w-2xl mx-auto px-6 pt-10" id="main">
        <h1 className="text-2xl font-semibold text-[#00416E]">Your profile</h1>
        <p className="text-sm text-gray-600 mt-1">
          Stored locally in your browser for demo purposes.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            persist();
          }}
          className="bg-white rounded-3xl p-6 shadow-sm mt-6 grid gap-4"
          aria-describedby="profile-desc"
        >
          <p id="profile-desc" className="sr-only">
            Update your personal details to prefill the simulator.
          </p>

          <label className="grid gap-1">
            <span className="text-sm font-medium">Full name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`p-2 border rounded ${focusRing}`}
              placeholder="Jan Kowalski"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium">Year of birth</span>
            <input
              type="number"
              value={birthYear as any}
              onChange={(e) =>
                setBirthYear(e.target.value ? Number(e.target.value) : "")
              }
              className={`p-2 border rounded ${focusRing}`}
              placeholder="1994"
              min={1940}
              max={new Date().getFullYear()}
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium">
              Current gross salary (PLN / month)
            </span>
            <input
              type="number"
              value={salary as any}
              onChange={(e) =>
                setSalary(e.target.value ? Number(e.target.value) : "")
              }
              className={`p-2 border rounded ${focusRing}`}
              placeholder="7000"
              min={0}
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium">
              Desired pension (PLN / month)
            </span>
            <input
              type="number"
              value={desired as any}
              onChange={(e) =>
                setDesired(e.target.value ? Number(e.target.value) : "")
              }
              className={`p-2 border rounded ${focusRing}`}
              placeholder="4500"
              min={0}
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium">Postal code (optional)</span>
            <input
              value={postal}
              onChange={(e) => setPostal(e.target.value)}
              className={`p-2 border rounded ${focusRing}`}
              placeholder="00-001"
            />
          </label>

          <div className="flex gap-2 pt-2">
            <button
              className={`px-4 py-2 rounded bg-[#00993F] text-white ${focusRing}`}
              type="submit"
            >
              Save
            </button>
            <button
              type="button"
              className={`px-4 py-2 rounded border ${focusRing}`}
              onClick={() => {
                setName("");
                setBirthYear("");
                setSalary("");
                setDesired("");
                setPostal("");
                save("zus-profile", DEFAULT_PROFILE);
              }}
            >
              Clear
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
