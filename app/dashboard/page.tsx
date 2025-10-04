"use client";
import React, { Suspense } from "react";
export const dynamic = "force-dynamic"; // skip static pre-render for this page

import DashboardInner from "./DashboardInner";

export default function ResultPage() {
  return (
    <Suspense fallback={<div className="p-6">Ładowanie…</div>}>
      <DashboardInner />
    </Suspense>
  );
}
