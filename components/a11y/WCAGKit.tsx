"use client";

import React from "react";
import { useReducedMotion as framerUseReducedMotion } from "framer-motion";

/**
 * WCAGKit — small accessibility helpers (WCAG 2.0 AA)
 *
 * Exports:
 * - <SkipLink />: keyboard users can jump to main content
 * - <VisuallyHidden />: text for screen readers only
 * - usePrefersReducedMotion(): respect OS “reduce motion”
 * - focusRing: Tailwind class string for visible focus outline
 */

/** Skip to main content link (place near top of <body>) */
export function SkipLink({ target = "#main", children = "Skip to main content" }: { target?: string; children?: React.ReactNode }) {
  return (
    <a
      href={target}
      className="
        sr-only
        focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50
        focus:bg-white focus:text-black focus:px-3 focus:py-2
        focus:rounded focus:shadow
      "
    >
      {children}
    </a>
  );
}

/** Render text that is hidden visually but announced by screen readers */
export function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return <span className="sr-only">{children}</span>;
}

/** Respect user OS setting: prefers-reduced-motion */
export function usePrefersReducedMotion() {
  return framerUseReducedMotion();
}

/** Consistent, visible keyboard focus outline (Tailwind) */
export const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3F84D2]";
